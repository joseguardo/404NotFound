"""
Granola Transcript Converter
============================
Converts Granola transcript data structures to plain text format
suitable for the TranscriptOrchestrator pipeline.
"""

from typing import Union


def convert_granola_transcript(transcript_data: Union[dict, str, list]) -> str:
    """
    Convert Granola transcript structure to plain text.

    Handles multiple possible Granola transcript formats:
    1. Plain string - returned as-is
    2. Dict with "text" key - returns the text value
    3. Dict with "segments" - formats as "Speaker: text" lines
    4. List of segments - formats as "Speaker: text" lines
    5. Any other structure - converts to readable string

    Args:
        transcript_data: Raw transcript data from Granola cache

    Returns:
        Plain text transcript suitable for orchestrator.process_text()
    """
    # Already a string
    if isinstance(transcript_data, str):
        return transcript_data

    # Dict with full text
    if isinstance(transcript_data, dict):
        if "text" in transcript_data:
            return transcript_data["text"]

        # Dict with segments
        if "segments" in transcript_data:
            return _format_segments(transcript_data["segments"])

        # Dict with utterances (alternative format)
        if "utterances" in transcript_data:
            return _format_segments(transcript_data["utterances"])

        # Dict with content (another format)
        if "content" in transcript_data:
            content = transcript_data["content"]
            if isinstance(content, str):
                return content
            return convert_granola_transcript(content)

    # List of segments directly
    if isinstance(transcript_data, list):
        return _format_segments(transcript_data)

    # Fallback: convert to string
    return str(transcript_data)


def _format_segments(segments: list) -> str:
    """
    Format a list of transcript segments into readable text.

    Expected segment format:
    {
        "speaker": "Speaker Name",
        "text": "What they said",
        "start": 0.0,  # optional
        "end": 1.5,    # optional
    }
    """
    lines = []
    current_speaker = None

    for seg in segments:
        if not isinstance(seg, dict):
            # If segment is just a string, add it directly
            if isinstance(seg, str):
                lines.append(seg)
            continue

        speaker = seg.get("speaker", seg.get("name", "Unknown"))
        text = seg.get("text", seg.get("content", ""))

        if not text:
            continue

        # Group consecutive lines from the same speaker
        if speaker == current_speaker:
            lines.append(f"  {text}")
        else:
            lines.append(f"\n{speaker}: {text}")
            current_speaker = speaker

    return "\n".join(lines).strip()
