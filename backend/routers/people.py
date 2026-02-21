from fastapi import APIRouter, HTTPException
from backend.database.client import db
from backend.database.models import PersonUpdate, PersonResponse
import json

router = APIRouter(prefix="/api/people", tags=["people"])


@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int):
    """Get a person by ID."""
    person = db.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Parse skills
    skills = {}
    if person.get("skills"):
        try:
            skills = json.loads(person["skills"])
        except json.JSONDecodeError:
            skills = {"role": person["skills"], "tasks": [], "is_head": False}

    return {
        "id": person["id"],
        "name": person.get("name", ""),
        "surname": person.get("surname", ""),
        "department": person.get("department"),
        "role": skills.get("role", ""),
        "tasks": skills.get("tasks", []),
        "is_head": skills.get("is_head", False),
        "company_name": person.get("company_name"),
    }


@router.put("/{person_id}", response_model=PersonResponse)
def update_person(person_id: int, updates: PersonUpdate):
    """Update a person."""
    # Build updates dict, excluding None values
    update_data = {}
    if updates.name is not None:
        update_data["name"] = updates.name
    if updates.surname is not None:
        update_data["surname"] = updates.surname
    if updates.department is not None:
        update_data["department"] = updates.department
    if updates.role is not None:
        update_data["role"] = updates.role
    if updates.tasks is not None:
        update_data["tasks"] = updates.tasks
    if updates.is_head is not None:
        update_data["is_head"] = updates.is_head

    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")

    result = db.update_person(person_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")

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


@router.delete("/{person_id}")
def delete_person(person_id: int):
    """Delete a person."""
    person = db.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    db.delete_person(person_id)
    return {"message": "Person deleted successfully"}
