"""Orchestrates a single phone call: Twilio ↔ STT ↔ LLM ↔ TTS."""
import asyncio
import base64
import json
import logging

from .audio import elevenlabs_to_twilio
from .stt import StreamingSTT
from .llm import ConversationEngine
from .tts import StreamingTTS

logger = logging.getLogger(__name__)


class CallSession:
    """Manages a single phone call session."""

    def __init__(self, config: dict, call_spec: dict, websocket):
        """
        Initialize a call session.

        Args:
            config: Configuration dict with API keys
            call_spec: Call specification with action, context, callee info
            websocket: Twilio Media Stream WebSocket
        """
        self.config = config
        self.call_spec = call_spec
        self.ws = websocket  # Twilio Media Stream WebSocket
        self.stream_sid = None
        self.is_active = True
        self.is_speaking = False

        # Components
        self.stt = StreamingSTT(
            api_key=config["DEEPGRAM_API_KEY"],
            on_utterance_end=self._on_callee_done_speaking,
        )
        self.llm = ConversationEngine(api_key=config["ANTHROPIC_API_KEY"])
        self.tts = None  # Created fresh per utterance

    async def start(self, stream_sid: str):
        """Start the call session."""
        print(f"[orchestrator] Starting session with stream_sid={stream_sid}", flush=True)
        self.stream_sid = stream_sid

        # Setup LLM with the call's action & context
        print("[orchestrator] Setting up LLM...", flush=True)
        self.llm.setup(
            action=self.call_spec["action"],
            context=self.call_spec["context"],
            callee_name=self.call_spec["callee_name"],
            agent_name=self.call_spec.get("agent_name", "Alex"),
            org=self.call_spec.get("organization", "our office"),
        )
        print("[orchestrator] LLM setup complete", flush=True)

        # Start STT
        print("[orchestrator] Starting STT...", flush=True)
        await self.stt.start()
        print("[orchestrator] STT started successfully", flush=True)

        # Deliver opening line
        opening = self.llm.get_opening(
            self.call_spec["callee_name"],
            self.call_spec.get("agent_name", "Alex"),
            self.call_spec.get("organization", "our office"),
        )
        print(f"[orchestrator] Delivering opening line: {opening[:50]}...", flush=True)
        await self._speak(opening)
        print("[orchestrator] Opening line delivered", flush=True)

    async def receive_audio(self, mulaw_bytes: bytes):
        """Called for each audio chunk from Twilio."""
        await self.stt.send_audio(mulaw_bytes)

    async def _on_callee_done_speaking(self, text: str):
        """Called when callee finishes a complete utterance."""
        if not self.is_active:
            return

        logger.info(f"Callee: {text}")

        # Stream LLM response through TTS
        self.is_speaking = True
        tts = StreamingTTS(
            api_key=self.config["ELEVENLABS_API_KEY"],
            voice_id=self.config["ELEVENLABS_VOICE_ID"],
            on_audio_chunk=self._send_audio_to_twilio,
        )
        await tts.connect()
        self.tts = tts

        response = await self.llm.stream_response(
            callee_said=text,
            on_sentence=tts.send_text,
        )
        await tts.flush()
        logger.info(f"Agent: {response}")

        # Wait for audio to finish playing
        await asyncio.sleep(0.5)
        self.is_speaking = False
        await tts.close()

        # Check if we should hang up
        if self._is_goodbye(response):
            await asyncio.sleep(1.5)
            await self.end()

    async def _speak(self, text: str):
        """Speak a full string (used for the opening line)."""
        print(f"[orchestrator] _speak called with: {text[:50]}...", flush=True)
        self.is_speaking = True
        tts = StreamingTTS(
            api_key=self.config["ELEVENLABS_API_KEY"],
            voice_id=self.config["ELEVENLABS_VOICE_ID"],
            on_audio_chunk=self._send_audio_to_twilio,
        )
        print("[orchestrator] Connecting to ElevenLabs TTS...", flush=True)
        await tts.connect()
        print("[orchestrator] TTS connected, sending text...", flush=True)
        await tts.send_text(text)
        print("[orchestrator] Flushing TTS...", flush=True)
        await tts.flush()
        await asyncio.sleep(0.5)
        self.is_speaking = False
        print("[orchestrator] Closing TTS...", flush=True)
        await tts.close()
        print("[orchestrator] _speak complete", flush=True)
        self.llm.messages.append({"role": "assistant", "content": text})

    async def _send_audio_to_twilio(self, pcm_audio: bytes):
        """Convert PCM → μ-law and push to Twilio stream."""
        print(f"[orchestrator] Sending audio chunk to Twilio ({len(pcm_audio)} bytes PCM)", flush=True)
        mulaw = elevenlabs_to_twilio(pcm_audio)
        msg = json.dumps(
            {
                "event": "media",
                "streamSid": self.stream_sid,
                "media": {"payload": base64.b64encode(mulaw).decode()},
            }
        )
        await self.ws.send_text(msg)
        print(f"[orchestrator] Audio chunk sent ({len(mulaw)} bytes mulaw)", flush=True)

    def _is_goodbye(self, text: str) -> bool:
        """Check if the response indicates the call should end."""
        signals = ["goodbye", "bye", "have a great day", "take care", "talk soon"]
        return any(s in text.lower() for s in signals)

    async def end(self):
        """End the call session."""
        self.is_active = False
        await self.stt.close()
        if self.tts:
            await self.tts.close()
        logger.info("Call ended.")

    async def cleanup(self):
        """Clean up resources."""
        if self.is_active:
            await self.end()
