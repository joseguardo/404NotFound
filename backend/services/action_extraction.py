"""
Action Extraction Module - Extracts granular actions from project information.

This module uses an LLM to extract actionable tasks from project topic information
and intelligently assigns people/departments based on context.

# ─────────────────────────────────────────────────────────────────────────────
# ActionExtractor - Input/Output Data Structures
# ─────────────────────────────────────────────────────────────────────────────
#
# INPUT:
#   ResolvedTopic (from identify_existing_project.py)
#   ├── project_name: str        # Name of the project (existing or new)
#   ├── topic_information: str   # Full text about the topic from transcript
#   └── is_new_project: bool     # Whether this creates a new project
#
#   company_name: str            # Used to fetch People from Supabase
#
# OUTPUT:
#   Project
#   ├── name: str                # Inherited from ResolvedTopic.project_name
#   └── actions: List[Action]
#       └── Action
#           ├── description: str                    # Task description
#           ├── people: Optional[List[str]]         # Assigned people names
#           ├── department: str                     # Required department
#           └── urgency: Literal["VERY HIGH", "HIGH", "MEDIUM", "LOW"]
#
# FLOW:
#   ResolvedTopic + company_name
#       │
#       ▼
#   Fetch People by Department from Supabase
#       │
#       ▼
#   Create Dynamic Pydantic Model with Literal constraints
#   (departments and people names as enums)
#       │
#       ▼
#   LLM extracts actions with constrained output
#       │
#       ▼
#   Project with List[Action]
#
# ─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, create_model
from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend.database.client import db
from backend.database.models import (
    ResolvedTopic,
    Action,
    Project,
)
from backend.database.prompts import (
    ACTION_EXTRACTION_SYSTEM_PROMPT,
    get_action_extraction_user_prompt,
)


def create_dynamic_action_model(
    valid_departments: list[str], valid_people: list[str]
) -> tuple[type[BaseModel], type[BaseModel]]:
    """
    Dynamically create Action and ActionList models with Literal constraints.

    Args:
        valid_departments: List of valid department names
        valid_people: List of valid people names

    Returns:
        Tuple of (DynamicAction, DynamicActionList) model classes
    """
    # Create Literal types from the valid values
    # Need at least one value for Literal, so we add a placeholder if empty
    if valid_departments:
        DeptLiteral = Literal[tuple(valid_departments)]
    else:
        DeptLiteral = str

    if valid_people:
        PeopleLiteral = Literal[tuple(valid_people)]
    else:
        PeopleLiteral = str

    # Urgency is a fixed Literal (not dynamic)
    UrgencyLiteral = Literal["VERY HIGH", "HIGH", "MEDIUM", "LOW"]

    # Create dynamic Action model with constrained fields
    # department and urgency are required, people is optional
    DynamicAction = create_model(
        "Action",
        description=(str, ...),
        people=(Optional[List[PeopleLiteral]], None),
        department=(DeptLiteral, ...),
        urgency=(UrgencyLiteral, ...),
    )

    # Create dynamic ActionList model
    DynamicActionList = create_model(
        "ActionList",
        actions=(List[DynamicAction], ...),
    )

    return DynamicAction, DynamicActionList


class ActionExtractor:
    """
    Extracts granular actions from project information.

    Uses an LLM to identify specific tasks and assign them to people
    or departments based on context from the meeting transcript.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """
        Initialize the ActionExtractor.

        Args:
            api_key: OpenAI API key. Defaults to OPENAI_API_KEY from config.
            model: OpenAI model to use. Defaults to gpt-4o-mini.
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in .env")

        self.model = model
        self.client = OpenAI(api_key=self.api_key)

    def get_people_by_department(self, company_name: str) -> dict[str, list[str]]:
        """
        Fetch people grouped by department.

        Args:
            company_name: Name of the company

        Returns:
            Dictionary mapping department names to lists of people names
        """
        people = db.get_people(company_name)

        grouped: dict[str, list[str]] = {}
        for person in people:
            dept = person.get("department", "Unassigned")
            name = person.get("name", "")
            if name:
                if dept not in grouped:
                    grouped[dept] = []
                grouped[dept].append(name)

        return grouped

    def get_valid_names(self, people_by_department: dict[str, list[str]]) -> list[str]:
        """Get flat list of all valid people names."""
        return [name for names in people_by_department.values() for name in names]

    def get_valid_departments(self, people_by_department: dict[str, list[str]]) -> list[str]:
        """Get list of all valid department names."""
        return list(people_by_department.keys())

    def extract_actions(
        self, resolved_topic: ResolvedTopic, company_name: str
    ) -> Project:
        """
        Extract actions from a resolved topic.

        Args:
            resolved_topic: The resolved topic with project name and info
            company_name: Name of the company for fetching people

        Returns:
            Project with name and list of actions
        """
        # Fetch people grouped by department
        people_by_dept = self.get_people_by_department(company_name)
        valid_names = self.get_valid_names(people_by_dept)
        valid_departments = self.get_valid_departments(people_by_dept)

        # Create dynamic model with Literal constraints
        _, DynamicActionList = create_dynamic_action_model(
            valid_departments, valid_names
        )

        # Call LLM to extract actions with constrained model
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": ACTION_EXTRACTION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": get_action_extraction_user_prompt(
                        resolved_topic.project_name,
                        resolved_topic.topic_information,
                        people_by_dept,
                    ),
                },
            ],
            response_format=DynamicActionList,
        )

        action_list = response.choices[0].message.parsed

        # Convert dynamic actions to standard Action model
        actions = [
            Action(
                description=a.description,
                people=a.people,
                department=a.department,
                urgency=a.urgency,
            )
            for a in action_list.actions
        ]

        return Project(name=resolved_topic.project_name, actions=actions)

    def process_all_topics(
        self, resolved_topics: List[ResolvedTopic], company_name: str
    ) -> List[Project]:
        """
        Process all resolved topics into projects with actions.

        Args:
            resolved_topics: List of resolved topics
            company_name: Name of the company

        Returns:
            List of projects with extracted actions
        """
        projects = []
        for topic in resolved_topics:
            project = self.extract_actions(topic, company_name)
            projects.append(project)
        return projects


# Convenience function
def extract_actions(
    resolved_topic: ResolvedTopic, company_name: str
) -> Project:
    """Convenience function using default extractor."""
    extractor = ActionExtractor()
    return extractor.extract_actions(resolved_topic, company_name)


if __name__ == "__main__":
    from pathlib import Path
    from backend.services.project_identification import ProjectIdentification
    from backend.services.identify_existing_project import ProjectMatcher

    # Test with mock transcript
    test_file = Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"
    company_name = "TestCompany"  # Change this to match your test company

    print(f"Step 1: Identifying topics from {test_file.name}...\n")

    # Step 1: Identify topics
    identifier = ProjectIdentification()
    topics = identifier.identify_topics_from_file(str(test_file))
    print(f"Found {len(topics.topics)} topic(s)")

    print("\n" + "-" * 50)
    print("Step 2: Matching against existing projects...\n")

    # Step 2: Resolve against existing projects
    matcher = ProjectMatcher()
    resolved = matcher.resolve_topics(topics)
    print(f"Resolved {len(resolved)} topic(s)")

    print("\n" + "-" * 50)
    print("Step 3: Extracting actions...\n")

    # Step 3: Extract actions
    extractor = ActionExtractor()
    projects = extractor.process_all_topics(resolved, company_name)

    for project in projects:
        print(f"\nProject: {project.name}")
        print(f"Actions ({len(project.actions)}):")
        for i, action in enumerate(project.actions, 1):
            print(f"  {i}. [{action.urgency}] {action.description}")
            print(f"     -> Department: {action.department}")
            if action.people:
                print(f"     -> People: {', '.join(action.people)}")
