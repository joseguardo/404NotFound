from fastapi import APIRouter, HTTPException, UploadFile, File
from backend.database.client import db
from typing import List
import os
from pathlib import Path

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
