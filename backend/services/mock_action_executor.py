import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from backend.services.ai_phone_agent.test_call import call_config as default_call_config

logger = logging.getLogger(__name__)


def _mock_email_targets(payload: dict[str, Any]) -> list[str]:
    people = payload.get("people") or []
    if people:
        return [f"{p.lower().replace(' ', '.')}@hackeurope.test" for p in people]
    recipient = payload.get("recipient") or "team"
    return [f"{str(recipient).lower().replace(' ', '.')}@hackeurope.test"]


def _run_mock_email(payload: dict[str, Any]) -> dict[str, Any]:
    targets = _mock_email_targets(payload)
    log_dir = Path("backend/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    line = (
        f"{datetime.utcnow().isoformat()} | EMAIL | to={','.join(targets)} | "
        f"subject=Action Update | body={payload.get('description', '')[:120]}\n"
    )
    with open(log_dir / "mock_email_actions.log", "a", encoding="utf-8") as f:
        f.write(line)
    return {"status": "sent", "targets": targets}


async def _run_mock_call(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        from backend.routers.phone_calls import MakeCallRequest, make_call
    except Exception as e:
        return {"status": "failed", "error": f"phone router unavailable: {e}"}

    phone_number = (
        payload.get("phone_number")
        or os.getenv("TEST_PHONE_NUMBER")
        or default_call_config.get("phone_number")
    )
    if not phone_number:
        return {"status": "skipped", "error": "No test phone number configured"}

    try:
        response = await make_call(
            MakeCallRequest(
                phone_number=phone_number,
                action=payload.get("description", "Test action"),
                context=f"Mock run from upload pipeline. urgency={payload.get('urgency', 'N/A')}",
                callee_name=payload.get("recipient") or default_call_config.get("callee_name", "there"),
                agent_name=default_call_config.get("agent_name", "Nexus"),
                organization=default_call_config.get("organization", "HackEurope"),
            )
        )
        return {"status": "initiated", "call_sid": response.call_sid}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


async def _run_mock_ticket(payload: dict[str, Any]) -> dict[str, Any]:
    if not os.getenv("LINEAR_API_KEY"):
        return {"status": "skipped", "error": "LINEAR_API_KEY not set"}

    try:
        from backend.mcp_clients.registry import MCPRegistry

        team = os.getenv("LINEAR_TEAM", "Operations")
        async with MCPRegistry(only=["linear"]) as mcp:
            issue = await mcp.linear.create_issue(
                team=team,
                title=f"[Mock] {payload.get('description', 'Action')[:90]}",
                description=(
                    f"Mock action execution\n"
                    f"task_id={payload.get('task_id')}\n"
                    f"response_type={payload.get('response_type')}\n"
                    f"recipient={payload.get('recipient')}\n"
                ),
            )
        return {"status": "created", "issue": issue if isinstance(issue, dict) else {"raw": str(issue)}}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


async def run_mock_action_suite(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    results: dict[str, Any] = {"company_id": company_id, "task_id": payload.get("task_id")}

    if payload.get("run_email_test", True):
        results["email"] = _run_mock_email(payload)
    if payload.get("run_call_test", True):
        results["call"] = await _run_mock_call(payload)
    if payload.get("run_ticket_test", True):
        results["ticket"] = await _run_mock_ticket(payload)

    logger.info("Mock action suite finished: %s", results)
    return results
