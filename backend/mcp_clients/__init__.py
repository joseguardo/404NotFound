"""MCP Clients — typed wrappers for multiple MCP servers."""

from .base import BaseMCPClient
from .linear import LinearMCP
from .miro import MiroMCP
from .registry import MCPRegistry

__all__ = [
    "BaseMCPClient",
    "LinearMCP",
    "MiroMCP",
    # "EmailMCP",
    "MCPRegistry",
]
