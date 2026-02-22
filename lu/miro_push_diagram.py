
"""
miro_push_mermaid.py

1) Reads linked_actions.json (action_items with depends_on)
2) Generates Mermaid flowchart
3) Pushes Mermaid code to a Miro board as a Text item

Then in Miro:
- Open Mermaid diagrams app
- Copy/paste the code from the created text item into the Mermaid editor to render

Env vars:
  MIRO_TOKEN    - OAuth token / personal token
  MIRO_BOARD_ID - target board id

Usage:
  python miro_push_mermaid.py --in data/linked_actions.json --project "Hackathon Bracelets"
  python miro_push_mermaid.py --in data/linked_actions.json --project "Hackathon Bracelets" --x 0 --y 0
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_project(actions: List[dict], project: Optional[str]) -> List[dict]:
    if not project:
        return actions
    out = []
    for a in actions:
        proj = (a.get("attributes") or {}).get("project")
        if proj == project:
            out.append(a)
    return out


def build_edges(actions: List[dict]) -> Tuple[Set[int], List[Tuple[int, int]]]:
    ids = {int(a["id"]) for a in actions}
    edges: List[Tuple[int, int]] = []
    for a in actions:
        to_id = int(a["id"])
        for dep in (a.get("depends_on") or []):
            dep_id = int(dep)
            if dep_id in ids and to_id in ids and dep_id != to_id:
                edges.append((dep_id, to_id))
    edges = sorted(set(edges))
    return ids, edges


def label_for(action: dict) -> str:
    attrs = action.get("attributes") or {}
    content = attrs.get("content") or ""
    people = attrs.get("relevant_people") or []
    who = f" — {people[0]}" if people else ""
    safe = (content + who).replace('"', '\\"')
    return safe if safe.strip() else f"Action {action.get('id')}"


def render_mermaid(actions: List[dict]) -> str:
    nodes, edges = build_edges(actions)
    by_id = {int(a["id"]): a for a in actions}

    lines: List[str] = []
    lines.append("flowchart LR")

    for nid in sorted(nodes):
        a = by_id[nid]
        lines.append(f'  T{nid}["{nid}: {label_for(a)}"]')

    for u, v in edges:
        lines.append(f"  T{u} --> T{v}")

    return "\n".join(lines)


def create_miro_text_item(
    token: str,
    board_id: str,
    text: str,
    x: float = 0.0,
    y: float = 0.0,
    width: float = 800.0,
) -> dict:
    url = f"https://api.miro.com/v2/boards/{board_id}/texts"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    payload = {
        "data": {
            # Miro text items support rich text; Mermaid code is easiest as plain.
            "content": text
        },
        "position": {
            "x": x,
            "y": y,
            "origin": "center",
        },
        "style": {
            "width": width
        },
    }

    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", required=True, help="Path to linked_actions.json")
    ap.add_argument("--project", default=None, help="Only one project (exact match)")
    ap.add_argument("--x", type=float, default=0.0, help="X position on board")
    ap.add_argument("--y", type=float, default=0.0, help="Y position on board")
    ap.add_argument("--width", type=float, default=800.0, help="Text item width")
    args = ap.parse_args()

    token = os.environ.get("MIRO_TOKEN")
    board_id = os.environ.get("MIRO_BOARD_ID")
    if not token or not board_id:
        raise SystemExit("Set MIRO_TOKEN and MIRO_BOARD_ID environment variables.")

    actions = load_json(args.in_path)
    actions = get_project(actions, args.project)
    if not actions:
        raise SystemExit("No actions found (check --project name).")

    mermaid = render_mermaid(actions)
    mermaid_block = f"```mermaid\n{mermaid}\n```"

    created = create_miro_text_item(
        token=token,
        board_id=board_id,
        text=mermaid_block,
        x=args.x,
        y=args.y,
        width=args.width,
    )

    # API returns the created item; show a minimal confirmation:
    item_id = created.get("id")
    print(f"Created Miro text item with Mermaid code. item_id={item_id}")


if __name__ == "__main__":
    main()