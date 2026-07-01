from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SourceFile:
    path: str
    category: str
    source_type: str


@dataclass
class NormalizedDocument:
    doc_id: str
    category: str
    source_path: str
    source_type: str
    locator: str
    title: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchHit:
    chunk: DocumentChunk
    score: float
