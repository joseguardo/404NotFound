# AI Phone Agent Implementation Plan

## Overview
Build a minimal AI phone call agent integrated into the main Nexus API backend. The agent calls a phone number, communicates an action, and answers questions using provided context. Uses:
- **Twilio** - Phone call infrastructure
- **Deepgram** - Streaming speech-to-text
- **Claude** - Conversation engine
- **ElevenLabs** - Streaming text-to-speech

## Files to Create

### Service Modules (in `backend/services/ai-phone-agent/`)

#### 1. `__init__.py` - Package init
- Export main classes for use by router

#### 2. `audio.py` - Audio Format Conversion
- Convert between Twilio's μ-law 8kHz and ElevenLabs' PCM 24kHz
- Functions: `pcm_to_mulaw()`, `elevenlabs_to_twilio()`

#### 3. `stt.py` - Deepgram Streaming STT
- `StreamingSTT` class with WebSocket connection to Deepgram
- Handles streaming audio input and emits transcribed text on utterance completion
- Key methods: `start()`, `send_audio()`, `close()`

#### 4. `llm.py` - Claude Conversation Engine
- `ConversationEngine` class using Anthropic's Claude API
- System prompt builder for phone call context
- Support for both regular and streaming responses
- Key methods: `setup()`, `get_opening()`, `get_response()`, `stream_response()`

#### 5. `tts.py` - ElevenLabs Streaming TTS
- `StreamingTTS` class with WebSocket connection to ElevenLabs
- Streams text input and outputs PCM audio chunks
- Key methods: `connect()`, `send_text()`, `flush()`, `close()`

#### 6. `orchestrator.py` - Per-Call Session
- `CallSession` class that ties STT → LLM → TTS together
- Manages the full lifecycle of a phone call
- Handles Twilio WebSocket communication
- Key methods: `start()`, `receive_audio()`, `end()`, `cleanup()`

#### 7. `config.py` - Phone Agent Configuration
- Load phone agent specific environment variables
- Provide CONFIG dict for service modules

### Router (in `backend/routers/`)

#### 8. `phone_calls.py` - Phone Agent Router
- FastAPI router with prefix `/api/phone`
- Endpoints:
  - `POST /api/phone/twilio/voice` - Twilio webhook, returns TwiML
  - `WS /api/phone/media-stream` - Twilio Media Stream WebSocket
  - `POST /api/phone/register-call` - Register call spec before initiating
  - `POST /api/phone/call` - Initiate an outbound call (replaces CLI)
  - `GET /api/phone/health` - Health check
- In-memory store for pending call specs

### Files to Modify

#### 9. `backend/main.py` - Add Phone Router
- Import and include the phone_calls router
- Add ngrok/public host CORS origin if needed

#### 10. `backend/config.py` - Add Phone Agent Env Vars
- Add phone agent environment variables (Twilio, Deepgram, Anthropic, ElevenLabs)

#### 11. `backend/requirements.txt` - Add Dependencies
- Add: websockets, twilio, anthropic

## Environment Variables to Add

Add to project root `.env`:
```
# Twilio (Phone)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=...

# Anthropic (LLM)
ANTHROPIC_API_KEY=...

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Public Host (ngrok URL for Twilio webhooks)
PUBLIC_HOST=your-ngrok-url.ngrok.io
```

## Integration Architecture

The phone agent is integrated into the main Nexus API:

```
backend/
├── main.py                      # FastAPI app (includes phone_calls router)
├── config.py                    # All env vars including phone agent
├── requirements.txt             # Dependencies (add websockets, twilio, anthropic)
├── routers/
│   ├── phone_calls.py           # NEW: Phone agent endpoints
│   ├── companies.py
│   ├── structure.py
│   └── ...
└── services/
    └── ai-phone-agent/
        ├── __init__.py          # Package exports
        ├── audio.py             # Audio conversion
        ├── stt.py               # Speech-to-text
        ├── tts.py               # Text-to-speech
        ├── llm.py               # Claude conversation
        ├── orchestrator.py      # Call session management
        └── config.py            # Phone agent config
```

## Data Flow

```
POST /api/phone/call (trigger)
    │
    ├──► /api/phone/register-call  (stores action + context in memory)
    └──► Twilio API  (initiates phone call)
              │
              ▼
         Phone rings → Person answers
              │
              ▼
         Twilio hits /api/phone/twilio/voice → returns TwiML → opens WebSocket
              │
              ▼
         /api/phone/media-stream WebSocket (bidirectional audio)
              │
              ├── Incoming audio → Deepgram STT → text
              │                                     │
              │                        Claude (action + context + conversation)
              │                                     │
              └── Outgoing audio ← ElevenLabs TTS ← response text
```

## Implementation Order

1. `backend/services/ai-phone-agent/__init__.py` - Package init
2. `backend/services/ai-phone-agent/audio.py` - No dependencies
3. `backend/services/ai-phone-agent/stt.py` - Deepgram WebSocket
4. `backend/services/ai-phone-agent/tts.py` - ElevenLabs WebSocket
5. `backend/services/ai-phone-agent/llm.py` - Claude API
6. `backend/services/ai-phone-agent/config.py` - Environment config
7. `backend/services/ai-phone-agent/orchestrator.py` - Ties all together
8. `backend/routers/phone_calls.py` - API endpoints
9. `backend/main.py` - Include router (modification)
10. `backend/config.py` - Add env vars (modification)
11. `backend/requirements.txt` - Add deps (modification)

## API Usage Example

```bash
# Make a call via API
curl -X POST "http://localhost:8000/api/phone/call" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "action": "Confirm your dentist appointment Thursday at 2pm",
    "context": "Dr. Smith, Suite 200. Rescheduling available Mon-Fri.",
    "callee_name": "John",
    "agent_name": "Alex",
    "organization": "Downtown Dental"
  }'
```

## Notes

- The `audioop` module is deprecated in Python 3.11+ but still works
- All WebSocket connections use raw websockets library (no SDK) for minimal dependencies
- Call specs are stored in memory (no database) for simplicity
- The main Nexus API server needs to be accessible via ngrok for Twilio webhooks
