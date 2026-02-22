import os
from mcp.client.stdio import StdioServerParameters
from .base import BaseMCPClient


class LinearMCP(BaseMCPClient):

    @property
    def name(self) -> str:
        return "Linear"

    def server_params(self) -> StdioServerParameters:
        api_key = os.environ["LINEAR_API_KEY"]
        return StdioServerParameters(
            command="npx",
            args=[
                "-y",
                "mcp-remote",
                "https://mcp.linear.app/mcp",
                "--header",
                f"Authorization:Bearer {api_key}",
            ],
            env={"PATH": os.environ.get("PATH", "")},
        )

    # ── Issues ──────────────────────────────────────────────

    async def create_issue(
        self,
        team: str,
        title: str,
        description: str = "",
        priority: int = 3,
        assignee: str | None = None,
        labels: list[str] | None = None,
        project: str | None = None,
        due_date: str | None = None,
    ) -> dict:
        return await self._call_tool("create_issue", {
            "team": team,
            "title": title,
            "description": description,
            "priority": priority,
            "assignee": assignee,
            "labels": labels,
            "project": project,
            "dueDate": due_date,
        })

    async def update_issue(self, issue_id: str, **fields) -> dict:
        return await self._call_tool("update_issue", {"id": issue_id, **fields})

    async def list_issues(
        self,
        team: str | None = None,
        assignee: str | None = None,
        state: str | None = None,
        project: str | None = None,
        limit: int = 50,
    ) -> dict:
        return await self._call_tool("list_issues", {
            "team": team,
            "assignee": assignee,
            "state": state,
            "project": project,
            "limit": limit,
        })

    async def get_issue(self, issue_id: str) -> dict:
        return await self._call_tool("get_issue", {"id": issue_id})

    # ── Comments ────────────────────────────────────────────

    async def add_comment(self, issue_id: str, body: str) -> dict:
        return await self._call_tool("create_comment", {
            "issueId": issue_id,
            "body": body,
        })

    # ── Projects ────────────────────────────────────────────

    async def list_projects(self, team: str | None = None) -> dict:
        return await self._call_tool("list_projects", {"team": team})

    # ── Teams ───────────────────────────────────────────────

    async def list_teams(self) -> dict:
        return await self._call_tool("list_teams", {})
