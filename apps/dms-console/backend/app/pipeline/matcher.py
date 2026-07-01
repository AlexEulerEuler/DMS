"""Step 4: match document chunks against the existing master list (runtime.md §3).

`Matcher` is a Protocol so the heuristic default can later be swapped for an
LLM/embedding matcher without touching the pipeline. The default uses token
Jaccard similarity with a substring boost — deterministic and dependency-free.
"""

import re
from dataclasses import dataclass
from typing import Protocol


def tokenize(text: str) -> set[str]:
    return {t for t in re.split(r"[^0-9a-z가-힣]+", text.lower()) if t}


def similarity(a: str, b: str) -> float:
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    jaccard = inter / union if union else 0.0
    # Substring boost: one label fully containing the other is a strong signal.
    la, lb = a.lower().strip(), b.lower().strip()
    boost = 0.3 if (la and lb and (la in lb or lb in la)) else 0.0
    return min(1.0, jaccard + boost)


@dataclass
class MatchResult:
    chunk: str
    matched_title: str | None
    score: float


class Matcher(Protocol):
    def match(self, chunks: list[str], existing: list[str]) -> list[MatchResult]: ...


class HeuristicMatcher:
    def __init__(self, threshold: float = 0.5) -> None:
        self.threshold = threshold

    def match(self, chunks: list[str], existing: list[str]) -> list[MatchResult]:
        results: list[MatchResult] = []
        for chunk in chunks:
            best_title: str | None = None
            best_score = 0.0
            for item in existing:
                score = similarity(chunk, item)
                if score > best_score:
                    best_score = score
                    best_title = item
            if best_score >= self.threshold:
                results.append(MatchResult(chunk=chunk, matched_title=best_title, score=round(best_score, 3)))
            else:
                results.append(MatchResult(chunk=chunk, matched_title=None, score=round(best_score, 3)))
        return results
