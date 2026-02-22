"""Streaming speech-to-text via Deepgram WebSocket."""
import asyncio
import json
from typing import Callable, Awaitable

import websockets


class StreamingSTT:
    """Streaming speech-to-text using Deepgram's WebSocket API."""

    def __init__(self, api_key: str, on_utterance_end: Callable[[str], Awaitable[None]]):
        """
        Initialize the STT client.

        Args:
            api_key: Deepgram API key
            on_utterance_end: Async callback when a complete utterance is detected
        """
        self.api_key = api_key
        self.on_utterance_end = on_utterance_end
        self.ws = None
        self._listen_task = None
        self._current_text = ""

    async def start(self):
        """Connect to Deepgram and start listening for transcripts."""
        url = (
            "wss://api.deepgram.com/v1/listen?"
            "model=nova-2&encoding=mulaw&sample_rate=8000&channels=1"
            "&punctuate=true&interim_results=false&endpointing=1200&vad_events=true"
        )
        self.ws = await websockets.connect(
            url, additional_headers={"Authorization": f"Token {self.api_key}"}
        )
        self._listen_task = asyncio.create_task(self._listen())

    async def send_audio(self, audio_bytes: bytes):
        """Send audio data to Deepgram for transcription."""
        if self.ws:
            await self.ws.send(audio_bytes)

    async def _listen(self):
        """Listen for transcription results from Deepgram."""
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
                    speech_final = data.get("speech_final", False)

                    if transcript and is_final:
                        self._current_text += " " + transcript

                    # speech_final indicates end of utterance (replaces UtteranceEnd)
                    if speech_final and self._current_text.strip():
                        text = self._current_text.strip()
                        self._current_text = ""
                        await self.on_utterance_end(text)

                elif msg_type == "UtteranceEnd":
                    # Legacy support
                    text = self._current_text.strip()
                    self._current_text = ""
                    if text:
                        await self.on_utterance_end(text)

                elif msg_type == "SpeechStarted":
                    # VAD detected speech start
                    pass

        except websockets.exceptions.ConnectionClosed:
            pass

    async def close(self):
        """Close the WebSocket connection."""
        if self.ws:
            await self.ws.close()
        if self._listen_task:
            self._listen_task.cancel()
