"""Create a Linear task via MCP."""

import asyncio
from dotenv import load_dotenv
from mcp_clients.linear import LinearMCP

load_dotenv()


async def main():
    async with LinearMCP() as linear:
        result = await linear.create_issue(
            team="Ls2107",
            title="Fix staging migration",
            description="Postgres 16 migration failing on staging\n\n- [ ] Check RDS\n- [ ] Rerun scripts",
            priority=2,
        )
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
