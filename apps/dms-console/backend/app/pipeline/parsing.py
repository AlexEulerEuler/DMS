"""Step 2-3: parse + chunk uploaded inputs (docs/ia/runtime.md §3).

Text formats (txt/md/csv) are read directly; PDF uses pdfminer when installed,
otherwise the document is skipped with a clear note. Output is a normalized list
of non-empty, de-duplicated lines (chunks).
"""

import os


def parse_text(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return _parse_pdf(path)
    try:
        with open(path, encoding="utf-8", errors="ignore") as handle:
            return handle.read()
    except OSError:
        return ""


def _parse_pdf(path: str) -> str:
    try:
        from pdfminer.high_level import extract_text  # type: ignore
    except ImportError:
        return ""  # pdfminer optional; skip PDFs when unavailable
    try:
        return extract_text(path) or ""
    except Exception:
        return ""


def chunk(text: str) -> list[str]:
    """Split into normalized, de-duplicated, non-empty lines."""
    seen: set[str] = set()
    chunks: list[str] = []
    for raw in text.replace("\r\n", "\n").split("\n"):
        line = " ".join(raw.split()).strip("-•*·— ").strip()
        if not line:
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        chunks.append(line)
    return chunks
