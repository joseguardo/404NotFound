"""
Granola Transcript Watcher
==========================
Monitors Granola's local cache file for new transcripts and sends
them as webhook POSTs to your backend.

Usage:
    python scripts/granola_watcher.py
    python scripts/granola_watcher.py --webhook-url http://localhost:8000/api/webhooks/granola?company_id=1
    python scripts/granola_watcher.py --poll-interval 10
"""

import json
import time
import hashlib
import logging
import argparse
import platform
import signal
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

import requests

# ---------------------------------------------------------------------------
# Config & defaults
# ---------------------------------------------------------------------------

DEFAULT_WEBHOOK_URL = "http://localhost:8000/api/webhooks/granola"
DEFAULT_POLL_INTERVAL = 15  # seconds
DEFAULT_WEBHOOK_SECRET = "change-me-in-production"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("granola-watcher")

# Global flag for graceful shutdown
running = True


def signal_handler(sig, frame):
    """Handle SIGINT/SIGTERM for graceful shutdown."""
    global running
    log.info("Shutting down Granola watcher...")
    running = False


# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def get_cache_path() -> Path:
    """Return the platform-specific Granola cache path."""
    system = platform.system()
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Granola" / "cache-v3.json"
    elif system == "Windows":
        appdata = Path(os.environ.get("APPDATA", ""))
        return appdata / "Granola" / "cache-v3.json"
    else:
        # Linux / fallback
        return Path.home() / ".config" / "Granola" / "cache-v3.json"


def load_cache(cache_path: Path) -> dict:
    """Read and parse the Granola cache file."""
    with open(cache_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # The cache wraps everything in a JSON-encoded string under "cache"
    inner = json.loads(raw["cache"])
    return inner["state"]


def extract_transcripts(state: dict) -> dict:
    """
    Pull transcripts from the cache state.
    Returns {document_id: transcript_data, ...}
    """
    return state.get("transcripts", {})


def get_document_meta(state: dict, doc_id: str) -> dict:
    """Get basic meeting metadata for a document id."""
    documents = state.get("documents", {})
    # documents can be a list or dict depending on cache version
    if isinstance(documents, list):
        for doc in documents:
            if doc.get("id") == doc_id:
                return {
                    "document_id": doc_id,
                    "title": doc.get("title", "Untitled"),
                    "created_at": doc.get("created_at"),
                    "updated_at": doc.get("updated_at"),
                }
    elif isinstance(documents, dict):
        doc = documents.get(doc_id, {})
        return {
            "document_id": doc_id,
            "title": doc.get("title", "Untitled"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }
    return {"document_id": doc_id, "title": "Unknown"}


def compute_signature(payload_bytes: bytes, secret: str) -> str:
    """HMAC-style signature so the backend can verify the webhook."""
    return hashlib.sha256(f"{secret}:{payload_bytes.decode()}".encode()).hexdigest()


def send_webhook(
    url: str,
    document_meta: dict,
    transcript_data,
    secret: str,
) -> bool:
    """POST transcript payload to the webhook endpoint. Returns True on success."""
    payload = {
        "event": "transcript.new",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "meeting": document_meta,
        "transcript": transcript_data,
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    signature = compute_signature(payload_bytes, secret)

    headers = {
        "Content-Type": "application/json",
        "X-Granola-Event": "transcript.new",
        "X-Granola-Signature": signature,
    }

    try:
        resp = requests.post(url, data=payload_bytes, headers=headers, timeout=10)
        if resp.status_code < 300:
            log.info(
                "Webhook delivered for '%s' (HTTP %s)",
                document_meta.get("title", "?"),
                resp.status_code,
            )
            return True
        else:
            log.warning(
                "Webhook rejected for '%s' (HTTP %s): %s",
                document_meta.get("title", "?"),
                resp.status_code,
                resp.text[:200],
            )
            return False
    except requests.RequestException as e:
        log.error("Webhook failed: %s", e)
        return False


def watch(cache_path: Path, webhook_url: str, poll_interval: int, secret: str):
    """Main polling loop - watches for new transcripts and fires webhooks."""
    global running
    seen_ids: set[str] = set()
    first_run = True

    log.info("Watching Granola cache: %s", cache_path)
    log.info("Webhook target:         %s", webhook_url)
    log.info("Poll interval:          %ds", poll_interval)
    log.info("-" * 50)

    while running:
        try:
            if not cache_path.exists():
                log.warning("Cache file not found - is Granola running? Retrying in %ds...", poll_interval)
                time.sleep(poll_interval)
                continue

            state = load_cache(cache_path)
            transcripts = extract_transcripts(state)

            for doc_id, transcript_data in transcripts.items():
                if doc_id in seen_ids:
                    continue

                if first_run:
                    # On startup, mark existing transcripts as "seen"
                    # so we only fire webhooks for truly new ones.
                    seen_ids.add(doc_id)
                    continue

                log.info("New transcript detected: %s", doc_id)
                meta = get_document_meta(state, doc_id)
                send_webhook(webhook_url, meta, transcript_data, secret)
                seen_ids.add(doc_id)

            if first_run:
                log.info("Indexed %d existing transcripts - now watching for new ones", len(seen_ids))
                first_run = False

        except json.JSONDecodeError as e:
            log.warning("Cache file is being written - skipping this cycle (%s)", e)
        except Exception as e:
            log.error("Unexpected error: %s", e, exc_info=True)

        # Sleep in small increments to allow for faster shutdown
        for _ in range(poll_interval):
            if not running:
                break
            time.sleep(1)

    log.info("Granola watcher stopped.")


def main():
    parser = argparse.ArgumentParser(
        description="Watch Granola for new transcripts and send webhooks"
    )
    parser.add_argument(
        "--webhook-url",
        default=DEFAULT_WEBHOOK_URL,
        help=f"Webhook URL (default: {DEFAULT_WEBHOOK_URL})",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=DEFAULT_POLL_INTERVAL,
        help=f"Poll interval in seconds (default: {DEFAULT_POLL_INTERVAL})",
    )
    parser.add_argument(
        "--secret",
        default=DEFAULT_WEBHOOK_SECRET,
        help="Webhook secret for signature verification",
    )
    parser.add_argument(
        "--cache-path",
        type=Path,
        default=None,
        help="Override default Granola cache path",
    )

    args = parser.parse_args()
    cache_path = args.cache_path or get_cache_path()

    watch(cache_path, args.webhook_url, args.poll_interval, args.secret)


if __name__ == "__main__":
    main()
