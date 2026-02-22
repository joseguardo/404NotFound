"""Webhooks router - handles incoming webhooks from external services."""

import os
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Any, List
from collections import deque

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel

from backend.services.granola_converter import convert_granola_transcript
from backend.services.orchestrator import TranscriptOrchestrator
from backend.database.client import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Environment config
GRANOLA_WEBHOOK_SECRET = os.getenv("GRANOLA_WEBHOOK_SECRET", "change-me-in-production")

# Track processed documents to avoid duplicates (in-memory for simplicity)
processed_documents: set[str] = set()

# Store recent results for frontend retrieval (max 50 results)
MAX_STORED_RESULTS = 50
granola_results: deque = deque(maxlen=MAX_STORED_RESULTS)


# --- Pydantic Models ---


class GranolaMeeting(BaseModel):
    document_id: str
    title: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GranolaWebhookPayload(BaseModel):
    event: str
    timestamp: str
    meeting: GranolaMeeting
    transcript: Any  # Can be dict, list, or string


class WebhookResponse(BaseModel):
    status: str
    message: str
    document_id: Optional[str] = None


class ActionResponse(BaseModel):
    description: str
    people: List[str]
    department: str
    urgency: str
    response_type: str
    depends_on: List[int]
    action_index: int


class ProjectResponse(BaseModel):
    project_id: int
    project_name: str
    actions: List[ActionResponse]
    first_actions: List[ActionResponse]


class GranolaResultResponse(BaseModel):
    document_id: str
    meeting_title: str
    processed_at: str
    success: bool
    error: Optional[str] = None
    execution_time: float
    total_topics: int
    total_projects: int
    total_actions: int
    projects: List[ProjectResponse]


# --- Helper Functions ---


def verify_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    """Verify the webhook signature."""
    expected = hashlib.sha256(f"{secret}:{payload_bytes.decode()}".encode()).hexdigest()
    return signature == expected


def store_granola_result(
    document_id: str,
    meeting_title: str,
    result,
    persistence_results: Optional[List[dict]] = None,
):
    """Store processing result for frontend retrieval."""
    projects_response = []

    if result.linked_projects and persistence_results:
        for linked_project, persist_result in zip(
            result.linked_projects, persistence_results
        ):
            actions = []
            first_actions = []

            for idx, action in enumerate(linked_project.actions):
                action_resp = ActionResponse(
                    description=action.description,
                    people=action.people or [],
                    department=action.department,
                    urgency=action.urgency,
                    response_type=action.response_type,
                    depends_on=action.depends_on,
                    action_index=idx,
                )
                actions.append(action_resp)

                # First-in-sequence actions have no dependencies
                if not action.depends_on:
                    first_actions.append(action_resp)

            projects_response.append(
                ProjectResponse(
                    project_id=persist_result["project_id"],
                    project_name=persist_result["project_name"],
                    actions=actions,
                    first_actions=first_actions,
                )
            )

    stored_result = GranolaResultResponse(
        document_id=document_id,
        meeting_title=meeting_title,
        processed_at=datetime.now(timezone.utc).isoformat(),
        success=result.success,
        error=result.error,
        execution_time=result.execution_time,
        total_topics=result.total_topics,
        total_projects=result.total_projects,
        total_actions=result.total_actions,
        projects=projects_response,
    )

    granola_results.appendleft(stored_result)
    return stored_result


async def process_granola_transcript(
    document_id: str,
    meeting_title: str,
    transcript_data: Any,
    company_id: int,
):
    """Background task to process Granola transcript through the pipeline."""
    try:
        # Get company info
        company = db.get_company(company_id)
        company_name = company.get("company_name", "Unknown") if company else "Unknown"

        # Convert transcript to plain text
        transcript_text = convert_granola_transcript(transcript_data)

        if not transcript_text or len(transcript_text.strip()) < 50:
            logger.warning(
                f"Transcript '{meeting_title}' too short to process ({len(transcript_text)} chars)"
            )
            return

        logger.info(
            f"Processing Granola transcript '{meeting_title}' ({len(transcript_text)} chars)"
        )

        # Process through orchestrator
        orchestrator = TranscriptOrchestrator(company_name, company_id)
        result = orchestrator.process_text(transcript_text)

        # Store result for frontend retrieval
        store_granola_result(
            document_id=document_id,
            meeting_title=meeting_title,
            result=result,
            persistence_results=result.persistence_results,
        )

        if result.success:
            logger.info(
                f"Processed Granola transcript '{meeting_title}': "
                f"{result.total_actions} actions extracted in {result.execution_time:.2f}s"
            )
        else:
            logger.error(f"Failed to process '{meeting_title}': {result.error}")

    except Exception as e:
        logger.error(f"Error processing transcript '{meeting_title}': {e}", exc_info=True)


# --- Endpoints ---


@router.post("/granola", response_model=WebhookResponse)
async def granola_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    company_id: int = 1,
):
    """
    Receive transcript webhook from Granola watcher.

    The watcher monitors Granola's local cache file and sends new transcripts
    to this endpoint for processing through the action extraction pipeline.

    Args:
        company_id: Company ID to associate the transcript with (query param)

    Headers:
        X-Granola-Event: Event type (transcript.new)
        X-Granola-Signature: HMAC signature for verification

    Body:
        {
            "event": "transcript.new",
            "timestamp": "2024-01-15T10:30:00Z",
            "meeting": {
                "document_id": "abc123",
                "title": "Weekly Standup",
                "created_at": "...",
                "updated_at": "..."
            },
            "transcript": { ... }
        }
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify signature (optional in development)
    signature = request.headers.get("X-Granola-Signature", "")
    if GRANOLA_WEBHOOK_SECRET != "change-me-in-production":
        if not verify_signature(body, signature, GRANOLA_WEBHOOK_SECRET):
            raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        payload = GranolaWebhookPayload.model_validate_json(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    # Check event type
    if payload.event != "transcript.new":
        return WebhookResponse(
            status="ignored",
            message=f"Ignoring event type: {payload.event}",
            document_id=payload.meeting.document_id,
        )

    # Check idempotency
    doc_id = payload.meeting.document_id
    if doc_id in processed_documents:
        return WebhookResponse(
            status="duplicate",
            message="Transcript already processed",
            document_id=doc_id,
        )

    # Mark as processed
    processed_documents.add(doc_id)

    # Queue background processing
    background_tasks.add_task(
        process_granola_transcript,
        document_id=doc_id,
        meeting_title=payload.meeting.title,
        transcript_data=payload.transcript,
        company_id=company_id,
    )

    logger.info(f"Received Granola transcript: '{payload.meeting.title}' (id={doc_id})")

    return WebhookResponse(
        status="accepted",
        message="Transcript queued for processing",
        document_id=doc_id,
    )


@router.get("/granola/results", response_model=List[GranolaResultResponse])
async def get_granola_results(limit: int = 10, since: Optional[str] = None):
    """
    Get recent Granola processing results.

    Args:
        limit: Maximum number of results to return (default 10, max 50)
        since: Only return results processed after this ISO timestamp

    Returns:
        List of processing results, newest first
    """
    limit = min(limit, MAX_STORED_RESULTS)
    results = list(granola_results)[:limit]

    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            results = [
                r for r in results
                if datetime.fromisoformat(r.processed_at.replace("Z", "+00:00")) > since_dt
            ]
        except ValueError:
            pass  # Invalid timestamp, ignore filter

    return results


@router.get("/granola/results/{document_id}", response_model=GranolaResultResponse)
async def get_granola_result(document_id: str):
    """Get a specific Granola processing result by document ID."""
    for result in granola_results:
        if result.document_id == document_id:
            return result
    raise HTTPException(status_code=404, detail="Result not found")


@router.get("/granola/health")
async def granola_health():
    """Health check for Granola webhook endpoint."""
    return {
        "status": "ok",
        "processed_count": len(processed_documents),
        "stored_results": len(granola_results),
    }
