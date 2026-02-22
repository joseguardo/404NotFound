# Minimal AI Phone Call Agent

A stripped-down agent that calls a phone number, communicates an action, and answers questions using provided context. Nothing more.

---

## Project Structure

```
phone-agent/
├── .env                  # API keys
├── requirements.txt      # Dependencies
├── server.py             # FastAPI server (Twilio webhooks + WebSocket)
├── call.py               # CLI to trigger a call
├── orchestrator.py       # Ties STT → LLM → TTS together per call
├── stt.py                # Deepgram streaming speech-to-text
├── llm.py                # Claude conversation engine
├── tts.py                # ElevenLabs streaming text-to-speech
└── audio.py              # μ-law ↔ PCM conversion
```

**That's it. 8 files.**

---

## Setup

### 1. Install Dependencies

```
# requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
websockets==13.1
twilio==9.4.0
anthropic==0.42.0
python-dotenv==1.0.1
```

```bash
pip install -r requirements.txt
```

> **Note:** We use Deepgram and ElevenLabs via raw WebSockets (no SDK needed) to keep dependencies minimal.

### 2. Environment Variables

```bash
# .env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

DEEPGRAM_API_KEY=...

ANTHROPIC_API_KEY=...

ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

PUBLIC_HOST=your-ngrok-url.ngrok.io
```

### 3. Expose Locally with ngrok

```bash
ngrok http 8000
```

Copy the `https://xxxx.ngrok.io` URL into `PUBLIC_HOST` in `.env`.

Configure your Twilio phone number's **Voice webhook** to:
```
https://xxxx.ngrok.io/twilio/voice
```

---

## Full Implementation

### `audio.py` — Audio Format Conversion

```python
"""Convert between Twilio's μ-law 8kHz and ElevenLabs' PCM 24kHz."""
import audioop


def pcm_to_mulaw(pcm_data: bytes) -> bytes:
    return audioop.lin2ulaw(pcm_data, 2)


def elevenlabs_to_twilio(pcm_24k: bytes) -> bytes:
    """ElevenLabs PCM 24kHz 16-bit mono → Twilio μ-law 8kHz."""
    pcm_8k = audioop.ratecv(pcm_24k, 2, 1, 24000, 8000, None)[0]
    return pcm_to_mulaw(pcm_8k)
```

---

### `stt.py` — Deepgram Streaming STT

```python
"""Streaming speech-to-text via Deepgram WebSocket."""
import asyncio
import json
import websockets


class StreamingSTT:
    def __init__(self, api_key: str, on_utterance_end):
        self.api_key = api_key
        self.on_utterance_end = on_utterance_end
        self.ws = None
        self._listen_task = None
        self._current_text = ""

    async def start(self):
        url = (
            "wss://api.deepgram.com/v1/listen?"
            "model=nova-2&encoding=mulaw&sample_rate=8000&channels=1"
            "&punctuate=true&interim_results=false&utterance_end_ms=1200"
        )
        self.ws = await websockets.connect(
            url, extra_headers={"Authorization": f"Token {self.api_key}"}
        )
        self._listen_task = asyncio.create_task(self._listen())

    async def send_audio(self, audio_bytes: bytes):
        if self.ws:
            await self.ws.send(audio_bytes)

    async def _listen(self):
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                msg_type = data.get("type")

                if msg_type == "Results":
                    transcript = (
                        data.get("channel", {})
                        .get("alternatives", [{}])[0]
                        .get("transcript", "")
                    )
                    is_final = data.get("is_final", False)
                    if transcript and is_final:
                        self._current_text += " " + transcript

                elif msg_type == "UtteranceEnd":
                    text = self._current_text.strip()
                    self._current_text = ""
                    if text:
                        await self.on_utterance_end(text)

        except websockets.exceptions.ConnectionClosed:
            pass

    async def close(self):
        if self.ws:
            await self.ws.close()
        if self._listen_task:
            self._listen_task.cancel()
```

---

### `llm.py` — Claude Conversation Engine

```python
"""Claude-powered conversation engine for phone calls."""
import anthropic


def build_system_prompt(action: str, context: str, callee_name: str, agent_name: str, org: str) -> str:
    return f"""You are {agent_name}, an AI phone assistant calling on behalf of {org}. You are on a live voice call.

## YOUR TASK
Communicate the following action to {callee_name}:
{action}

## CONTEXT (use to answer questions)
{context}

## RULES
1. Be concise — 1 to 3 short sentences per response. This is a phone call, not an essay.
2. Sound natural and conversational. Use filler words sparingly (e.g., "sure", "got it").
3. Stay on topic. If asked something outside the context, say you'll have someone follow up.
4. If asked whether you're an AI, answer honestly.
5. When the person confirms or the action is communicated, wrap up naturally.
6. Output ONLY the words to speak aloud. No markdown, no stage directions, no parentheticals."""


class ConversationEngine:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
        self.system_prompt = ""
        self.messages: list[dict] = []

    def setup(self, action: str, context: str, callee_name: str,
              agent_name: str = "Alex", org: str = "our office"):
        self.system_prompt = build_system_prompt(action, context, callee_name, agent_name, org)
        self.messages = []

    def get_opening(self, callee_name: str, agent_name: str, org: str) -> str:
        first_name = callee_name.split()[0]
        return (
            f"Hi {first_name}, this is {agent_name} calling from {org}. "
            f"Do you have a quick moment?"
        )

    async def get_response(self, callee_said: str) -> str:
        """Get the agent's next response. Streams internally, returns full text."""
        self.messages.append({"role": "user", "content": callee_said})

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=150,
            system=self.system_prompt,
            messages=self.messages,
        )
        text = response.content[0].text
        self.messages.append({"role": "assistant", "content": text})
        return text

    async def stream_response(self, callee_said: str, on_sentence) -> str:
        """Stream response sentence-by-sentence for lower latency TTS."""
        self.messages.append({"role": "user", "content": callee_said})

        full = ""
        buffer = ""

        async with self.client.messages.stream(
            model=self.model,
            max_tokens=150,
            system=self.system_prompt,
            messages=self.messages,
        ) as stream:
            async for token in stream.text_stream:
                full += token
                buffer += token

                # Emit on sentence boundaries
                for sep in [".", "!", "?", ",", ";"]:
                    if sep in buffer:
                        parts = buffer.split(sep, 1)
                        sentence = parts[0] + sep
                        await on_sentence(sentence.strip())
                        buffer = parts[1]
                        break

        # Flush remaining
        if buffer.strip():
            await on_sentence(buffer.strip())

        self.messages.append({"role": "assistant", "content": full})
        return full
```

---

### `tts.py` — ElevenLabs Streaming TTS

```python
"""Streaming text-to-speech via ElevenLabs WebSocket."""
import asyncio
import json
import base64
import websockets


class StreamingTTS:
    def __init__(self, api_key: str, voice_id: str, on_audio_chunk):
        self.api_key = api_key
        self.voice_id = voice_id
        self.on_audio_chunk = on_audio_chunk  # callback(pcm_bytes)
        self.ws = None
        self._listen_task = None

    async def connect(self):
        url = (
            f"wss://api.elevenlabs.io/v1/text-to-speech/"
            f"{self.voice_id}/stream-input"
            f"?model_id=eleven_turbo_v2_5&output_format=pcm_24000"
        )
        self.ws = await websockets.connect(url)

        # Send init message
        await self.ws.send(json.dumps({
            "text": " ",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            "xi_api_key": self.api_key,
            "try_trigger_generation": True,
        }))

        self._listen_task = asyncio.create_task(self._listen())

    async def send_text(self, text: str):
        if self.ws:
            await self.ws.send(json.dumps({
                "text": text + " ",
                "try_trigger_generation": True,
            }))

    async def flush(self):
        """Signal end of input — generates remaining audio."""
        if self.ws:
            await self.ws.send(json.dumps({"text": ""}))

    async def _listen(self):
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                if data.get("audio"):
                    pcm = base64.b64decode(data["audio"])
                    await self.on_audio_chunk(pcm)
                if data.get("isFinal"):
                    break
        except websockets.exceptions.ConnectionClosed:
            pass

    async def close(self):
        if self.ws:
            await self.ws.close()
        if self._listen_task:
            self._listen_task.cancel()
```

---

### `orchestrator.py` — Per-Call Session

```python
"""Orchestrates a single phone call: Twilio ↔ STT ↔ LLM ↔ TTS."""
import asyncio
import base64
import json
import logging
from audio import elevenlabs_to_twilio
from stt import StreamingSTT
from llm import ConversationEngine
from tts import StreamingTTS

logger = logging.getLogger(__name__)


class CallSession:
    def __init__(self, config: dict, call_spec: dict, websocket):
        self.config = config
        self.call_spec = call_spec
        self.ws = websocket            # Twilio Media Stream WebSocket
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
        self.stream_sid = stream_sid

        # Setup LLM with the call's action & context
        self.llm.setup(
            action=self.call_spec["action"],
            context=self.call_spec["context"],
            callee_name=self.call_spec["callee_name"],
            agent_name=self.call_spec.get("agent_name", "Alex"),
            org=self.call_spec.get("organization", "our office"),
        )

        # Start STT
        await self.stt.start()

        # Deliver opening line
        await self._speak(self.llm.get_opening(
            self.call_spec["callee_name"],
            self.call_spec.get("agent_name", "Alex"),
            self.call_spec.get("organization", "our office"),
        ))

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
        self.is_speaking = True
        tts = StreamingTTS(
            api_key=self.config["ELEVENLABS_API_KEY"],
            voice_id=self.config["ELEVENLABS_VOICE_ID"],
            on_audio_chunk=self._send_audio_to_twilio,
        )
        await tts.connect()
        await tts.send_text(text)
        await tts.flush()
        await asyncio.sleep(0.5)
        self.is_speaking = False
        await tts.close()
        self.llm.messages.append({"role": "assistant", "content": text})

    async def _send_audio_to_twilio(self, pcm_audio: bytes):
        """Convert PCM → μ-law and push to Twilio stream."""
        mulaw = elevenlabs_to_twilio(pcm_audio)
        msg = json.dumps({
            "event": "media",
            "streamSid": self.stream_sid,
            "media": {"payload": base64.b64encode(mulaw).decode()},
        })
        await self.ws.send_text(msg)

    def _is_goodbye(self, text: str) -> bool:
        signals = ["goodbye", "bye", "have a great day", "take care", "talk soon"]
        return any(s in text.lower() for s in signals)

    async def end(self):
        self.is_active = False
        await self.stt.close()
        if self.tts:
            await self.tts.close()
        logger.info("Call ended.")

    async def cleanup(self):
        if self.is_active:
            await self.end()
```

---

### `server.py` — FastAPI Server

```python
"""FastAPI server handling Twilio webhooks and media streams."""
import os
import json
import base64
import logging
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from orchestrator import CallSession

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Shared config from env
CONFIG = {
    "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
    "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
    "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY"),
    "ELEVENLABS_VOICE_ID": os.getenv("ELEVENLABS_VOICE_ID"),
    "PUBLIC_HOST": os.getenv("PUBLIC_HOST"),
}

# In-memory store for pending call specs (call_spec_id → spec dict)
pending_calls: dict[str, dict] = {}


def register_call_spec(call_spec_id: str, spec: dict):
    pending_calls[call_spec_id] = spec


# --- Twilio Voice Webhook ---

@app.post("/twilio/voice")
async def twilio_voice(request: Request):
    """Twilio calls this when the phone is answered. Return TwiML to start a media stream."""
    call_spec_id = request.query_params.get("call_spec_id", "default")
    host = CONFIG["PUBLIC_HOST"]

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://{host}/media-stream">
            <Parameter name="call_spec_id" value="{call_spec_id}" />
        </Stream>
    </Connect>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


# --- Twilio Media Stream WebSocket ---

@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    session: CallSession | None = None

    try:
        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            event = msg.get("event")

            if event == "start":
                stream_sid = msg["start"]["streamSid"]
                call_spec_id = msg["start"]["customParameters"].get("call_spec_id", "default")

                spec = pending_calls.get(call_spec_id, {
                    "action": "No action specified",
                    "context": "No context provided",
                    "callee_name": "there",
                })

                session = CallSession(CONFIG, spec, websocket)
                await session.start(stream_sid)
                logger.info(f"Call started: {call_spec_id}")

            elif event == "media" and session:
                audio = base64.b64decode(msg["media"]["payload"])
                await session.receive_audio(audio)

            elif event == "stop":
                if session:
                    await session.end()
                break

    except Exception as e:
        logger.error(f"Media stream error: {e}", exc_info=True)
    finally:
        if session:
            await session.cleanup()


# --- Health check ---

@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### `call.py` — CLI to Trigger a Call

```python
"""Trigger an outbound call from the command line."""
import os
import sys
import uuid
import requests
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()


def make_call(phone_number: str, action: str, context: str,
              callee_name: str = "there", agent_name: str = "Alex",
              organization: str = "our office"):

    # 1. Register the call spec with our server
    call_spec_id = str(uuid.uuid4())[:8]
    host = os.getenv("PUBLIC_HOST")

    # We need to register the spec so the server knows what this call is about.
    # Since server is local, we store it directly via an endpoint.
    requests.post(f"https://{host}/register-call", json={
        "call_spec_id": call_spec_id,
        "spec": {
            "action": action,
            "context": context,
            "callee_name": callee_name,
            "agent_name": agent_name,
            "organization": organization,
        }
    })

    # 2. Initiate the call via Twilio
    client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

    call = client.calls.create(
        to=phone_number,
        from_=os.getenv("TWILIO_PHONE_NUMBER"),
        url=f"https://{host}/twilio/voice?call_spec_id={call_spec_id}",
    )

    print(f"Call initiated!")
    print(f"  SID: {call.sid}")
    print(f"  To:  {phone_number}")
    print(f"  Action: {action}")


if __name__ == "__main__":
    # ----------------------------------------------------------------
    # USAGE:
    #   python call.py "+1234567890" "Confirm your dentist appointment Thursday at 2pm" "Dr. Smith, Suite 200, 123 Main St. Rescheduling is available Mon-Fri 9am-5pm."
    #
    # Args:
    #   1: Phone number (E.164 format)
    #   2: Action to communicate
    #   3: Context for answering questions
    # ----------------------------------------------------------------

    if len(sys.argv) < 4:
        print("Usage: python call.py <phone> <action> <context> [callee_name] [agent_name] [org]")
        sys.exit(1)

    make_call(
        phone_number=sys.argv[1],
        action=sys.argv[2],
        context=sys.argv[3],
        callee_name=sys.argv[4] if len(sys.argv) > 4 else "there",
        agent_name=sys.argv[5] if len(sys.argv) > 5 else "Alex",
        organization=sys.argv[6] if len(sys.argv) > 6 else "our office",
    )
```

Then add the registration endpoint to `server.py`:

```python
# Add to server.py

from pydantic import BaseModel

class RegisterCallRequest(BaseModel):
    call_spec_id: str
    spec: dict

@app.post("/register-call")
async def register_call(req: RegisterCallRequest):
    pending_calls[req.call_spec_id] = req.spec
    return {"status": "registered", "call_spec_id": req.call_spec_id}
```

---

## How to Run

### Terminal 1: Start the server
```bash
python server.py
```

### Terminal 2: Expose with ngrok
```bash
ngrok http 8000
```
*(Update `.env` with the ngrok URL)*

### Terminal 3: Make a call
```bash
python call.py \
  "+1234567890" \
  "Confirm your dentist appointment this Thursday at 2pm with Dr. Smith" \
  "The appointment is at Suite 200, 123 Main St. If they need to reschedule, available slots are Monday 10am, Wednesday 3pm, or Friday 11am. Cancellation requires 24hr notice." \
  "John" \
  "Alex" \
  "Downtown Dental"
```

---

## Data Flow Summary

```
call.py (trigger)
    │
    ├──► server /register-call  (stores action + context in memory)
    └──► Twilio API  (initiates phone call)
              │
              ▼
         Phone rings → Person answers
              │
              ▼
         Twilio hits /twilio/voice → returns TwiML → opens WebSocket
              │
              ▼
         /media-stream WebSocket (bidirectional audio)
              │
              ├── Incoming audio → Deepgram STT → text
              │                                     │
              │                        Claude (action + context + conversation)
              │                                     │
              └── Outgoing audio ← ElevenLabs TTS ← response text
```

No database. No Docker. No queues. Just call and talk.