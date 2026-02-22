"""Base MCP client — all MCP integrations inherit from this."""

import asyncio
import logging
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

logger = logging.getLogger(__name__)


class BaseMCPClient(ABC):
    """
    Base class for all MCP integrations.

    Subclasses define:
      - server_params() → how to connect
      - domain-specific methods that call self._call_tool()

    Usage:
        async with LinearMCP() as linear:
            await linear.create_issue(...)

        # or without context manager
        linear = LinearMCP()
        await linear.connect()
        await linear.create_issue(...)
        await linear.disconnect()
    """

    def __init__(self):
        self._session: ClientSession | None = None
        self._read = None
        self._write = None
        self._client_cm = None
        self._session_cm = None

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name for logging."""
        ...

    @abstractmethod
    def server_params(self) -> StdioServerParameters:
        """Connection config for this MCP server."""
        ...

    # ── Lifecycle ───────────────────────────────────────────

    async def connect(self):
        """Open a persistent connection to the MCP server."""
        if self._session:
            return

        params = self.server_params()
        self._client_cm = stdio_client(params)
        self._read, self._write = await self._client_cm.__aenter__()

        self._session_cm = ClientSession(self._read, self._write)
        self._session = await self._session_cm.__aenter__()
        await self._session.initialize()

        logger.info(f"[{self.name}] Connected")

    async def disconnect(self):
        """Close the connection."""
        if self._session_cm:
            await self._session_cm.__aexit__(None, None, None)
        if self._client_cm:
            await self._client_cm.__aexit__(None, None, None)
        self._session = None
        logger.info(f"[{self.name}] Disconnected")

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *exc):
        await self.disconnect()

    # ── Core call ───────────────────────────────────────────

    async def _call_tool(self, tool: str, params: dict[str, Any]) -> Any:
        """Call an MCP tool, filtering out None values."""
        if not self._session:
            raise RuntimeError(f"[{self.name}] Not connected. Use 'async with' or call connect() first.")

        clean_params = {k: v for k, v in params.items() if v is not None}
        logger.debug(f"[{self.name}] {tool}({clean_params})")

        result = await self._session.call_tool(tool, clean_params)
        return result

    async def list_tools(self) -> list[dict]:
        """Discover all tools this MCP server exposes."""
        if not self._session:
            raise RuntimeError(f"[{self.name}] Not connected.")

        tools = await self._session.list_tools()
        return [
            {"name": t.name, "description": t.description, "schema": t.inputSchema}
            for t in tools.tools
        ]
