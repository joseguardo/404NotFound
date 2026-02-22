"""Claude-powered conversation engine for phone calls."""
from typing import Callable, Awaitable

import anthropic


def build_system_prompt(
    action: str, context: str, callee_name: str, agent_name: str, org: str
) -> str:
    """Build the system prompt for the phone call agent."""
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
    """Claude-powered conversation engine for phone calls."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        """
        Initialize the conversation engine.

        Args:
            api_key: Anthropic API key
            model: Claude model to use
        """
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
        self.system_prompt = ""
        self.messages: list[dict] = []

    def setup(
        self,
        action: str,
        context: str,
        callee_name: str,
        agent_name: str = "Alex",
        org: str = "our office",
    ):
        """Set up the conversation with action and context."""
        self.system_prompt = build_system_prompt(
            action, context, callee_name, agent_name, org
        )
        self.messages = []

    def get_opening(self, callee_name: str, agent_name: str, org: str) -> str:
        """Get the opening line for the call."""
        first_name = callee_name.split()[0]
        return (
            f"Hi {first_name}, this is {agent_name} calling from {org}. "
            f"Do you have a quick moment?"
        )

    async def get_response(self, callee_said: str) -> str:
        """Get the agent's next response (non-streaming)."""
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

    async def stream_response(
        self, callee_said: str, on_sentence: Callable[[str], Awaitable[None]]
    ) -> str:
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
