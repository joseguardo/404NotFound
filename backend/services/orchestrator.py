"""
Transcript Processing Orchestrator - Coordinates the complete pipeline.

This module provides a high-level interface to process meeting transcripts
from raw file to persisted actions in the database.

# -----------------------------------------------------------------------------
# TranscriptOrchestrator - Pipeline Flow
# -----------------------------------------------------------------------------
#
# INPUT:
#   file_path: Path           # Path to transcript file (.txt, .pdf, .docx)
#   company_name: str         # Company name for context
#   company_id: int           # Company ID for database linking
#
# PIPELINE:
#   Stage 1: Extract Text (file -> ExtractedText)
#       |
#       v
#   Stage 2: Identify Topics (text -> TopicList)
#       |
#       v
#   Stage 3: Match Projects (topics -> List[ResolvedTopic])
#       |
#       v
#   Stage 4: Extract Actions (resolved -> List[Project])
#       |
#       v
#   Stage 5: Link Dependencies (projects -> List[LinkedProject])
#       |
#       v
#   Stage 6: Persist to Database (linked -> persistence summary)
#
# OUTPUT:
#   PipelineResult
#       success: bool
#       extracted_text: ExtractedText
#       topics: TopicList
#       resolved_topics: List[ResolvedTopic]
#       projects: List[Project]
#       linked_projects: List[LinkedProject]
#       persistence_results: List[dict]
#       execution_time: float
#       stage_times: dict
#       error: Optional[str]
#
# -----------------------------------------------------------------------------
"""

import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List

from backend.database.models import (
    ExtractedText,
    TopicList,
    ResolvedTopic,
    Project,
    LinkedProject,
)
from backend.services.processing_raw_transkript import TextExtractor
from backend.services.project_identification import ProjectIdentification
from backend.services.identify_existing_project import ProjectMatcher
from backend.services.action_extraction import ActionExtractor
from backend.services.action_sequence import ActionSequencer
from backend.services.persist_actions_supabase import ActionPersister


@dataclass
class PipelineResult:
    """Comprehensive result of pipeline execution."""

    # Status
    success: bool = False
    error: Optional[str] = None

    # Stage outputs (populated as pipeline progresses)
    extracted_text: Optional[ExtractedText] = None
    topics: Optional[TopicList] = None
    resolved_topics: Optional[List[ResolvedTopic]] = None
    projects: Optional[List[Project]] = None
    linked_projects: Optional[List[LinkedProject]] = None
    persistence_results: Optional[List[dict]] = None

    # Metrics
    execution_time: float = 0.0
    stage_times: dict = field(default_factory=dict)

    # Summary properties
    @property
    def total_topics(self) -> int:
        """Total number of topics identified."""
        if self.topics and self.topics.topics:
            return len(self.topics.topics)
        return 0

    @property
    def total_projects(self) -> int:
        """Total number of projects (after matching)."""
        if self.linked_projects:
            return len(self.linked_projects)
        return 0

    @property
    def total_actions(self) -> int:
        """Total number of actions across all projects."""
        if self.linked_projects:
            return sum(len(p.actions) for p in self.linked_projects)
        return 0

    @property
    def new_projects_count(self) -> int:
        """Number of new projects created."""
        if self.resolved_topics:
            return sum(1 for t in self.resolved_topics if t.is_new_project)
        return 0

    @property
    def existing_projects_count(self) -> int:
        """Number of existing projects matched."""
        if self.resolved_topics:
            return sum(1 for t in self.resolved_topics if not t.is_new_project)
        return 0


class TranscriptOrchestrator:
    """
    Orchestrates the complete transcript processing pipeline.

    Coordinates text extraction, topic identification, project matching,
    action extraction, dependency linking, and database persistence.
    """

    def __init__(self, company_name: str, company_id: int):
        """
        Initialize the orchestrator with company context.

        Args:
            company_name: Name of the company (used for people lookup)
            company_id: ID of the company (used for database linking)
        """
        self.company_name = company_name
        self.company_id = company_id

        # Initialize pipeline components
        self.text_extractor = TextExtractor()
        self.topic_identifier = ProjectIdentification()
        self.project_matcher = ProjectMatcher()
        self.action_extractor = ActionExtractor()
        self.action_sequencer = ActionSequencer()
        self.action_persister = ActionPersister()

    # --- Main Entry Points ---

    def process_file(self, file_path: Path) -> PipelineResult:
        """
        Run complete pipeline from file to database.

        Args:
            file_path: Path to the transcript file

        Returns:
            PipelineResult with all stage outputs and metrics
        """
        start_time = time.time()
        result = PipelineResult()

        try:
            # Stage 1: Extract text from file
            stage_start = time.time()
            result.extracted_text = self.extract_text(file_path)
            result.stage_times["extract_text"] = time.time() - stage_start

            # Stage 2: Identify topics from transcript
            stage_start = time.time()
            result.topics = self.identify_topics(result.extracted_text.content)
            result.stage_times["identify_topics"] = time.time() - stage_start

            # Stage 3: Match topics to existing projects
            stage_start = time.time()
            result.resolved_topics = self.match_projects(result.topics)
            result.stage_times["match_projects"] = time.time() - stage_start

            # Stage 4: Extract actions from resolved topics
            stage_start = time.time()
            result.projects = self.extract_actions(result.resolved_topics)
            result.stage_times["extract_actions"] = time.time() - stage_start

            # Stage 5: Link dependencies between actions
            stage_start = time.time()
            result.linked_projects = self.link_dependencies(result.projects)
            result.stage_times["link_dependencies"] = time.time() - stage_start

            # Stage 6: Persist to database
            stage_start = time.time()
            result.persistence_results = self.persist(result.linked_projects)
            result.stage_times["persist"] = time.time() - stage_start

            result.success = True

        except Exception as e:
            result.error = str(e)
            result.success = False

        result.execution_time = time.time() - start_time
        return result

    def process_text(self, transcript: str) -> PipelineResult:
        """
        Run pipeline from raw text (skip file extraction).

        Args:
            transcript: Raw transcript text

        Returns:
            PipelineResult with all stage outputs and metrics
        """
        start_time = time.time()
        result = PipelineResult()

        try:
            # Skip Stage 1, start with topic identification
            stage_start = time.time()
            result.topics = self.identify_topics(transcript)
            result.stage_times["identify_topics"] = time.time() - stage_start

            # Stage 3: Match topics to existing projects
            stage_start = time.time()
            result.resolved_topics = self.match_projects(result.topics)
            result.stage_times["match_projects"] = time.time() - stage_start

            # Stage 4: Extract actions from resolved topics
            stage_start = time.time()
            result.projects = self.extract_actions(result.resolved_topics)
            result.stage_times["extract_actions"] = time.time() - stage_start

            # Stage 5: Link dependencies between actions
            stage_start = time.time()
            result.linked_projects = self.link_dependencies(result.projects)
            result.stage_times["link_dependencies"] = time.time() - stage_start

            # Stage 6: Persist to database
            stage_start = time.time()
            result.persistence_results = self.persist(result.linked_projects)
            result.stage_times["persist"] = time.time() - stage_start

            result.success = True

        except Exception as e:
            result.error = str(e)
            result.success = False

        result.execution_time = time.time() - start_time
        return result

    # --- Individual Stage Methods ---

    def extract_text(self, file_path: Path) -> ExtractedText:
        """
        Stage 1: Extract text from a file.

        Args:
            file_path: Path to the document file

        Returns:
            ExtractedText with content and metadata
        """
        return self.text_extractor.extract(file_path)

    def identify_topics(self, transcript: str) -> TopicList:
        """
        Stage 2: Identify topics from transcript text.

        Args:
            transcript: Raw transcript text

        Returns:
            TopicList with identified topics
        """
        return self.topic_identifier.identify_topics(transcript, self.company_name)

    def match_projects(self, topics: TopicList) -> List[ResolvedTopic]:
        """
        Stage 3: Match topics to existing projects.

        Args:
            topics: TopicList from identification stage

        Returns:
            List of ResolvedTopic with project names
        """
        return self.project_matcher.resolve_topics(topics, self.company_id)

    def extract_actions(self, resolved_topics: List[ResolvedTopic]) -> List[Project]:
        """
        Stage 4: Extract actions from resolved topics.

        Args:
            resolved_topics: List of resolved topics

        Returns:
            List of Projects with actions
        """
        return self.action_extractor.process_all_topics(
            resolved_topics, self.company_name
        )

    def link_dependencies(self, projects: List[Project]) -> List[LinkedProject]:
        """
        Stage 5: Link dependencies between actions.

        Args:
            projects: List of projects with actions

        Returns:
            List of LinkedProjects with dependency information
        """
        return self.action_sequencer.link_all(projects)

    def persist(self, linked_projects: List[LinkedProject]) -> List[dict]:
        """
        Stage 6: Persist linked projects to database.

        Args:
            linked_projects: List of linked projects

        Returns:
            List of persistence summaries
        """
        return self.action_persister.persist_all(linked_projects, self.company_id)


# Convenience function
def process_transcript(
    file_path: Path, company_name: str, company_id: int
) -> PipelineResult:
    """
    One-liner to process a transcript file through the complete pipeline.

    Args:
        file_path: Path to the transcript file
        company_name: Name of the company
        company_id: ID of the company

    Returns:
        PipelineResult with all outputs
    """
    orchestrator = TranscriptOrchestrator(company_name, company_id)
    return orchestrator.process_file(file_path)


if __name__ == "__main__":
    # Test configuration
    test_file = (
        Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"
    )
    company_name = "TestCompany"
    company_id = 1  # Change to your test company ID

    print("=" * 60)
    print("TRANSCRIPT PROCESSING PIPELINE")
    print("=" * 60)
    print()
    print(f"File: {test_file.name}")
    print(f"Company: {company_name} (ID: {company_id})")
    print()

    # Run the pipeline
    orchestrator = TranscriptOrchestrator(company_name, company_id)
    result = orchestrator.process_file(test_file)

    # Print results
    print("-" * 60)
    print("PIPELINE RESULT")
    print("-" * 60)
    print()

    if result.success:
        print("Status: SUCCESS")
        print()

        # Stage 1: Extraction
        if result.extracted_text:
            print(f"Stage 1 - Text Extraction:")
            print(f"  Words: {result.extracted_text.word_count}")
            print(f"  Time: {result.stage_times.get('extract_text', 0):.2f}s")
            print()

        # Stage 2: Topics
        if result.topics:
            print(f"Stage 2 - Topic Identification:")
            print(f"  Topics found: {result.total_topics}")
            for topic in result.topics.topics:
                print(f"    - {topic.topic_name}")
            print(f"  Time: {result.stage_times.get('identify_topics', 0):.2f}s")
            print()

        # Stage 3: Project Matching
        if result.resolved_topics:
            print(f"Stage 3 - Project Matching:")
            print(f"  New projects: {result.new_projects_count}")
            print(f"  Existing projects: {result.existing_projects_count}")
            print(f"  Time: {result.stage_times.get('match_projects', 0):.2f}s")
            print()

        # Stage 4: Action Extraction
        if result.projects:
            print(f"Stage 4 - Action Extraction:")
            for project in result.projects:
                print(f"  {project.name}: {len(project.actions)} actions")
            print(f"  Time: {result.stage_times.get('extract_actions', 0):.2f}s")
            print()

        # Stage 5: Dependency Linking
        if result.linked_projects:
            print(f"Stage 5 - Dependency Linking:")
            print(f"  Total actions: {result.total_actions}")
            print(f"  Time: {result.stage_times.get('link_dependencies', 0):.2f}s")
            print()

        # Stage 6: Persistence
        if result.persistence_results:
            print(f"Stage 6 - Database Persistence:")
            for pr in result.persistence_results:
                print(f"  {pr['project_name']}: {pr['actions_count']} actions (ID: {pr['project_id']})")
            print(f"  Time: {result.stage_times.get('persist', 0):.2f}s")
            print()

        # Summary
        print("-" * 60)
        print("SUMMARY")
        print("-" * 60)
        print(f"  Total execution time: {result.execution_time:.2f}s")
        print(f"  Topics identified: {result.total_topics}")
        print(f"  Projects created/updated: {result.total_projects}")
        print(f"  Actions persisted: {result.total_actions}")

    else:
        print("Status: FAILED")
        print(f"Error: {result.error}")

    print()
    print("=" * 60)
