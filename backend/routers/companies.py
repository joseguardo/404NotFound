from fastapi import APIRouter, HTTPException
from backend.database.client import db
from backend.database.models import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    PersonCreate,
    PersonResponse,
    PersonUpdate,
)
import json

router = APIRouter(prefix="/api/companies", tags=["companies"])


# ─── Company Endpoints ───────────────────────────────────────────────────────

@router.get("", response_model=list[CompanyResponse])
def list_companies():
    """List all companies."""
    companies = db.get_companies()
    return companies


@router.post("", response_model=CompanyResponse)
def create_company(company: CompanyCreate):
    """Create a new company."""
    # Check if company already exists
    existing = db.get_company_by_name(company.company_name)
    if existing:
        raise HTTPException(status_code=400, detail="Company already exists")

    result = db.create_company(company.company_name)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create company")
    return result


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int):
    """Get a company by ID."""
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, updates: CompanyUpdate):
    """Update a company."""
    if updates.company_name:
        result = db.update_company(company_id, updates.company_name)
        if not result:
            raise HTTPException(status_code=404, detail="Company not found")
        return result
    raise HTTPException(status_code=400, detail="No updates provided")


@router.delete("/{company_id}")
def delete_company(company_id: int):
    """Delete a company and all its people."""
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete_company(company_id)
    return {"message": "Company deleted successfully"}


# ─── People Endpoints (within company context) ──────────────────────────────

@router.get("/{company_id}/people", response_model=list[PersonResponse])
def list_company_people(company_id: int):
    """List all people in a company."""
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    people = db.get_people(company["company_name"])

    # Transform people to include parsed skills
    result = []
    for person in people:
        skills = {}
        if person.get("skills"):
            try:
                skills = json.loads(person["skills"])
            except json.JSONDecodeError:
                skills = {"role": person["skills"], "tasks": [], "is_head": False}

        result.append({
            "id": person["id"],
            "name": person.get("name", ""),
            "surname": person.get("surname", ""),
            "department": person.get("department"),
            "role": skills.get("role", ""),
            "tasks": skills.get("tasks", []),
            "is_head": skills.get("is_head", False),
            "company_name": person.get("company_name"),
        })

    return result


@router.post("/{company_id}/people", response_model=PersonResponse)
def add_person_to_company(company_id: int, person: PersonCreate):
    """Add a person to a company."""
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = db.create_person({
        "company_name": company["company_name"],
        "department": person.department,
        "name": person.name,
        "surname": person.surname,
        "role": person.role,
        "tasks": person.tasks,
        "is_head": person.is_head,
    })

    if not result:
        raise HTTPException(status_code=500, detail="Failed to create person")

    # Parse skills for response
    skills = {}
    if result.get("skills"):
        try:
            skills = json.loads(result["skills"])
        except json.JSONDecodeError:
            skills = {"role": result["skills"], "tasks": [], "is_head": False}

    return {
        "id": result["id"],
        "name": result.get("name", ""),
        "surname": result.get("surname", ""),
        "department": result.get("department"),
        "role": skills.get("role", ""),
        "tasks": skills.get("tasks", []),
        "is_head": skills.get("is_head", False),
        "company_name": result.get("company_name"),
    }
