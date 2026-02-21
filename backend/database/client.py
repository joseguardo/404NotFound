import json
from typing import Optional
from supabase import create_client, Client
from backend.config import SUPABASE_URL, SUPABASE_KEY


class SupabaseClient:
    """Extended Supabase client with CRUD operations for Companies and People."""

    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ─── Companies ───────────────────────────────────────────────────────────

    def get_companies(self) -> list:
        """Fetch all companies."""
        response = self.client.table("Companies").select("*").execute()
        return response.data

    def get_company(self, company_id: int) -> Optional[dict]:
        """Fetch a company by ID."""
        response = (
            self.client.table("Companies")
            .select("*")
            .eq("id", company_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def get_company_by_name(self, company_name: str) -> Optional[dict]:
        """Fetch a company by name."""
        response = (
            self.client.table("Companies")
            .select("*")
            .eq("company_name", company_name)
            .execute()
        )
        return response.data[0] if response.data else None

    def create_company(self, company_name: str) -> dict:
        """Create a new company."""
        response = (
            self.client.table("Companies")
            .insert({"company_name": company_name})
            .execute()
        )
        return response.data[0] if response.data else None

    def update_company(self, company_id: int, company_name: str) -> Optional[dict]:
        """Update a company's name."""
        response = (
            self.client.table("Companies")
            .update({"company_name": company_name})
            .eq("id", company_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_company(self, company_id: int) -> bool:
        """Delete a company by ID."""
        # First get the company to find its name
        company = self.get_company(company_id)
        if company:
            # Delete all people belonging to this company
            self.delete_company_people(company["company_name"])

        # Delete the company
        self.client.table("Companies").delete().eq("id", company_id).execute()
        return True

    # ─── People ──────────────────────────────────────────────────────────────

    def get_people(self, company_name: Optional[str] = None) -> list:
        """Fetch all people, optionally filtered by company."""
        query = self.client.table("People").select("*")
        if company_name:
            query = query.eq("company_name", company_name)
        response = query.execute()
        return response.data

    def get_person(self, person_id: int) -> Optional[dict]:
        """Fetch a person by ID."""
        response = (
            self.client.table("People")
            .select("*")
            .eq("id", person_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def create_person(self, person_data: dict) -> dict:
        """Create a new person with skills as JSON."""
        # Build skills JSON from role, tasks, is_head
        skills_data = {
            "role": person_data.get("role", ""),
            "tasks": person_data.get("tasks", []),
            "is_head": person_data.get("is_head", False),
        }

        db_data = {
            "company_name": person_data["company_name"],
            "department": person_data["department"],
            "name": person_data["name"],
            "surname": person_data.get("surname", ""),
            "skills": json.dumps(skills_data),
        }

        response = self.client.table("People").insert(db_data).execute()
        return response.data[0] if response.data else None

    def update_person(self, person_id: int, updates: dict) -> Optional[dict]:
        """Update a person."""
        # Get current person to merge skills
        current = self.get_person(person_id)
        if not current:
            return None

        # Parse current skills
        current_skills = {}
        if current.get("skills"):
            try:
                current_skills = json.loads(current["skills"])
            except json.JSONDecodeError:
                current_skills = {"role": current["skills"], "tasks": [], "is_head": False}

        # Build update data
        db_updates = {}

        if "name" in updates:
            db_updates["name"] = updates["name"]
        if "surname" in updates:
            db_updates["surname"] = updates["surname"]
        if "department" in updates:
            db_updates["department"] = updates["department"]

        # Update skills JSON if any skill-related field is updated
        if any(k in updates for k in ["role", "tasks", "is_head"]):
            if "role" in updates:
                current_skills["role"] = updates["role"]
            if "tasks" in updates:
                current_skills["tasks"] = updates["tasks"]
            if "is_head" in updates:
                current_skills["is_head"] = updates["is_head"]
            db_updates["skills"] = json.dumps(current_skills)

        if not db_updates:
            return current

        response = (
            self.client.table("People")
            .update(db_updates)
            .eq("id", person_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_person(self, person_id: int) -> bool:
        """Delete a person by ID."""
        self.client.table("People").delete().eq("id", person_id).execute()
        return True

    def delete_company_people(self, company_name: str) -> bool:
        """Delete all people belonging to a company."""
        self.client.table("People").delete().eq("company_name", company_name).execute()
        return True

    # ─── Structure Operations ────────────────────────────────────────────────

    def save_structure(self, company_name: str, departments: list) -> bool:
        """Save entire company structure (replaces existing people)."""
        # Delete all existing people for this company
        self.delete_company_people(company_name)

        # Insert all new people from departments
        for dept in departments:
            for person in dept.get("people", []):
                self.create_person({
                    "company_name": company_name,
                    "department": dept["name"],
                    "name": person.get("name", ""),
                    "surname": person.get("surname", ""),
                    "role": person.get("role", ""),
                    "tasks": person.get("tasks", []),
                    "is_head": person.get("is_head", False),
                })

        return True

    def get_structure(self, company_name: str) -> dict:
        """Get company structure in Nexus format (grouped by department)."""
        people = self.get_people(company_name)

        # Group people by department
        departments_map = {}
        for person in people:
            dept_name = person.get("department") or "Unassigned"

            if dept_name not in departments_map:
                departments_map[dept_name] = {
                    "name": dept_name,
                    "head": "",
                    "people": [],
                }

            # Parse skills JSON
            skills = {}
            if person.get("skills"):
                try:
                    skills = json.loads(person["skills"])
                except json.JSONDecodeError:
                    skills = {"role": person["skills"], "tasks": [], "is_head": False}

            person_data = {
                "id": person["id"],
                "name": person.get("name", ""),
                "surname": person.get("surname", ""),
                "role": skills.get("role", ""),
                "tasks": skills.get("tasks", []),
                "is_head": skills.get("is_head", False),
            }

            departments_map[dept_name]["people"].append(person_data)

            # Set department head label if this person is head
            if person_data["is_head"] and person_data["role"]:
                departments_map[dept_name]["head"] = person_data["role"]

        return list(departments_map.values())


# Singleton instance
db = SupabaseClient()
