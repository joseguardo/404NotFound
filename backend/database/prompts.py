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


# Action Extraction Prompts

ACTION_EXTRACTION_SYSTEM_PROMPT = """You are an expert at extracting actionable tasks from meeting notes.

Given project information from a meeting transcript, extract granular actions and assign responsibility.

CRITICAL: Every action MUST have both a department AND an urgency level assigned.

RULES FOR DEPARTMENT ASSIGNMENT:

1. **Named person mentioned**: Use their exact name AND their department.
   Example: "Maria will handle the design" -> people: ["Maria"], department: "Design"

2. **Department explicitly mentioned**: Use that department.
   Example: "Marketing needs to prepare materials" -> people: null, department: "Marketing"

3. **Infer department from action type**: Always determine which department should own the task.
   Example: "Update the website homepage" -> people: null, department: "Engineering"
   Example: "Create social media posts" -> people: null, department: "Marketing"

4. **Multiple people**: Include all names, use their shared department or the lead person's department.
   Example: "Tom and Sarah will coordinate" -> people: ["Tom", "Sarah"], department: "Operations"

RULES FOR URGENCY ASSESSMENT:

Assign urgency based on context clues in the project information:

- **VERY HIGH**: Immediate action required. Look for: "urgent", "ASAP", "critical", "blocking", "emergency", deadlines within 24-48 hours, customer-facing issues
- **HIGH**: Important and time-sensitive. Look for: "priority", "soon", "this week", "important", deadlines within 1 week, dependencies blocking other work
- **MEDIUM**: Standard priority. Normal tasks with reasonable timelines, deadlines within 2-4 weeks, routine work
- **LOW**: Can be scheduled later. Look for: "when possible", "eventually", "nice to have", no specific deadline, improvements/optimizations

Consider:
1. Explicit urgency words in the transcript
2. Mentioned deadlines or timeframes
3. Dependencies (blocking tasks = higher urgency)
4. Business impact implied by context

IMPORTANT:
- EVERY action MUST have a department - no exceptions
- EVERY action MUST have an urgency level - no exceptions
- Only use names that appear in the available people list
- Only use departments from the available departments list
- Extract specific, actionable tasks (not vague goals)"""


def get_action_extraction_user_prompt(
    project_name: str, topic_info: str, people_by_department: dict[str, list[str]]
) -> str:
    """
    Generate the user prompt for action extraction.

    Args:
        project_name: Name of the project
        topic_info: Information about the topic/project
        people_by_department: Dictionary mapping department names to list of people names

    Returns:
        Formatted user prompt string
    """
    # Format available people by department
    people_section = ""
    for dept, names in people_by_department.items():
        people_section += f"\n{dept}:\n"
        for name in names:
            people_section += f"  - {name}\n"

    if not people_section:
        people_section = "(No people available)"

    return f"""Project: {project_name}

Topic Information:
{topic_info}

Available People by Department:
{people_section}

---

EXAMPLES:

Example 1 - Person named with deadline (HIGH urgency):
Topic: "Lisa mentioned she will create the wireframes by Friday"
-> Action: description="Create wireframes by Friday", people=["Lisa"], department="Design", urgency="HIGH"

Example 2 - Department mentioned, standard task (MEDIUM urgency):
Topic: "The sales team should follow up with the client"
-> Action: description="Follow up with the client", people=null, department="Sales", urgency="MEDIUM"

Example 3 - Critical bug (VERY HIGH urgency):
Topic: "We need to fix the login bug ASAP, customers are complaining"
-> Action: description="Fix the login bug", people=null, department="Engineering", urgency="VERY HIGH"

Example 4 - General task, no deadline (LOW urgency):
Topic: "Someone should book the conference room when possible"
-> Action: description="Book the conference room", people=null, department="Operations", urgency="LOW"

Example 5 - Multiple people, important meeting (HIGH urgency):
Topic: "Alex and Jordan will present at the client meeting next week"
-> Action: description="Prepare and present at client meeting", people=["Alex", "Jordan"], department="Sales", urgency="HIGH"

---

Now extract all actions from the topic information above. For each action, determine department AND urgency following the rules and examples."""


# Dependency Linking Prompts

DEPENDENCY_LINKING_SYSTEM_PROMPT = """You are a project dependency analyzer.

Given a project and its list of actions (with indices), identify blocking dependencies between actions.

RULES:
1. Add edge A -> B ONLY if action B cannot start until action A is complete
2. Look for explicit cues: "after", "once", "until", "needs", "requires", "blocked by"
3. Consider logical sequences (design before build, approval before execution)
4. DO NOT create edges just because actions share people or department
5. Minimize edges - only true prerequisites
6. The result must form a DAG (no cycles). If unsure, omit the edge.

For each edge, provide:
- from_idx: index of the prerequisite action (0-based)
- to_idx: index of the blocked action (0-based)
- reason: why this is a dependency (one of: explicit_prerequisite, information_handoff, approval_gate, resource_dependency, logical_sequence)
- confidence: 0.0-1.0 (1.0 = explicitly stated in the action description)
- evidence: quote from the action descriptions that supports this dependency

IMPORTANT:
- Only identify TRUE blocking dependencies
- Do not create circular dependencies
- When in doubt, omit the edge"""


def get_dependency_linking_user_prompt(project_name: str, actions: list[dict]) -> str:
    """
    Generate the user prompt for dependency linking.

    Args:
        project_name: Name of the project
        actions: List of action dictionaries with description, department, urgency

    Returns:
        Formatted user prompt string
    """
    # Format actions with indices
    actions_section = ""
    for i, action in enumerate(actions):
        actions_section += f"\n[{i}] {action['description']}"
        actions_section += f"\n    Department: {action['department']}"
        actions_section += f"\n    Urgency: {action['urgency']}"
        if action.get('people'):
            actions_section += f"\n    People: {', '.join(action['people'])}"
        actions_section += "\n"

    return f"""Project: {project_name}

Actions (with indices):
{actions_section}
---

EXAMPLES:

Example 1 - Explicit prerequisite:
[0] Create wireframes for homepage
[1] Review wireframes with stakeholders
-> Edge: from_idx=0, to_idx=1, reason="explicit_prerequisite", confidence=0.95, evidence="Review wireframes requires wireframes to exist"

Example 2 - Information handoff:
[0] Gather requirements from client
[1] Write technical specification
-> Edge: from_idx=0, to_idx=1, reason="information_handoff", confidence=0.9, evidence="Specification needs requirements as input"

Example 3 - Approval gate:
[0] Submit budget proposal
[1] Purchase new equipment
-> Edge: from_idx=0, to_idx=1, reason="approval_gate", confidence=0.85, evidence="Purchase requires budget approval"

Example 4 - NO dependency (same department doesn't mean dependency):
[0] Fix login bug
[1] Implement password reset
-> No edge - these are independent tasks that can be done in parallel

---

Analyze the actions above and identify all blocking dependencies. Return only edges where action B truly cannot start until action A completes."""
