"""
Action Persistence Module - Saves LinkedProject actions to Supabase.

This module persists the output of the action_sequence.py pipeline to the
Supabase Actions table, linking each action to its parent project.

# -----------------------------------------------------------------------------
# ActionPersister - Input/Output Data Structures
# -----------------------------------------------------------------------------
#
# INPUT (from action_sequence.py):
#   List[LinkedProject]
#       LinkedProject
#           name: str
#           actions: List[LinkedAction]
#               LinkedAction
#                   description: str
#                   people: Optional[List[str]]
#                   department: str
#                   urgency: UrgencyLevel
#                   depends_on: List[int]
#                   response_type: ResponseType
#
#   company_id: int  # Required to link projects to company
#
# OUTPUT:
#   Persisted to Supabase "Actions" table
#   Returns summary: List[dict] with project_id, project_name, actions_count
#
# FLOW:
#   List[LinkedProject] + company_id
#       |
#       v
#   For each LinkedProject:
#       |
#       +-- Get or create project in Projects table
#       |
#       +-- Delete existing actions for this project
#       |
#       +-- Insert all LinkedActions with action_index
#       |
#       v
#   Return persistence summary
#
# -----------------------------------------------------------------------------
"""

import json
from typing import List, Optional

from backend.database.client import db
from backend.database.models import LinkedProject, LinkedAction


class ActionPersister:
    """
    Persists LinkedProject actions to the Supabase Actions table.

    Uses a replace strategy: deletes existing actions before inserting new ones.
    """

    def __init__(self):
        """Initialize the ActionPersister with the Supabase client."""
        self.client = db.client

    # --- Project Operations ---

    def get_or_create_project(self, project_name: str, company_id: int) -> int:
        """
        Get existing project ID or create a new project.

        Args:
            project_name: Name of the project
            company_id: ID of the company (unused until column is added to Projects table)

        Returns:
            The project ID (existing or newly created)
        """
        # Note: company_id not used until the column is added to Projects table
        _ = company_id  # Suppress unused parameter warning

        # First, try to find existing project by name
        response = (
            self.client.table("Projects")
            .select("id")
            .eq("name", project_name)
            .execute()
        )

        if response.data:
            return response.data[0]["id"]

        # Create new project
        response = (
            self.client.table("Projects")
            .insert({
                "name": project_name,
                "alive": True,
            })
            .execute()
        )

        return response.data[0]["id"]

    # --- Action Operations ---

    def delete_project_actions(self, project_id: int) -> bool:
        """
        Delete all actions for a project.

        Args:
            project_id: ID of the project

        Returns:
            True if successful
        """
        self.client.table("Actions").delete().eq("project_id", project_id).execute()
        return True

    def insert_action(
        self, project_id: int, action: LinkedAction, index: int
    ) -> Optional[dict]:
        """
        Insert a single action into the database.

        Args:
            project_id: ID of the parent project
            action: The LinkedAction to insert
            index: The action's position in the project (for depends_on references)

        Returns:
            The inserted row or None
        """
        data = {
            "project_id": project_id,
            "description": action.description,
            "department": action.department,
            "people": json.dumps(action.people) if action.people else json.dumps([]),
            "urgency": action.urgency,
            "depends_on": json.dumps(action.depends_on),
            "response_type": action.response_type,
            "action_index": index,
        }

        response = self.client.table("Actions").insert(data).execute()
        return response.data[0] if response.data else None

    def insert_actions(
        self, project_id: int, actions: List[LinkedAction]
    ) -> List[dict]:
        """
        Insert all actions for a project.

        Args:
            project_id: ID of the parent project
            actions: List of LinkedActions to insert

        Returns:
            List of inserted rows
        """
        inserted = []
        for index, action in enumerate(actions):
            result = self.insert_action(project_id, action, index)
            if result:
                inserted.append(result)
        return inserted

    # --- Main Entry Points ---

    def persist_project(self, project: LinkedProject, company_id: int) -> dict:
        """
        Persist a single LinkedProject with all its actions.

        Args:
            project: The LinkedProject to persist
            company_id: ID of the company

        Returns:
            Summary dict with project_id, project_name, actions_count
        """
        # Get or create project
        project_id = self.get_or_create_project(project.name, company_id)

        # Delete existing actions (replace strategy)
        self.delete_project_actions(project_id)

        # Insert all new actions
        inserted = self.insert_actions(project_id, project.actions)

        return {
            "project_id": project_id,
            "project_name": project.name,
            "actions_count": len(inserted),
        }

    def persist_all(
        self, projects: List[LinkedProject], company_id: int
    ) -> List[dict]:
        """
        Persist all LinkedProjects with their actions.

        Args:
            projects: List of LinkedProjects to persist
            company_id: ID of the company

        Returns:
            List of summary dicts for each project
        """
        results = []
        for project in projects:
            result = self.persist_project(project, company_id)
            results.append(result)
        return results


# Convenience functions
def persist_project(project: LinkedProject, company_id: int) -> dict:
    """Convenience function using default persister."""
    persister = ActionPersister()
    return persister.persist_project(project, company_id)


def persist_all(projects: List[LinkedProject], company_id: int) -> List[dict]:
    """Convenience function using default persister."""
    persister = ActionPersister()
    return persister.persist_all(projects, company_id)


if __name__ == "__main__":
    from pathlib import Path
    from backend.services.project_identification import ProjectIdentification
    from backend.services.identify_existing_project import ProjectMatcher
    from backend.services.action_extraction import ActionExtractor
    from backend.services.action_sequence import ActionSequencer

    # Configuration
    test_file = (
        Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"
    )
    company_name = "TestCompany"
    company_id = 1  # Change this to your test company ID

    print(f"Step 1: Identifying topics from {test_file.name}...")
    print()

    # Step 1: Identify topics
    identifier = ProjectIdentification()
    topics = identifier.identify_topics_from_file(str(test_file))
    print(f"Found {len(topics.topics)} topic(s)")

    print()
    print("-" * 50)
    print("Step 2: Matching against existing projects...")
    print()

    # Step 2: Resolve against existing projects
    matcher = ProjectMatcher()
    resolved = matcher.resolve_topics(topics)
    print(f"Resolved {len(resolved)} topic(s)")

    print()
    print("-" * 50)
    print("Step 3: Extracting actions...")
    print()

    # Step 3: Extract actions
    extractor = ActionExtractor()
    projects = extractor.process_all_topics(resolved, company_name)

    for project in projects:
        print(f"Project: {project.name}")
        print(f"Actions: {len(project.actions)}")
    print()

    print("-" * 50)
    print("Step 4: Linking dependencies...")
    print()

    # Step 4: Link dependencies
    sequencer = ActionSequencer()
    linked_projects = sequencer.link_all(projects)

    for project in linked_projects:
        print(f"Project: {project.name}")
        print(f"Linked actions: {len(project.actions)}")
    print()

    print("-" * 50)
    print("Step 5: Persisting to Supabase...")
    print()

    # Step 5: Persist to database
    persister = ActionPersister()
    results = persister.persist_all(linked_projects, company_id)

    print("Persistence complete!")
    print()
    for result in results:
        print(f"  Project: {result['project_name']}")
        print(f"    ID: {result['project_id']}")
        print(f"    Actions saved: {result['actions_count']}")
    print()
