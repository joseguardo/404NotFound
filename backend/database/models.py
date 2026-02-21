from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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
