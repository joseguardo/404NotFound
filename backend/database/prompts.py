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
   - A copy paste of the information related to that topic
   - Make sure to name everyone involved in the topic, and their role in it
5. Consolidate related discussions into single topics when appropriate

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

    return f"""{context}\n\n Please analyze the following meeting transcript and identify all main projects, initiatives, and discussion topics.

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


# Project Matching Prompts

PROJECT_MATCHING_SYSTEM_PROMPT = """You are an expert at matching meeting discussion topics to existing company projects.

Given a topic name from a meeting transcript and a list of existing projects, determine if the topic refers to an existing project.

Decision criteria:
1. Match if the topic clearly refers to the same project (even with different wording)
2. Match if the topic is a sub-task or update about an existing project
3. Do NOT match if the topic is genuinely new/unrelated
4. Be conservative: only match when confident

Output your decision with:
- is_existing_project: true if matches an existing project, false otherwise
- matched_project_name: exact name from existing projects list (only if matched)
- confidence: 0.0 to 1.0 indicating your confidence in the decision"""


def get_project_matching_user_prompt(
    topic_name: str, topic_info: str, existing_projects: list[str]
) -> str:
    """
    Generate the user prompt for project matching.

    Args:
        topic_name: Name of the topic to match
        topic_info: Information about the topic
        existing_projects: List of existing project names

    Returns:
        Formatted user prompt string
    """
    if existing_projects:
        projects_list = "\n".join(f"- {p}" for p in existing_projects)
    else:
        projects_list = "(No existing projects)"

    return f"""Topic from transcript:
Name: {topic_name}
Information: {topic_info}

Existing projects in the company:
{projects_list}

Does this topic refer to any of the existing projects above? If there are no existing projects, this is automatically a new project."""
