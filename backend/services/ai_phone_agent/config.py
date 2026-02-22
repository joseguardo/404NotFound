"""Phone agent configuration - loads environment variables."""
import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))


def get_config() -> dict:
    """Get phone agent configuration from environment variables."""
    return {
        # Twilio
        "TWILIO_ACCOUNT_SID": os.getenv("TWILIO_ACCOUNT_SID"),
        "TWILIO_AUTH_TOKEN": os.getenv("TWILIO_AUTH_TOKEN"),
        "TWILIO_PHONE_NUMBER": os.getenv("TWILIO_PHONE_NUMBER"),
        # Deepgram
        "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
        # Anthropic
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        # ElevenLabs
        "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY"),
        "ELEVENLABS_VOICE_ID": os.getenv("ELEVENLABS_VOICE_ID"),
        # Public host for Twilio webhooks
        "PUBLIC_HOST": os.getenv("PUBLIC_HOST"),
    }


def validate_config(config: dict) -> list[str]:
    """Validate that required config values are present."""
    required = [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "DEEPGRAM_API_KEY",
        "ANTHROPIC_API_KEY",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_VOICE_ID",
        "PUBLIC_HOST",
    ]
    missing = [key for key in required if not config.get(key)]
    return missing
