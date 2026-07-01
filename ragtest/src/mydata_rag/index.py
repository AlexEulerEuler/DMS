from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

from .models import DocumentChunk, SearchHit


TOKEN_RE = re.compile(r"[A-Za-z0-9_]+|[가-힣]+")


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


class KeywordIndex:
    def __init__(self, chunks: list[DocumentChunk]) -> None:
        self.chunks = chunks
        self.term_frequency: list[Counter[str]] = [Counter(tokenize(c.text)) for c in chunks]
        self.document_frequency: Counter[str] = Counter()
        for frequencies in self.term_frequency:
            self.document_frequency.update(frequencies.keys())

    def search(
        self,
        query: str,
        top_k: int = 5,
        category: str | None = None,
    ) -> list[SearchHit]:
        query_terms = tokenize(query)
        if not query_terms:
            return []

        scores: dict[int, float] = defaultdict(float)
        total_docs = max(len(self.chunks), 1)
        for term in query_terms:
            df = self.document_frequency.get(term, 0)
            if df == 0:
                continue
            idf = math.log((1 + total_docs) / (1 + df)) + 1
            for idx, frequencies in enumerate(self.term_frequency):
                if category and self.chunks[idx].metadata.get("category") != category:
                    continue
                tf = frequencies.get(term, 0)
                if tf:
                    scores[idx] += (1 + math.log(tf)) * idf

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]
        return [SearchHit(chunk=self.chunks[idx], score=score) for idx, score in ranked]

    def save_jsonl(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            for chunk in self.chunks:
                handle.write(
                    json.dumps(
                        {
                            "chunk_id": chunk.chunk_id,
                            "doc_id": chunk.doc_id,
                            "text": chunk.text,
                            "metadata": chunk.metadata,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

    @classmethod
    def load_jsonl(cls, path: Path) -> "KeywordIndex":
        chunks: list[DocumentChunk] = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                payload = json.loads(line)
                chunks.append(
                    DocumentChunk(
                        chunk_id=payload["chunk_id"],
                        doc_id=payload["doc_id"],
                        text=payload["text"],
                        metadata=payload.get("metadata", {}),
                    )
                )
        return cls(chunks)


def format_hits(hits: list[SearchHit]) -> str:
    lines: list[str] = []
    for idx, hit in enumerate(hits, start=1):
        metadata = hit.chunk.metadata
        lines.append(
            "\n".join(
                [
                    f"[{idx}] score={hit.score:.3f}",
                    f"category={metadata.get('category', '')}",
                    f"source={metadata.get('source_path', '')}",
                    f"locator={metadata.get('locator', '')}",
                    hit.chunk.text,
                ]
            )
        )
    return "\n\n".join(lines)
