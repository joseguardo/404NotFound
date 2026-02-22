"""
Action Sequence Module - Links dependencies between actions within projects.

This module uses an LLM to identify blocking dependencies between actions
and creates a DAG (Directed Acyclic Graph) structure for action sequencing.

# -----------------------------------------------------------------------------
# ActionSequencer - Input/Output Data Structures
# -----------------------------------------------------------------------------
#
# INPUT (from action_extraction.py):
#   List[Project]
#       Project
#           name: str
#           actions: List[Action]
#               Action
#                   description: str
#                   people: Optional[List[str]]
#                   department: str
#                   urgency: UrgencyLevel
#
# OUTPUT:
#   List[LinkedProject]
#       LinkedProject
#           name: str
#           actions: List[LinkedAction]
#               LinkedAction
#                   description: str
#                   people: Optional[List[str]]
#                   department: str
#                   urgency: UrgencyLevel
#                   depends_on: List[int]  # Indices of prerequisite actions
#                   response_type: ResponseType  # Derived from urgency:
#                       VERY HIGH -> "both"
#                       HIGH -> "call"
#                       MEDIUM -> "email"
#                       LOW -> "none"
#
# FLOW:
#   List[Project]
#       |
#       v
#   For each project:
#       |
#       +-- Format actions with indices
#       |
#       +-- LLM identifies dependency edges
#       |
#       +-- Validate DAG (no cycles)
#       |
#       +-- Break cycles if needed (remove lowest confidence edges)
#       |
#       +-- Build depends_on lists from edges
#       |
#       v
#   List[LinkedProject]
#
# -----------------------------------------------------------------------------
"""

from typing import Optional, List
from collections import defaultdict
from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend.database.models import (
    Project,
    LinkedProject,
    LinkedAction,
    DependencyEdge,
    DependencyResult,
)
from backend.database.prompts import (
    DEPENDENCY_LINKING_SYSTEM_PROMPT,
    get_dependency_linking_user_prompt,
)


def urgency_to_response_type(urgency: str) -> str:
    """
    Map urgency level to response type.

    Args:
        urgency: UrgencyLevel value

    Returns:
        ResponseType value based on urgency
    """
    mapping = {
        "VERY HIGH": "both",
        "HIGH": "call",
        "MEDIUM": "email",
        "LOW": "none",
    }
    return mapping.get(urgency, "none")


class ActionSequencer:
    """
    Links dependencies between actions within projects.

    Uses an LLM to identify blocking dependencies and ensures
    the resulting graph is a valid DAG (no cycles).
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """
        Initialize the ActionSequencer.

        Args:
            api_key: OpenAI API key. Defaults to OPENAI_API_KEY from config.
            model: OpenAI model to use. Defaults to gpt-4o-mini.
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in .env")

        self.model = model
        self.client = OpenAI(api_key=self.api_key)

    def link_project(self, project: Project) -> LinkedProject:
        """
        Link dependencies for a single project.

        Args:
            project: Project with actions to link

        Returns:
            LinkedProject with depends_on fields populated
        """
        n = len(project.actions)

        # If 0 or 1 actions, no dependencies possible
        if n <= 1:
            return LinkedProject(
                name=project.name,
                actions=[
                    LinkedAction(
                        description=a.description,
                        people=a.people,
                        department=a.department,
                        urgency=a.urgency,
                        depends_on=[],
                        response_type=urgency_to_response_type(a.urgency),
                    )
                    for a in project.actions
                ],
            )

        # Format actions for LLM
        actions_data = [
            {
                "description": a.description,
                "department": a.department,
                "urgency": a.urgency,
                "people": a.people,
            }
            for a in project.actions
        ]

        # Call LLM to get dependency edges
        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": DEPENDENCY_LINKING_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": get_dependency_linking_user_prompt(
                        project.name, actions_data
                    ),
                },
            ],
            response_format=DependencyResult,
        )

        dependency_result = response.choices[0].message.parsed
        edges = dependency_result.edges

        # Filter invalid edges (out of bounds)
        valid_edges = [
            e for e in edges if 0 <= e.from_idx < n and 0 <= e.to_idx < n
        ]

        # Check for cycles and break if needed
        if self._has_cycle(n, [(e.from_idx, e.to_idx) for e in valid_edges]):
            valid_edges = self._break_cycles(n, valid_edges)

        # Build depends_on lists from edges
        depends_on_map: dict[int, list[int]] = defaultdict(list)
        for edge in valid_edges:
            depends_on_map[edge.to_idx].append(edge.from_idx)

        # Create LinkedActions with depends_on and response_type
        linked_actions = [
            LinkedAction(
                description=a.description,
                people=a.people,
                department=a.department,
                urgency=a.urgency,
                depends_on=sorted(depends_on_map.get(i, [])),
                response_type=urgency_to_response_type(a.urgency),
            )
            for i, a in enumerate(project.actions)
        ]

        return LinkedProject(name=project.name, actions=linked_actions)

    def link_all(self, projects: List[Project]) -> List[LinkedProject]:
        """
        Link dependencies for all projects.

        Args:
            projects: List of projects to process

        Returns:
            List of LinkedProjects with dependencies
        """
        return [self.link_project(p) for p in projects]

    # --- DAG Utilities ---

    def _has_cycle(self, n: int, edges: List[tuple[int, int]]) -> bool:
        """
        Check if the graph has a cycle using DFS.

        Args:
            n: Number of nodes (actions)
            edges: List of (from_idx, to_idx) tuples

        Returns:
            True if cycle exists, False otherwise
        """
        # Build adjacency list
        adj: dict[int, list[int]] = defaultdict(list)
        for u, v in edges:
            adj[u].append(v)

        # 0 = unvisited, 1 = in current path, 2 = fully processed
        state = [0] * n

        def dfs(node: int) -> bool:
            if state[node] == 1:  # Back edge - cycle found
                return True
            if state[node] == 2:  # Already processed
                return False

            state[node] = 1  # Mark as in current path

            for neighbor in adj[node]:
                if dfs(neighbor):
                    return True

            state[node] = 2  # Mark as fully processed
            return False

        for i in range(n):
            if state[i] == 0:
                if dfs(i):
                    return True

        return False

    def _break_cycles(
        self, n: int, edges: List[DependencyEdge]
    ) -> List[DependencyEdge]:
        """
        Remove edges to break cycles, prioritizing removal of low-confidence edges.

        Args:
            n: Number of nodes (actions)
            edges: List of DependencyEdge objects

        Returns:
            List of edges with cycles broken
        """
        # Sort by confidence ascending (remove lowest confidence first)
        sorted_edges = sorted(edges, key=lambda e: e.confidence)

        result = []
        for edge in sorted_edges:
            # Try adding this edge
            test_edges = [(e.from_idx, e.to_idx) for e in result] + [
                (edge.from_idx, edge.to_idx)
            ]

            if not self._has_cycle(n, test_edges):
                result.append(edge)
            # Otherwise skip this edge (would create cycle)

        return result

    def _topological_sort(self, n: int, edges: List[tuple[int, int]]) -> List[int]:
        """
        Return actions in topological order (dependencies first).

        Args:
            n: Number of nodes (actions)
            edges: List of (from_idx, to_idx) tuples

        Returns:
            List of action indices in topological order
        """
        # Build adjacency list and in-degree count
        adj: dict[int, list[int]] = defaultdict(list)
        in_degree = [0] * n

        for u, v in edges:
            adj[u].append(v)
            in_degree[v] += 1

        # Kahn's algorithm
        queue = [i for i in range(n) if in_degree[i] == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)

            for neighbor in adj[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        return result


# Convenience functions
def link_project(project: Project) -> LinkedProject:
    """Convenience function using default sequencer."""
    sequencer = ActionSequencer()
    return sequencer.link_project(project)


def link_all(projects: List[Project]) -> List[LinkedProject]:
    """Convenience function using default sequencer."""
    sequencer = ActionSequencer()
    return sequencer.link_all(projects)


if __name__ == "__main__":
    from pathlib import Path
    from backend.services.project_identification import ProjectIdentification
    from backend.services.identify_existing_project import ProjectMatcher
    from backend.services.action_extraction import ActionExtractor

    # Test with mock transcript
    test_file = (
        Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"
    )
    company_name = "TestCompany"  # Change this to match your test company

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
        print(f"Actions ({len(project.actions)}):")
        for i, action in enumerate(project.actions):
            print(f"  [{i}] [{action.urgency}] {action.description}")
            print(f"      -> Department: {action.department}")
            if action.people:
                print(f"      -> People: {', '.join(action.people)}")
        print()

    print("-" * 50)
    print("Step 4: Linking dependencies...")
    print()

    # Step 4: Link dependencies
    sequencer = ActionSequencer()
    linked_projects = sequencer.link_all(projects)

    for project in linked_projects:
        print(f"Project: {project.name}")
        print(f"Actions with dependencies ({len(project.actions)}):")
        for i, action in enumerate(project.actions):
            deps = f" -> depends on {action.depends_on}" if action.depends_on else ""
            print(f"  [{i}] [{action.urgency}] {action.description}{deps}")
            print(f"      -> Department: {action.department}")
            print(f"      -> Response Type: {action.response_type}")
            if action.people:
                print(f"      -> People: {', '.join(action.people)}")
        print()
