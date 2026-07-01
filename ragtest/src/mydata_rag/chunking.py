from __future__ import annotations

import hashlib
import re

from .models import DocumentChunk, NormalizedDocument


PARAGRAPH_BREAK = re.compile(r"\n{2,}")


def stable_id(*parts: object) -> str:
    payload = "|".join(str(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]


def chunk_document(
    document: NormalizedDocument,
    max_chars: int = 1200,
    overlap_chars: int = 120,
) -> list[DocumentChunk]:
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    if overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("overlap_chars must be smaller than max_chars")

    paragraphs = [p.strip() for p in PARAGRAPH_BREAK.split(document.text) if p.strip()]
    if not paragraphs:
        paragraphs = [document.text.strip()] if document.text.strip() else []

    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if not current:
            current = paragraph[:max_chars]
            paragraph = paragraph[max_chars:]

        while paragraph:
            remaining = max_chars - len(current) - (1 if current else 0)
            if remaining <= 0:
                chunks.append(current)
                current = current[-overlap_chars:] if overlap_chars else ""
                continue
            current = f"{current}\n{paragraph[:remaining]}".strip()
            paragraph = paragraph[remaining:]

        if len(current) >= max_chars:
            chunks.append(current)
            current = current[-overlap_chars:] if overlap_chars else ""

    if current:
        chunks.append(current)

    result: list[DocumentChunk] = []
    for idx, text in enumerate(chunks):
        metadata = dict(document.metadata)
        metadata.update(
            {
                "category": document.category,
                "source_path": document.source_path,
                "source_type": document.source_type,
                "locator": document.locator,
                "title": document.title,
                "chunk_index": idx,
            }
        )
        result.append(
            DocumentChunk(
                chunk_id=stable_id(document.doc_id, idx, text[:32]),
                doc_id=document.doc_id,
                text=text,
                metadata=metadata,
            )
        )
    return result


def chunk_documents(
    documents: list[NormalizedDocument],
    max_chars: int = 1200,
    overlap_chars: int = 120,
) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for document in documents:
        chunks.extend(chunk_document(document, max_chars, overlap_chars))
    return chunks
