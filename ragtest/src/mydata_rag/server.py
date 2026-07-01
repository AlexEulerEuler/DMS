from __future__ import annotations

import argparse
import json
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from .cli import load_env_file
from .hub_api import HUB_RECORD_ENDPOINTS, HubApiClient, clean_env_value, hub_payloads_to_documents
from .index import KeywordIndex
from .chunking import chunk_documents
from .sessions import SessionStore
from .upstage import UpstageRagClient


PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = PROJECT_ROOT / "web"
DEFAULT_SESSION_ROOT = PROJECT_ROOT / "data" / "sessions"
DEFAULT_INDEX_PATH = PROJECT_ROOT / "indexes" / "local_keyword_index.jsonl"


class AnalysisServer:
    def __init__(
        self,
        session_root: Path,
        index_path: Path,
        web_root: Path = WEB_ROOT,
        default_top_k: int = 5,
    ) -> None:
        self.session_store = SessionStore(session_root)
        self.index_path = index_path
        self.web_root = web_root
        self.default_top_k = default_top_k

    def make_handler(self) -> type[BaseHTTPRequestHandler]:
        app = self

        class Handler(BaseHTTPRequestHandler):
            server_version = "MyDataRagAnalysis/0.1"

            def do_GET(self) -> None:
                parsed = urlparse(self.path)
                if parsed.path == "/api/sessions":
                    self.send_json({"sessions": app.session_store.list_sessions()})
                    return
                if parsed.path.startswith("/api/sessions/"):
                    session_id = parsed.path.rsplit("/", 1)[-1]
                    self.handle_get_session(session_id)
                    return
                if parsed.path == "/api/config":
                    self.send_json(
                        {
                            "index_path": str(app.index_path),
                            "index_exists": app.index_path.exists(),
                            "upstage_configured": bool(clean_env_value(os.getenv("UPSTAGE_API_KEY"))),
                            "hub_configured": bool(
                                clean_env_value(os.getenv("DSTAT_HUB_ACCESS_TOKEN"))
                                or (
                                    clean_env_value(os.getenv("DSTAT_HUB_CLIENT_ID"))
                                    and clean_env_value(os.getenv("DSTAT_HUB_CLIENT_SECRET"))
                                )
                            ),
                            "hub_patients": parse_patient_seqs(),
                            "default_top_k": app.default_top_k,
                        }
                    )
                    return
                self.serve_static(parsed.path)

            def do_POST(self) -> None:
                parsed = urlparse(self.path)
                if parsed.path == "/api/sessions":
                    payload = self.read_json()
                    session = app.session_store.create(payload.get("title"))
                    self.send_json({"session": session.to_dict()}, status=HTTPStatus.CREATED)
                    return
                if parsed.path == "/api/chat":
                    self.handle_chat()
                    return
                if parsed.path == "/api/hub/build-index":
                    self.handle_build_hub_index()
                    return
                self.send_error_json("not_found", "Unknown endpoint", HTTPStatus.NOT_FOUND)

            def log_message(self, format: str, *args: Any) -> None:
                return

            def handle_get_session(self, session_id: str) -> None:
                try:
                    session = app.session_store.load(session_id)
                except KeyError:
                    self.send_error_json("not_found", "Session not found", HTTPStatus.NOT_FOUND)
                    return
                except ValueError as exc:
                    self.send_error_json("bad_request", str(exc), HTTPStatus.BAD_REQUEST)
                    return
                self.send_json({"session": session.to_dict()})

            def handle_chat(self) -> None:
                payload = self.read_json()
                question = str(payload.get("message") or "").strip()
                if not question:
                    self.send_error_json("bad_request", "message is required", HTTPStatus.BAD_REQUEST)
                    return

                session_id = str(payload.get("session_id") or "")
                if session_id:
                    try:
                        app.session_store.load(session_id)
                    except KeyError:
                        self.send_error_json("not_found", "Session not found", HTTPStatus.NOT_FOUND)
                        return
                else:
                    session_id = app.session_store.create().session_id

                top_k = int(payload.get("top_k") or app.default_top_k)
                category = payload.get("category") or None
                mode = str(payload.get("mode") or "local")

                app.session_store.append_message(session_id, "user", question)
                answer_payload = app.answer(question, top_k=top_k, category=category, mode=mode)
                app.session_store.append_message(
                    session_id,
                    "assistant",
                    answer_payload["answer"],
                    {
                        "mode": mode,
                        "evidence": answer_payload["evidence"],
                        "index_path": str(app.index_path),
                    },
                )
                session = app.session_store.load(session_id)
                self.send_json({"session": session.to_dict(), **answer_payload})

            def handle_build_hub_index(self) -> None:
                payload = self.read_json()
                patient_seq = str(payload.get("patient_seq") or "5030").strip()
                if not patient_seq:
                    self.send_error_json("bad_request", "patient_seq is required", HTTPStatus.BAD_REQUEST)
                    return
                index_path = PROJECT_ROOT / "indexes" / f"hub_{patient_seq}_keyword_index.jsonl"
                categories = payload.get("categories") or list(HUB_RECORD_ENDPOINTS)
                try:
                    result = app.build_hub_index(patient_seq, index_path, categories)
                except Exception as exc:
                    self.send_error_json("hub_error", str(exc), HTTPStatus.BAD_GATEWAY)
                    return
                self.send_json(result)

            def serve_static(self, path: str) -> None:
                if path in {"", "/"}:
                    path = "/index.html"
                target = (app.web_root / path.lstrip("/")).resolve()
                if app.web_root.resolve() not in target.parents and target != app.web_root.resolve():
                    self.send_error_json("forbidden", "Forbidden", HTTPStatus.FORBIDDEN)
                    return
                if not target.exists() or not target.is_file():
                    self.send_error_json("not_found", "File not found", HTTPStatus.NOT_FOUND)
                    return
                content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
                data = target.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def read_json(self) -> dict[str, Any]:
                length = int(self.headers.get("Content-Length") or "0")
                if length == 0:
                    return {}
                return json.loads(self.rfile.read(length).decode("utf-8"))

            def send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
                data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def send_error_json(self, code: str, message: str, status: HTTPStatus) -> None:
                self.send_json({"error": {"code": code, "message": message}}, status=status)

        return Handler

    def answer(
        self,
        question: str,
        top_k: int,
        category: str | None,
        mode: str,
    ) -> dict[str, Any]:
        hits = self.retrieve(question, top_k=top_k, category=category)
        evidence = [
            {
                "rank": idx + 1,
                "score": round(hit.score, 3),
                "chunk_id": hit.chunk.chunk_id,
                "text": hit.chunk.text,
                "metadata": hit.chunk.metadata,
            }
            for idx, hit in enumerate(hits)
        ]

        if mode == "upstage":
            answer = self.answer_with_upstage(question, [hit.chunk for hit in hits])
        else:
            answer = render_local_answer(question, evidence)

        return {"answer": answer, "evidence": evidence, "mode": mode}

    def retrieve(self, question: str, top_k: int, category: str | None) -> list[Any]:
        if not self.index_path.exists():
            return []
        index = KeywordIndex.load_jsonl(self.index_path)
        return index.search(question, top_k=top_k, category=category)

    def answer_with_upstage(self, question: str, chunks: list[Any]) -> str:
        try:
            result = UpstageRagClient().answer_from_chunks(question, chunks)
        except Exception as exc:
            return (
                "Upstage 호출에 실패했습니다. 로컬 근거 검색 결과를 먼저 확인하세요.\n\n"
                f"error: {exc}"
            )
        if isinstance(result, dict):
            return json.dumps(result, ensure_ascii=False, indent=2)
        return str(result)

    def build_hub_index(
        self,
        patient_seq: str,
        index_path: Path,
        categories: list[str],
    ) -> dict[str, Any]:
        payloads = HubApiClient().fetch_patient_records(patient_seq, categories)
        documents = hub_payloads_to_documents(payloads, patient_seq)
        chunks = chunk_documents(documents)
        KeywordIndex(chunks).save_jsonl(index_path)
        self.index_path = index_path
        return {
            "patient_seq": patient_seq,
            "categories": categories,
            "index_path": str(index_path),
            "document_count": len(documents),
            "chunk_count": len(chunks),
            "index_exists": index_path.exists(),
        }


def render_local_answer(question: str, evidence: list[dict[str, Any]]) -> str:
    if not evidence:
        return (
            "검색된 근거가 없습니다. 인덱스를 먼저 만들거나 다른 질문으로 다시 시도하세요.\n\n"
            f"질문: {question}"
        )

    lines = [
        "로컬 RAG 검색 결과입니다. 아래 근거를 바탕으로 판단하세요.",
        "",
    ]
    for item in evidence:
        metadata = item["metadata"]
        text = " ".join(str(item["text"]).split())
        if len(text) > 420:
            text = text[:417].rstrip() + "..."
        lines.extend(
            [
                f"[{item['rank']}] {metadata.get('category', '')} | score {item['score']}",
                f"source: {metadata.get('source_path', '')}",
                f"locator: {metadata.get('locator', '')}",
                text,
                "",
            ]
        )
    return "\n".join(lines).strip()


def parse_patient_seqs() -> list[str]:
    raw = os.getenv("DSTAT_HUB_PATIENT_SEQS", "5030,5199,5337")
    return [item.strip() for item in raw.split(",") if item.strip()]


def main() -> None:
    load_env_file(Path(".env"))
    parser = argparse.ArgumentParser(description="Run the analysis chat test interface")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--session-root", type=Path, default=DEFAULT_SESSION_ROOT)
    parser.add_argument("--index-path", type=Path, default=DEFAULT_INDEX_PATH)
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    app = AnalysisServer(
        session_root=args.session_root,
        index_path=args.index_path,
        default_top_k=args.top_k,
    )
    server = ThreadingHTTPServer((args.host, args.port), app.make_handler())
    url = f"http://{args.host}:{args.port}"
    print(f"Analysis chat UI running at {url}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
