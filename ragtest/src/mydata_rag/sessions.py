from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class ChatSession:
    session_id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "messages": self.messages,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ChatSession":
        return cls(
            session_id=str(payload["session_id"]),
            title=str(payload.get("title") or "Untitled session"),
            created_at=str(payload.get("created_at") or utc_now()),
            updated_at=str(payload.get("updated_at") or utc_now()),
            messages=list(payload.get("messages") or []),
        )


class SessionStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def list_sessions(self) -> list[dict[str, Any]]:
        sessions: list[ChatSession] = []
        for path in sorted(self.root.glob("*.json")):
            try:
                sessions.append(self.load(path.stem))
            except (OSError, json.JSONDecodeError, KeyError, ValueError):
                continue
        sessions.sort(key=lambda session: session.updated_at, reverse=True)
        return [
            {
                "session_id": session.session_id,
                "title": session.title,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "message_count": len(session.messages),
            }
            for session in sessions
        ]

    def create(self, title: str | None = None) -> ChatSession:
        now = utc_now()
        session = ChatSession(
            session_id=uuid.uuid4().hex,
            title=title or "New analysis",
            created_at=now,
            updated_at=now,
            messages=[],
        )
        self.save(session)
        return session

    def load(self, session_id: str) -> ChatSession:
        path = self._path(session_id)
        if not path.exists():
            raise KeyError(f"Unknown session: {session_id}")
        return ChatSession.from_dict(json.loads(path.read_text(encoding="utf-8")))

    def save(self, session: ChatSession) -> None:
        session.updated_at = utc_now()
        self._path(session.session_id).write_text(
            json.dumps(session.to_dict(), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def append_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> ChatSession:
        session = self.load(session_id)
        message = {
            "message_id": uuid.uuid4().hex,
            "role": role,
            "content": content,
            "created_at": utc_now(),
            "metadata": metadata or {},
        }
        session.messages.append(message)
        if role == "user" and session.title in {"New analysis", "Untitled session"}:
            session.title = make_title(content)
        self.save(session)
        return session

    def _path(self, session_id: str) -> Path:
        if not session_id or any(char in session_id for char in "/\\:"):
            raise ValueError("Invalid session id")
        return self.root / f"{session_id}.json"


def make_title(content: str, max_chars: int = 42) -> str:
    title = " ".join(content.strip().split())
    if not title:
        return "New analysis"
    if len(title) <= max_chars:
        return title
    return title[: max_chars - 3].rstrip() + "..."
