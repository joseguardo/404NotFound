"""
Project Matching Module - Verifies if topics match existing projects.

This module uses an LLM to determine if topics identified from transcripts
match existing projects in the database, or if they represent new projects.
"""

from typing import Optional, List
from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend.database.client import db
from backend.database.models import (
    Topic,
    TopicList,
    ExistingProject,
    ProjectMatchDecision,
    ResolvedTopic,
)
from backend.database.prompts import (
    PROJECT_MATCHING_SYSTEM_PROMPT,
    get_project_matching_user_prompt,
)


class ProjectMatcher:
    """
    Matches topics from transcripts against existing projects in the database.

    Uses an LLM to intelligently determine if a topic refers to an existing
    project or represents a new project.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """
        Initialize the ProjectMatcher.

        Args:
            api_key: OpenAI API key. Defaults to OPENAI_API_KEY from config.
            model: OpenAI model to use. Defaults to gpt-4o-mini.
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in .env")

        self.model = model
        self.client = OpenAI(api_key=self.api_key)

    def get_alive_projects(self, company_id: Optional[int] = None) -> List[ExistingProject]:
        """
        Fetch all projects where alive=True from Supabase.

        Args:
            company_id: Optional company ID to filter projects (unused until column is added)

        Returns:
            List of ExistingProject objects
        """
        # Note: company_id filtering disabled until the column is added to Projects table
        _ = company_id  # Suppress unused parameter warning

        response = (
            db.client.table("Projects")
            .select("id, name")
            .eq("alive", True)
            .execute()
        )

        return [ExistingProject(**p) for p in response.data]

    def match_topic(
        self, topic: Topic, existing_projects: List[ExistingProject]
    ) -> ResolvedTopic:
        """
        Use LLM to determine if a topic matches an existing project.

        Args:
            topic: The topic to match
            existing_projects: List of existing projects to match against

        Returns:
            ResolvedTopic with the final project name
        """
        # If no existing projects, it's automatically a new project
        if not existing_projects:
            return ResolvedTopic(
                project_name=topic.topic_name,
                topic_information=topic.topic_information,
                is_new_project=True,
            )

        # Build project names list for the prompt
        project_names = [p.name for p in existing_projects]

        # Call LLM for matching decision
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": PROJECT_MATCHING_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": get_project_matching_user_prompt(
                        topic.topic_name, topic.topic_information, project_names
                    ),
                },
            ],
            response_format=ProjectMatchDecision,
        )

        decision = response.choices[0].message.parsed

        # Build resolved topic based on decision
        if decision.is_existing_project and decision.matched_project_name:
            return ResolvedTopic(
                project_name=decision.matched_project_name,
                topic_information=topic.topic_information,
                is_new_project=False,
            )
        else:
            return ResolvedTopic(
                project_name=topic.topic_name,
                topic_information=topic.topic_information,
                is_new_project=True,
            )

    def resolve_topics(
        self, topics: TopicList, company_id: Optional[int] = None
    ) -> List[ResolvedTopic]:
        """
        Resolve all topics against existing projects.

        Args:
            topics: TopicList from ProjectIdentification
            company_id: Optional company ID to filter projects

        Returns:
            List of ResolvedTopic with final project names
        """
        # Fetch existing alive projects
        existing_projects = self.get_alive_projects(company_id)

        print(f"Found {len(existing_projects)} existing project(s)")

        # Match each topic
        resolved = []
        for topic in topics.topics:
            resolved_topic = self.match_topic(topic, existing_projects)
            resolved.append(resolved_topic)

        return resolved


# Convenience function
def resolve_topics(
    topics: TopicList, company_id: Optional[int] = None
) -> List[ResolvedTopic]:
    """Convenience function using default matcher."""
    matcher = ProjectMatcher()
    return matcher.resolve_topics(topics, company_id)


if __name__ == "__main__":
    from pathlib import Path
    from backend.services.project_identification import ProjectIdentification

    # Test with mock transcript
    test_file = Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"

    print(f"Step 1: Identifying topics from {test_file.name}...\n")

    # Step 1: Identify topics
    identifier = ProjectIdentification()
    topics = identifier.identify_topics_from_file(str(test_file))

    print(f"Found {len(topics.topics)} topic(s):\n")
    for i, topic in enumerate(topics.topics, 1):
        print(f"  {i}. {topic.topic_name}")

    print("\n" + "-" * 50)
    print("Step 2: Matching against existing projects...\n")

    # Step 2: Resolve against existing projects
    matcher = ProjectMatcher()
    resolved = matcher.resolve_topics(topics)

    print(f"\nResolved {len(resolved)} topic(s):\n")
    for r in resolved:
        status = "NEW" if r.is_new_project else "EXISTING"
        print(f"[{status}] {r.project_name}")
        print(f"   Info: {r.topic_information[:100]}...\n")
