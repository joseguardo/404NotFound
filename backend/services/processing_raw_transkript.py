"""
Text Extraction Module - First stage of the transcript processing pipeline.

This module extracts raw text from uploaded documents (.txt, .pdf, .docx).
"""

from pathlib import Path
from typing import Optional, Callable
import time
import re

from backend.database.models import ExtractedText, ExtractionError, UnsupportedFormatError


class TextExtractor:
    """
    Orchestrates text extraction from various document formats.

    Automatically dispatches to the appropriate extraction method based on file type.
    """

    SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc"}

    def __init__(self):
        # Map extensions to their extraction methods
        self._extractors: dict[str, Callable[[Path], str | tuple[str, int]]] = {
            ".txt": self._extract_txt,
            ".pdf": self._extract_pdf,
            ".docx": self._extract_docx,
            ".doc": self._extract_doc,
        }

    # ─── Public Methods ─────────────────────────────────────────────────────

    def extract(self, file_path: Path) -> ExtractedText:
        """
        Extract text from a document file.

        Args:
            file_path: Path to the document file

        Returns:
            ExtractedText with content and metadata

        Raises:
            FileNotFoundError: If file doesn't exist
            UnsupportedFormatError: If file type is not supported
            ExtractionError: If extraction fails
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        start_time = time.time()
        extension = file_path.suffix.lower()
        page_count = None

        # Get the appropriate extractor
        extractor = self._extractors.get(extension)
        if not extractor:
            raise UnsupportedFormatError(
                f"Unsupported file format: {extension}. "
                f"Supported: {', '.join(self.SUPPORTED_EXTENSIONS)}"
            )

        # Extract content
        result = extractor(file_path)

        # Handle PDF which returns (content, page_count)
        if isinstance(result, tuple):
            content, page_count = result
        else:
            content = result

        # Clean the extracted text
        content = self._clean_text(content)

        extraction_time = time.time() - start_time

        return ExtractedText(
            content=content,
            source_file=file_path.name,
            file_type=extension,
            page_count=page_count,
            word_count=self._count_words(content),
            extraction_time=round(extraction_time, 3),
        )

    def extract_batch(
        self, directory: Path, extensions: Optional[list[str]] = None
    ) -> list[ExtractedText]:
        """
        Extract text from all supported files in a directory.

        Args:
            directory: Path to directory containing files
            extensions: Optional list of extensions to process

        Returns:
            List of ExtractedText results
        """
        directory = Path(directory)

        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")

        supported = set(extensions) if extensions else self.SUPPORTED_EXTENSIONS
        results = []

        for file_path in directory.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported:
                try:
                    result = self.extract(file_path)
                    results.append(result)
                except (ExtractionError, UnsupportedFormatError) as e:
                    print(f"Warning: Failed to extract {file_path.name}: {e}")

        return results

    # ─── Private Extraction Methods ─────────────────────────────────────────

    def _extract_txt(self, file_path: Path) -> str:
        """Extract text from a .txt file with encoding detection."""
        # Try UTF-8 first
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            pass

        # Try with chardet
        try:
            import chardet

            with open(file_path, "rb") as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                encoding = detected.get("encoding", "utf-8")

            with open(file_path, "r", encoding=encoding, errors="replace") as f:
                return f.read()
        except ImportError:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()

    def _extract_pdf(self, file_path: Path) -> tuple[str, int]:
        """Extract text from a .pdf file using pdfplumber."""
        try:
            import pdfplumber
        except ImportError:
            raise ExtractionError(
                "pdfplumber is not installed. Run: pip install pdfplumber"
            )

        text_parts = []
        page_count = 0

        try:
            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
        except Exception as e:
            raise ExtractionError(f"Failed to extract PDF: {str(e)}")

        return "\n\n".join(text_parts), page_count

    def _extract_docx(self, file_path: Path) -> str:
        """Extract text from a .docx file using python-docx."""
        try:
            from docx import Document
        except ImportError:
            raise ExtractionError(
                "python-docx is not installed. Run: pip install python-docx"
            )

        try:
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs]
            return "\n\n".join(paragraphs)
        except Exception as e:
            raise ExtractionError(f"Failed to extract DOCX: {str(e)}")

    def _extract_doc(self, file_path: Path) -> str:
        """Extract text from a .doc file using antiword."""
        import subprocess

        try:
            result = subprocess.run(
                ["antiword", str(file_path)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                return result.stdout
            else:
                raise ExtractionError(f"antiword failed: {result.stderr}")
        except FileNotFoundError:
            raise ExtractionError(
                "Cannot extract .doc files. Install 'antiword' or convert to .docx"
            )
        except subprocess.TimeoutExpired:
            raise ExtractionError("Extraction timed out")

    # ─── Private Helper Methods ─────────────────────────────────────────────

    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize extracted text."""
        # Replace multiple spaces with single space
        text = re.sub(r"[ \t]+", " ", text)
        # Replace excessive newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Strip whitespace from each line
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)
        return text.strip()

    @staticmethod
    def _count_words(text: str) -> int:
        """Count words in text."""
        return len(text.split())


# ─── Convenience Functions ──────────────────────────────────────────────────

# Default extractor instance
_default_extractor = TextExtractor()


def extract_text(file_path: Path) -> ExtractedText:
    """Convenience function using default extractor."""
    return _default_extractor.extract(file_path)


def extract_from_directory(
    directory: Path, extensions: Optional[list[str]] = None
) -> list[ExtractedText]:
    """Convenience function using default extractor."""
    return _default_extractor.extract_batch(directory, extensions)


# ─── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python processing_raw_transkript.py <file_path>")
        print("Supported formats: .txt, .pdf, .docx, .doc")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    extractor = TextExtractor()

    try:
        result = extractor.extract(file_path)
        print(f"File: {result.source_file}")
        print(f"Type: {result.file_type}")
        print(f"Words: {result.word_count}")
        if result.page_count:
            print(f"Pages: {result.page_count}")
        print(f"Time: {result.extraction_time}s")
        print("-" * 40)
        print(result.content[:500] + "..." if len(result.content) > 500 else result.content)
    except (FileNotFoundError, UnsupportedFormatError, ExtractionError) as e:
        print(f"Error: {e}")
        sys.exit(1)
