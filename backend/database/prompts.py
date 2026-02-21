"""
Prompt templates for LLM-based text processing.

This module contains professionally-engineered prompts for topic identification
and other NLP tasks in the transcript processing pipeline.
"""

# Topic Identification Prompts

TOPIC_IDENTIFICATION_SYSTEM_PROMPT = """You are an expert business analyst specializing in extracting actionable insights from corporate meeting transcripts.

Your task is to identify and extract the main projects, initiatives, and discussion topics from the provided transcript.

Guidelines:
1. Focus on substantive topics that represent actual projects, initiatives, or key business discussions
2. Ignore small talk, greetings, and procedural meeting elements
3. For each topic, provide:
   - A clear, concise name (2-5 words)
   - A copy paste of the information related to that topic, including:

4. Prioritize topics by their apparent importance and time spent discussing them
5. Consolidate related discussions into single topics when appropriate
6. Extract specific details: dates, deadlines, budget figures, responsible parties when mentioned

Output Format:
Return a structured list of topics. Each topic must have:
- topic_name: Brief, descriptive title
- topic_information: Detailed summary including context, decisions, action items, and relevant specifics"""


def get_topic_identification_user_prompt(transcript: str, company_name: str = None) -> str:
    """
    Generate the user prompt for topic identification.

    Args:
        transcript: The full text of the meeting transcript
        company_name: Optional company name for context

    Returns:
        Formatted user prompt string
    """
    context = ""
    if company_name:
        context = f"Company Context: {company_name}\n\n"

    return f"""{context}Please analyze the following meeting transcript and identify all main projects, initiatives, and discussion topics.

Extract comprehensive information about each topic including:
- What was discussed
- Key decisions made
- Action items or next steps
- People responsible or involved
- Any deadlines or milestones mentioned
- Budget or resource considerations if applicable

---

TRANSCRIPT:

{transcript}

---

Identify and summarize all significant topics from this transcript."""
