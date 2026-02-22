"""Phone agent router - handles Twilio webhooks and media streams."""
import json
import base64
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, Request, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from twilio.rest import Client

from backend.services.ai_phone_agent.config import get_config, validate_config
from backend.services.ai_phone_agent.orchestrator import CallSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/phone", tags=["phone"])

# Load config at module level
CONFIG = get_config()

# In-memory store for pending call specs (call_spec_id → spec dict)
pending_calls: dict[str, dict] = {}


# --- Pydantic Models ---


class RegisterCallRequest(BaseModel):
    """Request to register a call spec."""

    call_spec_id: str
    spec: dict


class MakeCallRequest(BaseModel):
    """Request to initiate an outbound call."""

    phone_number: str
    action: str
    context: str
    callee_name: str = "there"
    agent_name: str = "Alex"
    organization: str = "our office"


class CallResponse(BaseModel):
    """Response after initiating a call."""

    status: str
    call_sid: Optional[str] = None
    phone_number: str
    action: str


# --- Endpoints ---


@router.get("/health")
async def health():
    """Health check for phone agent."""
    missing = validate_config(CONFIG)
    if missing:
        return {
            "status": "degraded",
            "message": f"Missing config: {', '.join(missing)}",
        }
    return {"status": "ok"}


@router.post("/register-call")
async def register_call(req: RegisterCallRequest):
    """Register a call spec before initiating a call."""
    pending_calls[req.call_spec_id] = req.spec
    return {"status": "registered", "call_spec_id": req.call_spec_id}


@router.post("/call", response_model=CallResponse)
async def make_call(req: MakeCallRequest):
    """Initiate an outbound phone call."""
    # Validate config
    missing = validate_config(CONFIG)
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Phone agent not configured. Missing: {', '.join(missing)}",
        )

    # Generate call spec ID
    call_spec_id = str(uuid.uuid4())[:8]

    # Register the call spec
    pending_calls[call_spec_id] = {
        "action": req.action,
        "context": req.context,
        "callee_name": req.callee_name,
        "agent_name": req.agent_name,
        "organization": req.organization,
    }

    # Initiate call via Twilio
    try:
        client = Client(CONFIG["TWILIO_ACCOUNT_SID"], CONFIG["TWILIO_AUTH_TOKEN"])
        host = CONFIG["PUBLIC_HOST"]

        call = client.calls.create(
            to=req.phone_number,
            from_=CONFIG["TWILIO_PHONE_NUMBER"],
            url=f"https://{host}/api/phone/twilio/voice?call_spec_id={call_spec_id}",
        )

        logger.info(f"Call initiated: {call.sid} to {req.phone_number}")

        return CallResponse(
            status="initiated",
            call_sid=call.sid,
            phone_number=req.phone_number,
            action=req.action,
        )
    except Exception as e:
        logger.error(f"Failed to initiate call: {e}")
        # Clean up the pending call spec
        pending_calls.pop(call_spec_id, None)
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {e}")


@router.post("/twilio/voice")
async def twilio_voice(request: Request):
    """Twilio calls this when the phone is answered. Return TwiML to start a media stream."""
    call_spec_id = request.query_params.get("call_spec_id", "default")
    host = CONFIG["PUBLIC_HOST"]

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://{host}/api/phone/media-stream">
            <Parameter name="call_spec_id" value="{call_spec_id}" />
        </Stream>
    </Connect>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    """Twilio Media Stream WebSocket - bidirectional audio."""
    print("=== Media stream WebSocket connecting ===", flush=True)
    await websocket.accept()
    print("=== WebSocket accepted ===", flush=True)
    session: CallSession | None = None

    try:
        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            event = msg.get("event")
            print(f"=== Received event: {event} ===", flush=True)

            if event == "start":
                stream_sid = msg["start"]["streamSid"]
                call_spec_id = msg["start"]["customParameters"].get(
                    "call_spec_id", "default"
                )
                print(f"=== Start event: stream_sid={stream_sid}, call_spec_id={call_spec_id} ===", flush=True)

                spec = pending_calls.get(
                    call_spec_id,
                    {
                        "action": "No action specified",
                        "context": "No context provided",
                        "callee_name": "there",
                    },
                )
                print(f"=== Call spec found: {spec.get('action', 'N/A')[:50]}... ===", flush=True)

                session = CallSession(CONFIG, spec, websocket)
                print("=== CallSession created, starting... ===", flush=True)
                await session.start(stream_sid)
                print(f"=== Call started successfully: {call_spec_id} ===", flush=True)

            elif event == "media" and session:
                audio = base64.b64decode(msg["media"]["payload"])
                await session.receive_audio(audio)

            elif event == "stop":
                print("=== Stop event received ===", flush=True)
                if session:
                    await session.end()
                break

            elif event == "connected":
                print("=== Connected event received ===", flush=True)

    except Exception as e:
        print(f"=== Media stream error: {e} ===", flush=True)
        import traceback
        traceback.print_exc()
    finally:
        print("=== WebSocket closing, cleaning up ===", flush=True)
        if session:
            await session.cleanup()
