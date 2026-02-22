"""Webhooks router - handles incoming webhooks from external services."""

import os
import hashlib
import logging
from typing import Optional, Any

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel

from backend.services.granola_converter import convert_granola_transcript
from backend.services.orchestrator import TranscriptOrchestrator
from backend.database.client import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Environment config
GRANOLA_WEBHOOK_SECRET = os.getenv("GRANOLA_WEBHOOK_SECRET", "change-me-in-production")

# Track processed documents to avoid duplicates (in-memory for simplicity)
processed_documents: set[str] = set()


# --- Pydantic Models ---


class GranolaMeeting(BaseModel):
    document_id: str
    title: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GranolaWebhookPayload(BaseModel):
    event: str
    timestamp: str
    meeting: GranolaMeeting
    transcript: Any  # Can be dict, list, or string


class WebhookResponse(BaseModel):
    status: str
    message: str
    document_id: Optional[str] = None


# --- Helper Functions ---


def verify_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    """Verify the webhook signature."""
    expected = hashlib.sha256(f"{secret}:{payload_bytes.decode()}".encode()).hexdigest()
    return signature == expected


async def process_granola_transcript(
    document_id: str,
    meeting_title: str,
    transcript_data: Any,
    company_id: int,
):
    """Background task to process Granola transcript through the pipeline."""
    try:
        # Get company info
        company = db.get_company(company_id)
        company_name = company.get("company_name", "Unknown") if company else "Unknown"

        # Convert transcript to plain text
        transcript_text = convert_granola_transcript(transcript_data)

        if not transcript_text or len(transcript_text.strip()) < 50:
            logger.warning(
                f"Transcript '{meeting_title}' too short to process ({len(transcript_text)} chars)"
            )
            return

        logger.info(
            f"Processing Granola transcript '{meeting_title}' ({len(transcript_text)} chars)"
        )

        # Process through orchestrator
        orchestrator = TranscriptOrchestrator(company_name, company_id)
        result = orchestrator.process_text(transcript_text)

        if result.success:
            logger.info(
                f"Processed Granola transcript '{meeting_title}': "
                f"{result.total_actions} actions extracted in {result.execution_time:.2f}s"
            )
        else:
            logger.error(f"Failed to process '{meeting_title}': {result.error}")

    except Exception as e:
        logger.error(f"Error processing transcript '{meeting_title}': {e}", exc_info=True)


# --- Endpoints ---


@router.post("/granola", response_model=WebhookResponse)
async def granola_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    company_id: int = 1,
):
    """
    Receive transcript webhook from Granola watcher.

    The watcher monitors Granola's local cache file and sends new transcripts
    to this endpoint for processing through the action extraction pipeline.

    Args:
        company_id: Company ID to associate the transcript with (query param)

    Headers:
        X-Granola-Event: Event type (transcript.new)
        X-Granola-Signature: HMAC signature for verification

    Body:
        {
            "event": "transcript.new",
            "timestamp": "2024-01-15T10:30:00Z",
            "meeting": {
                "document_id": "abc123",
                "title": "Weekly Standup",
                "created_at": "...",
                "updated_at": "..."
            },
            "transcript": { ... }
        }
    """
    # Get raw body for signature verification
    body = await request.body()

    # Verify signature (optional in development)
    signature = request.headers.get("X-Granola-Signature", "")
    if GRANOLA_WEBHOOK_SECRET != "change-me-in-production":
        if not verify_signature(body, signature, GRANOLA_WEBHOOK_SECRET):
            raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        payload = GranolaWebhookPayload.model_validate_json(body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    # Check event type
    if payload.event != "transcript.new":
        return WebhookResponse(
            status="ignored",
            message=f"Ignoring event type: {payload.event}",
            document_id=payload.meeting.document_id,
        )

    # Check idempotency
    doc_id = payload.meeting.document_id
    if doc_id in processed_documents:
        return WebhookResponse(
            status="duplicate",
            message="Transcript already processed",
            document_id=doc_id,
        )

    # Mark as processed
    processed_documents.add(doc_id)

    # Queue background processing
    background_tasks.add_task(
        process_granola_transcript,
        document_id=doc_id,
        meeting_title=payload.meeting.title,
        transcript_data=payload.transcript,
        company_id=company_id,
    )

    logger.info(f"Received Granola transcript: '{payload.meeting.title}' (id={doc_id})")

    return WebhookResponse(
        status="accepted",
        message="Transcript queued for processing",
        document_id=doc_id,
    )


@router.get("/granola/health")
async def granola_health():
    """Health check for Granola webhook endpoint."""
    return {
        "status": "ok",
        "processed_count": len(processed_documents),
    }
