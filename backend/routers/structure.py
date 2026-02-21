from fastapi import APIRouter, HTTPException
from backend.database.client import db
from backend.database.models import StructureInput, StructureResponse, DepartmentResponse

router = APIRouter(prefix="/api/companies", tags=["structure"])


@router.post("/{company_id}/structure")
def save_structure(company_id: int, structure: StructureInput):
    """Save entire company structure (departments + people).

    This replaces all existing people for the company with the new structure.
    """
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Convert Pydantic models to dicts
    departments = []
    for dept in structure.departments:
        people = []
        for person in dept.people:
            people.append({
                "name": person.name,
                "surname": person.surname,
                "role": person.role,
                "tasks": person.tasks,
                "is_head": person.is_head,
            })
        departments.append({
            "name": dept.name,
            "head": dept.head,
            "people": people,
        })

    success = db.save_structure(company["company_name"], departments)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save structure")

    return {"message": "Structure saved successfully", "departments": len(departments)}


@router.get("/{company_id}/structure")
def get_structure(company_id: int):
    """Get company structure in Nexus format.

    Returns departments with their people, ready for frontend consumption.
    """
    company = db.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    departments = db.get_structure(company["company_name"])

    # Add color_idx to each department
    for idx, dept in enumerate(departments):
        dept["color_idx"] = idx % 8

    return {
        "company": {
            "id": company["id"],
            "company_name": company["company_name"],
            "created_at": company.get("created_at"),
        },
        "departments": departments,
    }
