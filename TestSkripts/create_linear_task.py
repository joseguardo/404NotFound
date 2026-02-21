import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

LINEAR_API_KEY = os.getenv("LINEAR_API_KEY")


def get_teams():
    """Get your Linear teams to find the team ID."""
    r = httpx.post(
        "https://api.linear.app/graphql",
        headers={"Authorization": LINEAR_API_KEY},
        json={"query": "{ teams { nodes { id name } } }"},
    )
    return r.json()["data"]["teams"]["nodes"]


def create_issue(team_id: str, title: str, description: str = "", priority: int = 2):
    """Create a Linear issue."""
    r = httpx.post(
        "https://api.linear.app/graphql",
        headers={"Authorization": LINEAR_API_KEY},
        json={
            "query": """
                mutation CreateIssue($input: IssueCreateInput!) {
                    issueCreate(input: $input) {
                        success
                        issue { id identifier title url }
                    }
                }
            """,
            "variables": {
                "input": {
                    "teamId": team_id,
                    "title": title,
                    "description": description,
                    "priority": priority,
                }
            },
        },
    )
    return r.json()["data"]["issueCreate"]["issue"]


if __name__ == "__main__":
    # First, find your team ID
    teams = get_teams()
    for t in teams:
        print(f"Team: {t['name']} → ID: {t['id']}")

    # Then create a test issue (replace team_id)
    if teams:
        issue = create_issue(
            team_id=teams[0]["id"],
            title="Test task from transcript pipeline",
            description="Created by the meeting intelligence system",
        )
        print(f"\nCreated: {issue['identifier']} → {issue['url']}")
