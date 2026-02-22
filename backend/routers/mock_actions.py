from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from backend.services.mock_action_executor import run_mock_action_suite


router = APIRouter(prefix="/api/companies", tags=["mock-actions"])


class MockExecuteActionRequest(BaseModel):
    task_id: str
    description: str
    response_type: str | None = None
    recipient: str | None = None
    people: list[str] = []
    urgency: str | None = None
    phone_number: str | None = None
    run_email_test: bool = True
    run_call_test: bool = True
    run_ticket_test: bool = True


@router.post("/{company_id}/actions/mock-execute")
async def mock_execute_action(
    company_id: int,
    req: MockExecuteActionRequest,
    background_tasks: BackgroundTasks,
):
    payload = req.model_dump()
    background_tasks.add_task(run_mock_action_suite, company_id, payload)
    return {
        "success": True,
        "status": "queued",
        "message": "Mock action suite queued",
        "task_id": req.task_id,
    }
