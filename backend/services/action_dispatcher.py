"""
Action Dispatcher - Stage 7 of the transcript processing pipeline.

This module dispatches communications (email/call/Linear tickets) for the first
action of each project.

# -----------------------------------------------------------------------------
# ActionDispatcher - Pipeline Flow
# -----------------------------------------------------------------------------
#
# INPUT:
#   linked_projects: List[LinkedProject]    # From Stage 5/6
#
# DISPATCH LOGIC:
#   For each first action (no dependencies):
#     1. ALWAYS create a Linear ticket (regardless of urgency)
#     2. Route email/call based on urgency:
#        - VERY HIGH → Email + Call (both)
#        - HIGH      → Call only
#        - MEDIUM    → Email only
#        - LOW       → None (no communication)
#
# CALL BUFFERING:
#   - All calls are queued during routing
#   - After routing completes, calls are executed sequentially
#   - Each call waits before the next to avoid overlapping
#
# OUTPUT:
#   DispatchResult
#       tickets_created: int
#       emails_sent: int
#       calls_made: int
#       ticket_results: List[TicketResult]
#       call_results: List[CallResult]
#       email_results: List[EmailResult]
#
# -----------------------------------------------------------------------------
"""

import asyncio
import os
import time
import logging
from typing import List, Optional
from dataclasses import dataclass, field
import requests

from backend.database.models import LinkedProject, LinkedAction
from backend.services.email_service.client import email_client
from backend.mcp_clients.linear import LinearMCP

logger = logging.getLogger(__name__)


@dataclass
class TicketResult:
    """Result of a Linear ticket creation attempt."""

    project_name: str
    action_description: str
    ticket_id: Optional[str] = None
    ticket_url: Optional[str] = None
    status: str = "pending"  # "created", "failed", "skipped"
    error: Optional[str] = None


@dataclass
class CallResult:
    """Result of a single call attempt."""

    project_name: str
    action_description: str
    call_sid: Optional[str] = None
    status: str = "pending"
    error: Optional[str] = None


@dataclass
class EmailResult:
    """Result of a single email attempt."""

    project_name: str
    action_description: str
    email_id: Optional[str] = None
    status: str = "pending"
    error: Optional[str] = None


@dataclass
class DispatchResult:
    """Aggregated result of all dispatched communications."""

    tickets_created: int = 0
    emails_sent: int = 0
    calls_made: int = 0
    ticket_results: List[TicketResult] = field(default_factory=list)
    call_results: List[CallResult] = field(default_factory=list)
    email_results: List[EmailResult] = field(default_factory=list)


class ActionDispatcher:
    """
    Dispatches communications for first actions in each project.

    Calls are buffered and executed sequentially.
    Emails are sent immediately (in sequence, could be parallelized).
    """

    def __init__(
        self,
        phone_number: str = "+34656552042",
        email_address: str = "joseguardomedina@gmail.com",
        api_base_url: str = "http://localhost:8000",
        call_delay_seconds: float = 5.0,
        linear_team_id: str = "Ls2107",
    ):
        """
        Initialize the ActionDispatcher.

        Args:
            phone_number: Default phone number for calls
            email_address: Default email address for notifications
            api_base_url: Base URL for the phone API
            call_delay_seconds: Delay between sequential calls
            linear_team_id: Linear team ID for ticket creation
        """
        self.phone_number = phone_number
        self.email_address = email_address
        self.api_base_url = api_base_url
        self.call_delay_seconds = call_delay_seconds
        self.linear_team_id = linear_team_id
        self.call_queue: List[dict] = []

    # --- Main Entry Point ---

    def dispatch(self, linked_projects: List[LinkedProject]) -> DispatchResult:
        """
        Dispatch communications for all projects.

        For each project, finds the first action (no dependencies) and routes
        it to email/call based on urgency level.

        Args:
            linked_projects: List of projects with linked actions

        Returns:
            DispatchResult with summary of all communications
        """
        result = DispatchResult()

        # Reset call queue
        self.call_queue = []

        # Collect first actions from each project
        first_actions = self._get_first_actions(linked_projects)

        logger.info(f"Dispatching {len(first_actions)} first actions")

        # Route each action by urgency
        for project_name, action in first_actions:
            self._route_action(project_name, action, result)

        # Process buffered calls sequentially
        if self.call_queue:
            logger.info(f"Processing {len(self.call_queue)} buffered calls")
            self._process_call_queue(result)

        logger.info(
            f"Dispatch complete: {result.tickets_created} tickets, "
            f"{result.emails_sent} emails, {result.calls_made} calls"
        )

        return result

    # --- Action Selection ---

    def _get_first_actions(
        self, projects: List[LinkedProject]
    ) -> List[tuple[str, LinkedAction]]:
        """
        Get the first action (no dependencies) from each project.

        Args:
            projects: List of linked projects

        Returns:
            List of (project_name, action) tuples
        """
        first_actions = []

        for project in projects:
            for action in project.actions:
                # First action = no dependencies (depends_on is empty)
                if not action.depends_on:
                    first_actions.append((project.name, action))
                    break  # Only take first action per project

        return first_actions

    # --- Routing ---

    def _route_action(
        self, project_name: str, action: LinkedAction, result: DispatchResult
    ):
        """
        Route action to Linear ticket + email/call based on response_type.

        Always creates a Linear ticket (regardless of urgency), then routes
        email/call based on urgency level.

        Args:
            project_name: Name of the project
            action: The action to dispatch
            result: DispatchResult to update
        """
        response_type = action.response_type

        logger.info(
            f"Routing action [{action.urgency}] for {project_name}: {response_type}"
        )

        # ALWAYS create a Linear ticket (regardless of urgency)
        self._create_linear_ticket(project_name, action, result)

        # Then route email/call based on urgency
        if response_type == "both":  # VERY HIGH urgency
            self._send_email(project_name, action, result)
            self._queue_call(project_name, action)

        elif response_type == "call":  # HIGH urgency
            self._queue_call(project_name, action)

        elif response_type == "email":  # MEDIUM urgency
            self._send_email(project_name, action, result)

        # LOW urgency = "none" - no email/call needed (but ticket still created)

    # --- Email Operations ---

    def _send_email(
        self, project_name: str, action: LinkedAction, result: DispatchResult
    ):
        """
        Send email notification for an action.

        Args:
            project_name: Name of the project
            action: The action to notify about
            result: DispatchResult to update
        """
        email_result = EmailResult(
            project_name=project_name,
            action_description=action.description,
        )

        try:
            subject = f"[{action.urgency}] Action Required: {project_name}"
            html = self._format_email_html(project_name, action)

            response = email_client.send_email(
                to=self.email_address,
                subject=subject,
                html=html,
            )

            email_result.email_id = response.get("id")
            email_result.status = "sent"
            result.emails_sent += 1

            logger.info(f"Email sent for {project_name}: {action.description[:50]}...")

        except Exception as e:
            email_result.status = "failed"
            email_result.error = str(e)
            logger.error(f"Failed to send email for {project_name}: {e}")

        result.email_results.append(email_result)

    def _format_email_html(self, project_name: str, action: LinkedAction) -> str:
        """
        Format the email HTML content.

        Args:
            project_name: Name of the project
            action: The action details

        Returns:
            HTML string for the email body
        """
        people_str = ", ".join(action.people) if action.people else "Unassigned"

        return f"""
        <h2>Action Required: {project_name}</h2>
        <p><strong>Urgency:</strong> {action.urgency}</p>
        <p><strong>Department:</strong> {action.department}</p>
        <p><strong>Assigned to:</strong> {people_str}</p>
        <hr>
        <p><strong>Task:</strong></p>
        <p>{action.description}</p>
        <hr>
        <p style="color: gray; font-size: 12px;">
            This is an automated notification from the Nexus action pipeline.
        </p>
        """

    # --- Linear Ticket Operations ---

    async def _create_linear_ticket_async(
        self, project_name: str, action: LinkedAction
    ) -> TicketResult:
        """
        Create a Linear ticket for an action (async).

        Args:
            project_name: Name of the project
            action: The action to create a ticket for

        Returns:
            TicketResult with creation status
        """
        ticket_result = TicketResult(
            project_name=project_name,
            action_description=action.description,
        )

        try:
            # Check if LINEAR_API_KEY is configured
            if "LINEAR_API_KEY" not in os.environ:
                ticket_result.status = "skipped"
                ticket_result.error = "LINEAR_API_KEY not configured"
                return ticket_result

            async with LinearMCP() as linear:
                # Map urgency to Linear priority
                priority_map = {
                    "VERY HIGH": 1,  # Urgent
                    "HIGH": 2,       # High
                    "MEDIUM": 3,     # Medium
                    "LOW": 4,        # Low
                }
                priority = priority_map.get(action.urgency, 3)

                people_str = ", ".join(action.people) if action.people else "Unassigned"

                # Truncate title to fit Linear's limits
                title = f"[{project_name}] {action.description[:80]}"
                if len(action.description) > 80:
                    title += "..."

                description = f"""## Action Details

**Project:** {project_name}
**Urgency:** {action.urgency}
**Department:** {action.department}
**Assigned to:** {people_str}

---

### Task Description

{action.description}

---

*Created automatically by Nexus Action Pipeline*
"""

                result = await linear.create_issue(
                    team=self.linear_team_id,
                    title=title,
                    description=description,
                    priority=priority,
                )

                # Extract ticket info from result
                # MCP returns result in a specific format
                if hasattr(result, "content"):
                    # Handle MCP response format
                    content = result.content
                    if content and len(content) > 0:
                        ticket_result.ticket_id = "created"
                        ticket_result.status = "created"
                else:
                    ticket_result.ticket_id = str(result)
                    ticket_result.status = "created"

        except KeyError as e:
            ticket_result.status = "skipped"
            ticket_result.error = f"Missing environment variable: {e}"

        except Exception as e:
            ticket_result.status = "failed"
            ticket_result.error = str(e)

        return ticket_result

    def _create_linear_ticket(
        self, project_name: str, action: LinkedAction, result: DispatchResult
    ):
        """
        Sync wrapper for Linear ticket creation.

        Args:
            project_name: Name of the project
            action: The action to create a ticket for
            result: DispatchResult to update
        """
        try:
            ticket_result = asyncio.run(
                self._create_linear_ticket_async(project_name, action)
            )
        except RuntimeError as e:
            # Already in an event loop - cannot use asyncio.run
            if "cannot be called from a running event loop" in str(e):
                ticket_result = TicketResult(
                    project_name=project_name,
                    action_description=action.description,
                    status="skipped",
                    error="Cannot create ticket from async context",
                )
            else:
                raise

        if ticket_result.status == "created":
            result.tickets_created += 1
            logger.info(
                f"Linear ticket created for {project_name}: {ticket_result.ticket_id}"
            )
        elif ticket_result.status == "skipped":
            logger.warning(
                f"Linear ticket skipped for {project_name}: {ticket_result.error}"
            )
        else:
            logger.error(
                f"Linear ticket failed for {project_name}: {ticket_result.error}"
            )

        result.ticket_results.append(ticket_result)

    # --- Call Operations ---

    def _queue_call(self, project_name: str, action: LinkedAction):
        """
        Add call to the buffer queue.

        Args:
            project_name: Name of the project
            action: The action to call about
        """
        self.call_queue.append(
            {
                "project_name": project_name,
                "action": action,
            }
        )
        logger.info(f"Call queued for {project_name}")

    def _process_call_queue(self, result: DispatchResult):
        """
        Process buffered calls sequentially.

        DEMO MODE: Only executes the first call, skips the rest.

        Args:
            result: DispatchResult to update
        """
        # DEMO: Only process first call, skip the rest
        max_calls = 1

        for i, call_item in enumerate(self.call_queue):
            # DEMO: Skip calls after the first one
            if i >= max_calls:
                call_result = CallResult(
                    project_name=call_item["project_name"],
                    action_description=call_item["action"].description,
                    status="skipped",
                    error="Demo mode: only 1 call executed",
                )
                result.call_results.append(call_result)
                logger.info(f"Call skipped (demo mode) for {call_item['project_name']}")
                continue
            project_name = call_item["project_name"]
            action = call_item["action"]

            call_result = CallResult(
                project_name=project_name,
                action_description=action.description,
            )

            try:
                people_str = ", ".join(action.people) if action.people else "the team"

                response = requests.post(
                    f"{self.api_base_url}/api/phone/call",
                    json={
                        "phone_number": self.phone_number,
                        "callee_name": people_str,
                        "agent_name": "Nexus Assistant",
                        "organization": "Nexus",
                        "action": f"Notify about urgent action for {project_name}: {action.description}",
                        "context": f"""
Project: {project_name}
Urgency: {action.urgency}
Department: {action.department}
Task: {action.description}
Assigned to: {people_str}
""",
                    },
                    timeout=30,
                )
                response.raise_for_status()

                data = response.json()
                call_result.call_sid = data.get("call_sid")
                call_result.status = "initiated"
                result.calls_made += 1

                logger.info(
                    f"Call initiated for {project_name}: {action.description[:50]}..."
                )

                # Wait before next call (except for the last one)
                if i < len(self.call_queue) - 1:
                    logger.info(
                        f"Waiting {self.call_delay_seconds}s before next call..."
                    )
                    time.sleep(self.call_delay_seconds)

            except requests.exceptions.ConnectionError:
                call_result.status = "failed"
                call_result.error = "Cannot connect to phone API"
                logger.error(f"Failed to connect to phone API for {project_name}")

            except requests.exceptions.Timeout:
                call_result.status = "failed"
                call_result.error = "Phone API request timed out"
                logger.error(f"Phone API timeout for {project_name}")

            except Exception as e:
                call_result.status = "failed"
                call_result.error = str(e)
                logger.error(f"Failed to initiate call for {project_name}: {e}")

            result.call_results.append(call_result)

        # Clear the queue
        self.call_queue = []


# --- Convenience Functions ---


def dispatch_actions(
    linked_projects: List[LinkedProject],
    phone_number: str = "+34656552042",
    email_address: str = "joseguardomedina@gmail.com",
) -> DispatchResult:
    """
    Convenience function to dispatch actions.

    Args:
        linked_projects: List of projects with linked actions
        phone_number: Phone number for calls
        email_address: Email address for notifications

    Returns:
        DispatchResult with summary of all communications
    """
    dispatcher = ActionDispatcher(
        phone_number=phone_number,
        email_address=email_address,
    )
    return dispatcher.dispatch(linked_projects)


if __name__ == "__main__":
    # Test with mock data
    from backend.database.models import LinkedAction

    print("=" * 60)
    print("ACTION DISPATCHER TEST")
    print("=" * 60)
    print()

    # Create mock linked projects
    mock_projects = [
        LinkedProject(
            name="Website Redesign",
            actions=[
                LinkedAction(
                    description="Create wireframes for new homepage",
                    people=["Alice", "Bob"],
                    department="Design",
                    urgency="VERY HIGH",
                    depends_on=[],
                    response_type="both",
                ),
                LinkedAction(
                    description="Review wireframes with stakeholders",
                    people=["CEO"],
                    department="Executive",
                    urgency="HIGH",
                    depends_on=[0],
                    response_type="call",
                ),
            ],
        ),
        LinkedProject(
            name="API Integration",
            actions=[
                LinkedAction(
                    description="Set up API credentials",
                    people=["DevOps"],
                    department="Engineering",
                    urgency="HIGH",
                    depends_on=[],
                    response_type="call",
                ),
            ],
        ),
        LinkedProject(
            name="Documentation Update",
            actions=[
                LinkedAction(
                    description="Update README with new features",
                    people=["Tech Writer"],
                    department="Engineering",
                    urgency="LOW",
                    depends_on=[],
                    response_type="none",
                ),
            ],
        ),
    ]

    print("Mock Projects:")
    for project in mock_projects:
        print(f"  {project.name}:")
        for i, action in enumerate(project.actions):
            deps = f" (depends on {action.depends_on})" if action.depends_on else ""
            print(f"    [{i}] [{action.urgency}] {action.description}{deps}")
    print()

    print("-" * 60)
    print("Dispatching actions...")
    print("-" * 60)
    print()

    # Run dispatcher
    dispatcher = ActionDispatcher()
    result = dispatcher.dispatch(mock_projects)

    print()
    print("-" * 60)
    print("DISPATCH RESULTS")
    print("-" * 60)
    print()
    print(f"Tickets created: {result.tickets_created}")
    print(f"Emails sent: {result.emails_sent}")
    print(f"Calls made: {result.calls_made}")
    print()

    if result.ticket_results:
        print("Ticket Results:")
        for tr in result.ticket_results:
            print(f"  {tr.project_name}: {tr.status}")
            if tr.ticket_id:
                print(f"    Ticket ID: {tr.ticket_id}")
            if tr.error:
                print(f"    Error: {tr.error}")
        print()

    if result.email_results:
        print("Email Results:")
        for er in result.email_results:
            print(f"  {er.project_name}: {er.status}")
            if er.error:
                print(f"    Error: {er.error}")
        print()

    if result.call_results:
        print("Call Results:")
        for cr in result.call_results:
            print(f"  {cr.project_name}: {cr.status}")
            if cr.call_sid:
                print(f"    Call SID: {cr.call_sid}")
            if cr.error:
                print(f"    Error: {cr.error}")
        print()

    print("=" * 60)
