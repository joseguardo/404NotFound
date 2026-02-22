from pydantic import BaseModel
from dataclasses import dataclass
from typing import Optional, List, Literal
from datetime import datetime


# ─── Type Definitions ───────────────────────────────────────────────────────────

UrgencyLevel = Literal["VERY HIGH", "HIGH", "MEDIUM", "LOW"]
ResponseType = Literal["both", "call", "email", "none"]


# ─── Request Models ──────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    company_name: str


class PersonCreate(BaseModel):
    name: str
    surname: Optional[str] = ""
    department: str
    role: str
    tasks: list[str] = []
    is_head: bool = False


class DepartmentInput(BaseModel):
    name: str
    head: str  # Label like "CTO", "CEO"
    people: list[PersonCreate] = []


class StructureInput(BaseModel):
    departments: list[DepartmentInput]


# ─── Response Models ─────────────────────────────────────────────────────────

class PersonResponse(BaseModel):
    id: int
    name: str
    surname: Optional[str] = ""
    department: Optional[str] = None
    role: str = ""
    tasks: list[str] = []
    is_head: bool = False
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyResponse(BaseModel):
    id: int
    company_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepartmentResponse(BaseModel):
    name: str
    head: str
    color_idx: int
    people: list[PersonResponse]


class StructureResponse(BaseModel):
    company: CompanyResponse
    departments: list[DepartmentResponse]


# ─── Update Models ───────────────────────────────────────────────────────────

class PersonUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    tasks: Optional[list[str]] = None
    is_head: Optional[bool] = None


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None


# ─── Text Extraction Models ─────────────────────────────────────────────────


class ExtractionError(Exception):
    """Raised when text extraction fails."""

    pass


class UnsupportedFormatError(Exception):
    """Raised when file format is not supported."""

    pass


@dataclass
class ExtractedText:
    """Result of text extraction from a document."""

    content: str
    source_file: str
    file_type: str
    page_count: Optional[int]
    word_count: int
    extraction_time: float

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "content": self.content,
            "source_file": self.source_file,
            "file_type": self.file_type,
            "page_count": self.page_count,
            "word_count": self.word_count,
            "extraction_time": self.extraction_time,
        }


# ─── Topic Identification Models ───────────────────────────────────────────────


class Topic(BaseModel):
    """A single identified topic/project from a transcript."""

    topic_name: str
    topic_information: str


class TopicList(BaseModel):
    """Collection of topics identified from a transcript."""

    topics: List[Topic]


# ─── Project Matching Models ───────────────────────────────────────────────────


class ExistingProject(BaseModel):
    """Represents a project from the database."""

    id: int
    name: str


class ProjectMatchDecision(BaseModel):
    """LLM output for matching decision."""

    is_existing_project: bool
    matched_project_name: Optional[str] = None
    confidence: float


class ResolvedTopic(BaseModel):
    """Final output: topic with resolved project name."""

    project_name: str
    topic_information: str
    is_new_project: bool


# ─── Action Extraction Models ──────────────────────────────────────────────────


class Action(BaseModel):
    """A single granular action extracted from project info."""

    description: str
    people: Optional[List[str]] = None
    department: str  # Required - LLM must always assign a department
    urgency: UrgencyLevel  # Required - LLM must assess urgency


class ActionList(BaseModel):
    """LLM output: list of extracted actions."""

    actions: List[Action]


class Project(BaseModel):
    """Final project with extracted actions."""

    name: str
    actions: List[Action]


# ─── Dependency Linking Models ─────────────────────────────────────────────────

DependencyReason = Literal[
    "explicit_prerequisite",  # "after", "once", "until", "needs", "requires"
    "information_handoff",    # One action produces info needed by another
    "approval_gate",          # Requires sign-off before proceeding
    "resource_dependency",    # Shares resource/vendor
    "logical_sequence",       # Logically must come first
]


class DependencyEdge(BaseModel):
    """LLM output: a dependency edge between actions."""

    from_idx: int  # Index of prerequisite action
    to_idx: int    # Index of blocked action
    reason: DependencyReason
    confidence: float  # 0.0 to 1.0
    evidence: str      # Quote from action descriptions


class DependencyResult(BaseModel):
    """LLM output: all edges for a project."""

    edges: List[DependencyEdge]


class LinkedAction(BaseModel):
    """Action with dependency information."""

    description: str
    people: Optional[List[str]] = None
    department: str
    urgency: UrgencyLevel
    depends_on: List[int] = []  # Indices of prerequisite actions
    response_type: ResponseType  # Derived from urgency level


class LinkedProject(BaseModel):
    """Project with linked actions."""

    name: str
    actions: List[LinkedAction]
