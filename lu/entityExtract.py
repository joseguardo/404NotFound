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

Classes to extract:
- action_item: a sentence/clause that indicates an assigned or clearly committed task

Action item attributes:
   - extraction_text: the full sentence/clause that states the action (evidence quote)
   - attributes (typeofaction):
     - action: string (e.g. "draft onboarding email sequence", "check legal review for copy", "ship onboarding v1 in English only")
     - timestamp: string|(e.g. "2026-02-21T15:04:05Z07:00" or "2026-02-21"; null if not specified)
     - content: string         ( paraphrase of the action, imperative verb phrase with 3rd person subject)
     - timeframe: string|null  (e.g. "today", "by next Friday", "in 10 days"; null if none)
     - related_actions: [string] (optional links to other actions by short labels; else [])
     - relevant_people: [string] (names mentioned or implied owner/assignees; else [])
     - department: string|null (if explicitly stated; else null)
     - project: string|null    (if explicitly stated; else null)


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
                    "action": "draft onboarding email sequence",
                    "timestamp": None,
                    "content": "Alice will draft the onboarding email sequence, and chen will check legal review. and both will ship onboarding v1 in English only",
                    "timeframe": "by next Friday",
                    "related_actions": [],
                    "relevant_people": ["Alice"],
                    "department": None,
                    "project": "Onboarding"
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