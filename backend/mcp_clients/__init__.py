"""MCP Clients — typed wrappers for multiple MCP servers."""

from .base import BaseMCPClient
from .linear import LinearMCP
from .registry import MCPRegistry

__all__ = [
    "BaseMCPClient",
    "LinearMCP",
    # "EmailMCP",
    "MCPRegistry",
]
