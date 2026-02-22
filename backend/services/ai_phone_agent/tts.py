"""Streaming text-to-speech via ElevenLabs WebSocket."""
import asyncio
import json
import base64
from typing import Callable, Awaitable

import websockets


class StreamingTTS:
    """Streaming text-to-speech using ElevenLabs WebSocket API."""

    def __init__(
        self,
        api_key: str,
        voice_id: str,
        on_audio_chunk: Callable[[bytes], Awaitable[None]],
    ):
        """
        Initialize the TTS client.

        Args:
            api_key: ElevenLabs API key
            voice_id: Voice ID to use for speech synthesis
            on_audio_chunk: Async callback for each audio chunk (PCM bytes)
        """
        self.api_key = api_key
        self.voice_id = voice_id
        self.on_audio_chunk = on_audio_chunk
        self.ws = None
        self._listen_task = None

    async def connect(self):
        """Connect to ElevenLabs WebSocket."""
        url = (
            f"wss://api.elevenlabs.io/v1/text-to-speech/"
            f"{self.voice_id}/stream-input"
            f"?model_id=eleven_turbo_v2_5&output_format=pcm_24000"
        )
        print(f"[TTS] Connecting to ElevenLabs: {url[:80]}...", flush=True)
        self.ws = await websockets.connect(url)
        print("[TTS] WebSocket connected", flush=True)

        # Send init message
        init_msg = {
            "text": " ",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            "xi_api_key": self.api_key,
            "try_trigger_generation": True,
        }
        print("[TTS] Sending init message", flush=True)
        await self.ws.send(json.dumps(init_msg))

        self._listen_task = asyncio.create_task(self._listen())
        print("[TTS] Listen task started", flush=True)

    async def send_text(self, text: str):
        """Send text to be converted to speech."""
        print(f"[TTS] send_text called: {text[:50]}...", flush=True)
        if self.ws:
            await self.ws.send(
                json.dumps(
                    {
                        "text": text + " ",
                        "try_trigger_generation": True,
                    }
                )
            )
            print("[TTS] Text sent to ElevenLabs", flush=True)

    async def flush(self):
        """Signal end of input — generates remaining audio."""
        print("[TTS] flush called", flush=True)
        if self.ws:
            await self.ws.send(json.dumps({"text": ""}))
            print("[TTS] Flush sent (empty text)", flush=True)

    async def _listen(self):
        """Listen for audio chunks from ElevenLabs."""
        print("[TTS] _listen started, waiting for audio...", flush=True)
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                print(f"[TTS] Received message: {str(data)[:100]}...", flush=True)
                if data.get("audio"):
                    pcm = base64.b64decode(data["audio"])
                    print(f"[TTS] Got audio chunk: {len(pcm)} bytes", flush=True)
                    await self.on_audio_chunk(pcm)
                if data.get("isFinal"):
                    print("[TTS] Received isFinal, exiting listen loop", flush=True)
                    break
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[TTS] Connection closed: {e}", flush=True)
        except Exception as e:
            print(f"[TTS] Error in _listen: {e}", flush=True)

    async def close(self):
        """Close the WebSocket connection."""
        if self.ws:
            await self.ws.close()
        if self._listen_task:
            self._listen_task.cancel()
