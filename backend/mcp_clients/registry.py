"""
MCPRegistry — manages multiple MCP clients with shared lifecycle.

Usage:
    async with MCPRegistry() as mcp:
        await mcp.linear.create_issue(team="Eng", title="Bug fix")
        await mcp.email.send(to="bob@co.com", subject="Done", body="Deployed.")

    # or selectively connect only what you need
    async with MCPRegistry(only=["linear"]) as mcp:
        await mcp.linear.list_issues(assignee="me")
"""

import logging
from .base import BaseMCPClient
from .linear import LinearMCP

logger = logging.getLogger(__name__)


# ── Register all MCP clients here ──────────────────────────────

REGISTRY: dict[str, type[BaseMCPClient]] = {
    "linear": LinearMCP,
    # "email": EmailMCP,
    # "slack":    SlackMCP,
    # "notion":   NotionMCP,
    # "calendar": CalendarMCP,
    # "graphiti": GraphitiMCP,
}


class MCPRegistry:
    """
    Connects to multiple MCP servers and exposes them as attributes.

        async with MCPRegistry() as mcp:
            mcp.linear   → LinearMCP (connected)
            mcp.email    → EmailMCP  (connected)

        # only connect specific ones
        async with MCPRegistry(only=["linear"]) as mcp:
            mcp.linear   → LinearMCP (connected)
            mcp.email    → raises AttributeError
    """

    def __init__(self, only: list[str] | None = None):
        self._clients: dict[str, BaseMCPClient] = {}
        names = only or list(REGISTRY.keys())

        for name in names:
            if name not in REGISTRY:
                raise ValueError(f"Unknown MCP: '{name}'. Available: {list(REGISTRY.keys())}")
            self._clients[name] = REGISTRY[name]()

    def __getattr__(self, name: str) -> BaseMCPClient:
        if name.startswith("_"):
            raise AttributeError(name)
        if name in self._clients:
            return self._clients[name]
        raise AttributeError(
            f"MCP '{name}' not loaded. Available: {list(self._clients.keys())}"
        )

    async def connect(self):
        for name, client in self._clients.items():
            try:
                await client.connect()
            except Exception as e:
                logger.error(f"Failed to connect {name}: {e}")
                raise

    async def disconnect(self):
        for name, client in self._clients.items():
            try:
                await client.disconnect()
            except Exception as e:
                logger.warning(f"Error disconnecting {name}: {e}")

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *exc):
        await self.disconnect()

    def list_clients(self) -> list[str]:
        return list(self._clients.keys())

    async def discover_all_tools(self) -> dict[str, list[dict]]:
        """List every tool across all connected MCPs."""
        result = {}
        for name, client in self._clients.items():
            result[name] = await client.list_tools()
        return result
