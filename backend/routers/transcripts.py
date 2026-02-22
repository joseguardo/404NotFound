from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from backend.database.client import db
from backend.services.orchestrator import TranscriptOrchestrator
from typing import List, Optional
from pathlib import Path


# --- Response Models ---

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


class ProcessingResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    execution_time: float
    total_topics: int
    total_projects: int
    total_actions: int
    projects: List[ProjectResponse]

router = APIRouter(prefix="/api/companies", tags=["transcripts"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "transcripts"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".doc", ".docx"}


@router.post("/{company_id}/transcripts")
async def upload_transcripts(company_id: int, files: List[UploadFile] = File(...)):
    """Upload transcript files for a company."""
    # Verify company exists
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Create company-specific directory
    company_dir = UPLOAD_DIR / str(company_id)
    company_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files = []
    for file in files:
        # Validate file extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        # Save file
        file_path = company_dir / file.filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        uploaded_files.append({
            "filename": file.filename,
            "size": len(content),
            "path": str(file_path),
        })

    return {
        "message": f"Successfully uploaded {len(uploaded_files)} file(s)",
        "files": uploaded_files,
    }


@router.get("/{company_id}/transcripts")
def list_transcripts(company_id: int):
    """List all transcripts for a company."""
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company_dir = UPLOAD_DIR / str(company_id)
    if not company_dir.exists():
        return {"transcripts": []}

    transcripts = []
    for file_path in company_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            transcripts.append({
                "filename": file_path.name,
                "size": file_path.stat().st_size,
            })

    return {"transcripts": transcripts}


@router.post("/{company_id}/transcripts/{filename}/process", response_model=ProcessingResponse)
def process_transcript(company_id: int, filename: str):
    """Process a transcript through the complete pipeline."""
    # Verify company exists
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get the file path
    company_dir = UPLOAD_DIR / str(company_id)
    file_path = company_dir / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Transcript '{filename}' not found")

    # Run the orchestrator pipeline
    company_name = company.get("company_name", "Unknown")
    orchestrator = TranscriptOrchestrator(company_name, company_id)
    result = orchestrator.process_file(file_path)

    # Build response
    projects_response = []
    if result.linked_projects and result.persistence_results:
        for linked_project, persist_result in zip(
            result.linked_projects, result.persistence_results
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

    return ProcessingResponse(
        success=result.success,
        error=result.error,
        execution_time=result.execution_time,
        total_topics=result.total_topics,
        total_projects=result.total_projects,
        total_actions=result.total_actions,
        projects=projects_response,
    )
