"""
Project Identification Module - LLM-based topic extraction from transcripts.

This module uses OpenAI's API with structured output to identify and extract
main projects/topics from meeting transcripts.
"""

from typing import Optional
from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend.database.models import TopicList
from backend.database.prompts import (
    TOPIC_IDENTIFICATION_SYSTEM_PROMPT,
    get_topic_identification_user_prompt,
)


class ProjectIdentification:
    """
    Identifies projects and topics from meeting transcripts using LLM.

    Uses OpenAI's structured output parsing to extract topics into
    a validated Pydantic model.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """
        Initialize the ProjectIdentification service.

        Args:
            api_key: OpenAI API key. Defaults to OPENAI_API_KEY from config.
            model: OpenAI model to use. Defaults to gpt-4o-mini.
        """
        self.api_key = api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in .env")

        self.model = model
        self.client = OpenAI(api_key=self.api_key)

    def identify_topics(
        self, transcript: str, company_name: Optional[str] = None
    ) -> TopicList:
        """
        Identify topics/projects from a meeting transcript.

        Args:
            transcript: The full text of the meeting transcript
            company_name: Optional company name for additional context

        Returns:
            TopicList containing all identified topics

        Raises:
            ValueError: If transcript is empty
            OpenAIError: If API call fails
        """
        if not transcript or not transcript.strip():
            raise ValueError("Transcript cannot be empty")

        user_prompt = get_topic_identification_user_prompt(transcript, company_name)

        response = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": TOPIC_IDENTIFICATION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=TopicList,
        )

        return response.choices[0].message.parsed

    def identify_topics_from_file(
        self, file_path: str, company_name: Optional[str] = None
    ) -> TopicList:
        """
        Identify topics from a transcript file.

        Args:
            file_path: Path to the transcript file
            company_name: Optional company name for context

        Returns:
            TopicList containing all identified topics
        """
        from pathlib import Path
        from backend.services.processing_raw_transkript import extract_text

        extracted = extract_text(Path(file_path))
        return self.identify_topics(extracted.content, company_name)



_default_identifier: Optional[ProjectIdentification] = None


def get_identifier() -> ProjectIdentification:
    """Get or create the default ProjectIdentification instance."""
    global _default_identifier
    if _default_identifier is None:
        _default_identifier = ProjectIdentification()
    return _default_identifier


def identify_topics(transcript: str, company_name: Optional[str] = None) -> TopicList:
    """Convenience function using default identifier."""
    return get_identifier().identify_topics(transcript, company_name)



if __name__ == "__main__":
    from pathlib import Path

    # Test with mock transcript
    test_file = Path(__file__).parent.parent.parent / "MockTranskripts" / "Transkript_1.txt"

    print(f"Processing: {test_file}\n")

    identifier = ProjectIdentification()
    result = identifier.identify_topics_from_file(str(test_file))

    print(f"Found {len(result.topics)} topic(s):\n")
    for i, topic in enumerate(result.topics, 1):
        print(f"{i}. {topic.topic_name}")
        print(f"   {topic.topic_information}\n")
