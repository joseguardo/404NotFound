# link_dependencies.py
"""
Project-scoped dependency linker for action_items.

Reads:
  - data/actions.json            (list of action items)
  - data/project_buckets.json    ({project_name: [ids...]})

Writes:
  - data/linked_actions.json     (same as actions.json but depends_on filled)

LLM strategy:
  - For each project, send ONLY that project's actions to the model.
  - Model returns edges (from_id -> to_id) with evidence + confidence.
  - We apply edges to depends_on, then validate DAG.
  - If cycles exist, we drop lowest-confidence edges until DAG.

Usage:
  export OPENAI_API_KEY="..."
  python actionLink.py --actions data/actions.json --buckets data/project_buckets.json --out data/linked_actions.json
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Literal, Tuple, Set

from openai import OpenAI
from pydantic import BaseModel, Field, field_validator


# -----------------------------
# Models (Pydantic)
# -----------------------------

Reason = Literal[
    "explicit_prerequisite_language",
    "information_handoff",
    "approval_gate",
    "vendor_or_resource_gate",
    "other",
]


class Edge(BaseModel):
    from_id: int = Field(..., description="Prerequisite action id")
    to_id: int = Field(..., description="Blocked action id")
    reason: Reason
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: str = Field(..., description="Verbatim quote copied exactly from extraction_text or transcript slice")

    @field_validator("evidence")
    @classmethod
    def evidence_must_be_nonempty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("evidence must be non-empty")
        return v


class DependsOnUpdate(BaseModel):
    id: int
    depends_on: List[int]


class ProjectLinkingResult(BaseModel):
    project: str
    edges: List[Edge]
    depends_on_updates: List[DependsOnUpdate]


# -----------------------------
# Prompt
# -----------------------------

SYSTEM_PROMPT = """You are a project dependency linker.

You will be given ONE project name and a list of action_items in that project.
Your job is to infer a minimal set of blocking dependencies between action ids.

Edge semantics:
- Add an edge A -> B ONLY if B is blocked without A (A is a true prerequisite).
- Do NOT create edges just because actions share topic, meeting, people, or earlier date.
- Prefer explicit cues in text such as: "after", "once", "until", "needs", "requires", "blocked by", "depends on".

Evidence requirement:
- For every edge, include evidence as a verbatim quote copied EXACTLY from the provided action_items' extraction_text
  (or transcript_slice if provided).
- If there is no strong textual support, DO NOT add the edge.

Output requirements:
- Return only structured data that matches the provided schema.
- Use only ids that appear in the input.
- The result must form a DAG (no cycles). If unsure, omit edges to avoid cycles.
- Confidence should reflect how explicitly the dependency is stated (1.0 = explicitly stated).
"""


# -----------------------------
# Graph utilities
# -----------------------------

def build_adj(edges: List[Tuple[int, int]], nodes: Set[int]) -> Dict[int, List[int]]:
    adj = {n: [] for n in nodes}
    for u, v in edges:
        adj.setdefault(u, []).append(v)
        adj.setdefault(v, [])
    return adj


def has_cycle(nodes: Set[int], edges: List[Tuple[int, int]]) -> bool:
    adj = build_adj(edges, nodes)
    state: Dict[int, int] = {n: 0 for n in nodes}  # 0=unvisited,1=visiting,2=done

    def dfs(u: int) -> bool:
        state[u] = 1
        for v in adj.get(u, []):
            if state[v] == 1:
                return True
            if state[v] == 0 and dfs(v):
                return True
        state[u] = 2
        return False

    for n in nodes:
        if state[n] == 0 and dfs(n):
            return True
    return False


def drop_edges_to_break_cycles(
    nodes: Set[int],
    edges_with_scores: List[Tuple[int, int, float]],
) -> List[Tuple[int, int, float]]:
    """
    Greedy cycle breaker:
      - while cycle exists, drop the lowest-confidence edge.
    """
    kept = edges_with_scores[:]
    kept.sort(key=lambda x: x[2])  # ascending confidence (drop low first)

    # We'll iteratively remove from the front if cycle remains
    while True:
        edges = [(u, v) for (u, v, _) in kept]
        if not has_cycle(nodes, edges):
            return kept
        if not kept:
            return kept
        kept.pop(0)


def topo_sort(nodes: Set[int], edges: List[Tuple[int, int]]) -> List[int]:
    """
    Kahn's algorithm. Returns one valid topological ordering (if DAG).
    """
    indeg = {n: 0 for n in nodes}
    adj = {n: [] for n in nodes}
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1

    queue = [n for n in nodes if indeg[n] == 0]
    out: List[int] = []
    while queue:
        u = queue.pop(0)
        out.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    # If not all nodes were output, there was a cycle (shouldn't happen after validation)
    return out


# -----------------------------
# Core logic
# -----------------------------

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def index_actions_by_id(actions: List[dict]) -> Dict[int, dict]:
    idx = {}
    for a in actions:
        if "id" not in a:
            raise ValueError("Each action must have an 'id'")
        idx[int(a["id"])] = a
    return idx


def normalize_action_for_prompt(a: dict) -> dict:
    attrs = a.get("attributes", {})
    return {
        "id": int(a["id"]),
        "extraction_text": a.get("extraction_text", ""),
        "content": attrs.get("content", ""),
        "people": attrs.get("relevant_people", []),
        "timeframe": attrs.get("timeframe", None),
        "department": attrs.get("department", None),
        "project": attrs.get("project", None),
    }


def call_linker_llm(
    client: OpenAI,
    model: str,
    project: str,
    actions_subset: List[dict],
    transcript_slice: Optional[str] = None,
) -> ProjectLinkingResult:
    payload = {
        "project": project,
        "action_items": [normalize_action_for_prompt(a) for a in actions_subset],
        "transcript_slice": transcript_slice,
    }

    resp = client.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
        text_format=ProjectLinkingResult,
    )
    return resp.output_parsed


def apply_dep_updates(actions_by_id: Dict[int, dict], updates: List[DependsOnUpdate]) -> None:
    for upd in updates:
        if upd.id not in actions_by_id:
            continue
        actions_by_id[upd.id]["depends_on"] = list(sorted(set(int(x) for x in upd.depends_on)))


def apply_edges(actions_by_id: Dict[int, dict], edges: List[Edge]) -> None:
    """
    Adds edges onto existing depends_on lists (union).
    """
    for e in edges:
        if e.to_id not in actions_by_id:
            continue
        cur = actions_by_id[e.to_id].get("depends_on", [])
        cur_set = set(int(x) for x in cur)
        cur_set.add(int(e.from_id))
        actions_by_id[e.to_id]["depends_on"] = sorted(cur_set)


def filter_edges_to_project_ids(edges: List[Edge], project_ids: Set[int]) -> List[Edge]:
    out = []
    for e in edges:
        if e.from_id in project_ids and e.to_id in project_ids and e.from_id != e.to_id:
            out.append(e)
    return out


def build_edges_from_depends_on(actions_subset: List[dict]) -> List[Tuple[int, int]]:
    """
    Convert depends_on lists into edge tuples (dep -> id).
    """
    edges: List[Tuple[int, int]] = []
    for a in actions_subset:
        to_id = int(a["id"])
        for dep in a.get("depends_on", []) or []:
            edges.append((int(dep), to_id))
    return edges


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--actions", default="data/actions.json")
    parser.add_argument("--buckets", default="data/project_buckets.json")
    parser.add_argument("--out", default="data/linked_actions.json")
    parser.add_argument("--model", default="gpt-4o-2024-08-06")
    parser.add_argument("--transcript_slice", default=None, help="Optional path to a transcript slice txt file")
    args = parser.parse_args()

    if "OPENAI_API_KEY" not in os.environ:
        raise EnvironmentError("Set OPENAI_API_KEY in your environment (do not hardcode keys).")

    client = OpenAI()

    actions = load_json(args.actions)
    buckets = load_json(args.buckets)
    actions_by_id = index_actions_by_id(actions)

    transcript_slice_text = None
    if args.transcript_slice:
        with open(args.transcript_slice, "r", encoding="utf-8") as f:
            transcript_slice_text = f.read()

    # Process each project independently
    for project_name, id_list in buckets.items():
        project_ids = {int(x) for x in id_list}
        actions_subset = [actions_by_id[i] for i in id_list if int(i) in actions_by_id]

        if not actions_subset:
            continue

        result = call_linker_llm(
            client=client,
            model=args.model,
            project=project_name,
            actions_subset=actions_subset,
            transcript_slice=transcript_slice_text,
        )

        # Keep only edges using ids from this project
        edges = filter_edges_to_project_ids(result.edges, project_ids)

        # Apply edges (union into depends_on)
        apply_edges(actions_by_id, edges)

        # Validate DAG; if cycles, drop low-confidence edges for this project
        # We'll rebuild a local edge set from the newly applied depends_on, then (if cycle) remove edges.
        local_actions_after = [actions_by_id[i] for i in project_ids if i in actions_by_id]

        # Build local edges with confidence info from model edges only (not from old data)
        edge_scores: Dict[Tuple[int, int], float] = {}
        for e in edges:
            edge_scores[(e.from_id, e.to_id)] = max(edge_scores.get((e.from_id, e.to_id), 0.0), e.confidence)

        local_edges = build_edges_from_depends_on(local_actions_after)
        local_nodes = set(int(a["id"]) for a in local_actions_after)

        # Only cycle-break using model-proposed edges (we won't delete any pre-existing deps you had before)
        model_edges_with_scores = [(u, v, edge_scores.get((u, v), 0.5)) for (u, v) in local_edges if (u, v) in edge_scores]

        # If cycle exists, drop lowest-confidence model edges until DAG
        if has_cycle(local_nodes, local_edges) and model_edges_with_scores:
            kept = drop_edges_to_break_cycles(local_nodes, model_edges_with_scores)
            kept_set = {(u, v) for (u, v, _) in kept}

            # Remove dropped edges from depends_on for this project
            dropped = {(u, v) for (u, v, _) in model_edges_with_scores} - kept_set
            if dropped:
                for (u, v) in dropped:
                    if v in actions_by_id:
                        deps = set(actions_by_id[v].get("depends_on", []) or [])
                        if u in deps:
                            deps.remove(u)
                            actions_by_id[v]["depends_on"] = sorted(deps)

        # Optional: print a topo order for visibility
        final_local_actions = [actions_by_id[i] for i in project_ids if i in actions_by_id]
        final_edges = build_edges_from_depends_on(final_local_actions)
        if not has_cycle(local_nodes, final_edges):
            order = topo_sort(local_nodes, final_edges)
            print(f"[{project_name}] topo order: {order}")
        else:
            print(f"[{project_name}] WARNING: still has cycles after repair (inspect depends_on).")

    # Write output
    linked_actions = [actions_by_id[k] for k in sorted(actions_by_id.keys())]
    save_json(args.out, linked_actions)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()