import langextract as lx
import textwrap
import json
import re
from datetime import date
import sys
from pathlib import Path

# insert open api key
# in the terminal run:
# python entityExtract.py Transcript_timestamp.txt

# 1. Define the prompt and extraction rules
prompt = textwrap.dedent("""\
Extract meeting participants, action items, decisions, and open questions from the transcript.

Hard rules:
- extraction_text MUST be copied EXACTLY from the transcript (verbatim substring).
- Do NOT overlap extractions unless unavoidable.
- Do NOT invent facts not present in the transcript.
- For action items/decisions/questions, include an evidence quote in extraction_text.
- Put structured fields in attributes.
- assigned_to_department/person should be included only if clearly supported by the transcript.


Classes to extract:
- action_item: a sentence/clause that indicates an assigned or clearly committed task

Action item attributes:
   - extraction_text: the full sentence/clause that states the action (evidence quote)
   - attributes (typeofaction):
    - id: uuid4 string (generate a random UUID v4)
    - meeting_id: int (always provided by caller; if not provided in transcript, still output a number placeholder like 1)
    - project_id: int|null (only if explicitly known; else null)
    - action: string (short action label, lower-case verb phrase, e.g. "draft onboarding email sequence")
    - description: string (paraphrase in 3rd person, imperative meaning; e.g. "Alice drafts the onboarding email sequence.")
    - assigned_to_department: string|null (department name if explicitly stated; else null)
    - assigned_to_person: string|null (single best owner if clear; else null)
    - sequence: string|null (order/sequence identifier if explicitly present like "1.4" or "3.1"; else null)
    - response_type: string (null for now, another agent will fill in later)
    - urgency: string|null (deadline or urgency phrase exactly as stated, e.g. "by next Friday", "today", "in 10 days"; else null)

""")

# 2. Provide a high-quality example to guide the model
examples = [
    lx.data.ExampleData(
        text=textwrap.dedent("""\
            Weekly Sync (Feb 21, 2026 - 10:00am)
            Alice: I can draft the onboarding email sequence by next Friday.
            Bob: Great. Also, Chen, can you check whether legal review is needed for the copy?
            Chen: Decision: let's ship onboarding v1 in English only.
        """).strip(),
        extractions=[
            lx.data.Extraction(
                extraction_class="action_item",
                extraction_text="I can draft the onboarding email sequence by next Friday.",
                attributes={
                    "id": "2d0c2d5e-3bb7-4d1a-9b6f-52d7a2df4f6b",
                    "meeting_id": 1,
                    "project_id": None,
                    "action": "draft onboarding email sequence",
                    "description": "Alice drafts the onboarding email sequence.",
                    "assigned_to_department": None,
                    "assigned_to_person": "Alice",
                    "sequence": None,
                    "response_type": None,
                    "urgency": "by next Friday"
                }
            ),
            lx.data.Extraction(
                extraction_class="action_item",
                extraction_text="Chen, can you check whether legal review is needed for the copy?",
                attributes={
                    "id": "6aa1e27d-85d8-4ab2-9f0f-8b6b3c8c5c4e",
                    "meeting_id": 1,
                    "project_id": None,
                    "action": "check whether legal review is needed",
                    "description": "Chen checks whether legal review is needed for the copy.",
                    "assigned_to_department": None,
                    "assigned_to_person": "Chen",
                    "sequence": None,
                    "response_type": None,
                    "urgency": None
                }
            ),
        ],
    )
]

if len(sys.argv) < 2:
    print("Usage: python entityExtract.py <path_to_transcript.txt>")
    sys.exit(1)

transcript_path = Path(sys.argv[1])

if not transcript_path.exists():
    print(f"File not found: {transcript_path}")
    sys.exit(1)

input_text = transcript_path.read_text(encoding="utf-8")



result = lx.extract(
    text_or_documents=input_text,
    prompt_description=prompt,
    examples=examples,
    model_id="gpt-4o",
    fence_output=True,
    use_schema_constraints=False,
    api_key="PUT THE KEY HERE"
)

# Save the results to a JSONL file
out_stem = transcript_path.stem
jsonl_name = f"{out_stem}_extraction_results.jsonl"
html_name = f"{out_stem}_visualization.html"

lx.io.save_annotated_documents([result], output_name=jsonl_name, output_dir=".")
# Generate the visualization from the file

html_content = lx.visualize(jsonl_name)
with open(html_name, "w", encoding="utf-8") as f:
    f.write(html_content.data if hasattr(html_content, "data") else html_content)

print(f"Wrote {html_name}")