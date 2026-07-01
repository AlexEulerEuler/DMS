from __future__ import annotations

import json
import mimetypes
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from time import sleep
from typing import Any

from .models import DocumentChunk


DEFAULT_BASE_URL = "https://api.upstage.ai/v2"
DEFAULT_CHAT_BASE_URL = "https://api.upstage.ai/v1"
DEFAULT_MODEL = "solar-pro3"
RAG_SYSTEM_INSTRUCTIONS = (
    "You are a medical MyData RAG assistant. Answer only from the supplied "
    "evidence. Cite source ids. If evidence is insufficient, say so. Do not "
    "diagnose or prescribe."
)


class UpstageRagClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        chat_base_url: str | None = None,
        model: str | None = None,
        poll_seconds: float | None = None,
    ) -> None:
        self.api_key = clean_env_value(api_key or os.getenv("UPSTAGE_API_KEY"))
        if not self.api_key:
            raise ValueError("UPSTAGE_API_KEY is required")
        self.base_url = normalize_base_url(base_url or os.getenv("UPSTAGE_BASE_URL", DEFAULT_BASE_URL))
        self.chat_base_url = normalize_base_url(
            chat_base_url
            or os.getenv("UPSTAGE_CHAT_BASE_URL")
            or derive_chat_base_url(self.base_url)
        )
        self.model = model or os.getenv("UPSTAGE_RAG_MODEL", DEFAULT_MODEL)
        self.poll_seconds = (
            float(poll_seconds)
            if poll_seconds is not None
            else float(os.getenv("UPSTAGE_POLL_SECONDS", "2"))
        )

    def upload_file(self, file_path: str) -> dict[str, Any]:
        return self._request_multipart(
            "POST",
            "/files",
            fields={"purpose": "user_data"},
            files={"file": file_path},
        )

    def ask_file(self, file_path: str, instruction: str) -> Any:
        uploaded = self.upload_file(file_path)
        file_id = str(uploaded["id"])
        vector_store = self.create_vector_store(Path(file_path).name)
        vector_store_id = str(vector_store["id"])
        self.add_file_to_vector_store(vector_store_id, file_id)
        self.wait_for_vector_store_file(vector_store_id, file_id)
        response = self.create_response(
            input_text=instruction,
            instructions=RAG_SYSTEM_INSTRUCTIONS,
            tools=[
                {
                    "type": "file_search",
                    "vector_store_ids": [vector_store_id],
                    "max_num_results": 5,
                }
            ],
        )
        return parse_model_output(extract_output_text(response))

    def create_vector_store(self, name: str) -> dict[str, Any]:
        return self._request_json(
            "POST",
            "/vector_stores",
            {
                "name": f"mydata-rag-{name}",
                "expires_after": {"anchor": "last_active_at", "days": 1},
                "metadata": {"source": "mydata-rag-test"},
            },
        )

    def add_file_to_vector_store(self, vector_store_id: str, file_id: str) -> dict[str, Any]:
        return self._request_json(
            "POST",
            f"/vector_stores/{urllib.parse.quote(vector_store_id)}/files",
            {"file_id": file_id},
        )

    def wait_for_vector_store_file(self, vector_store_id: str, file_id: str) -> dict[str, Any]:
        while True:
            result = self._request_json(
                "GET",
                (
                    f"/vector_stores/{urllib.parse.quote(vector_store_id)}/files/"
                    f"{urllib.parse.quote(file_id)}"
                ),
            )
            status = result.get("status")
            if status == "completed":
                return result
            if status in {"failed", "cancelled"}:
                raise RuntimeError(
                    "Upstage file indexing did not complete: "
                    f"{status} {result.get('last_error') or ''}".strip()
                )
            sleep(self.poll_seconds)

    def answer_from_chunks(self, question: str, chunks: list[DocumentChunk]) -> Any:
        context = render_context(chunks)
        messages = [
            {"role": "system", "content": RAG_SYSTEM_INSTRUCTIONS},
            {
                "role": "user",
                "content": build_evidence_prompt(question, context),
            },
        ]
        response = self._request_json(
            "POST",
            "/chat/completions",
            {
                "model": self.model,
                "messages": messages,
                "temperature": 0.2,
            },
            base_url=self.chat_base_url,
        )
        return parse_model_output(extract_chat_completion_text(response))

    def create_response(
        self,
        input_text: str,
        instructions: str | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": self.model,
            "input": input_text,
        }
        if instructions:
            body["instructions"] = instructions
        if tools:
            body["tools"] = tools
        response = self._request_json(
            "POST",
            "/responses",
            body,
        )

        while response.get("status") in {"queued", "in_progress"}:
            sleep(self.poll_seconds)
            response_id = response.get("id")
            if not response_id:
                raise RuntimeError("Upstage response did not include an id")
            response = self._request_json(
                "GET",
                f"/responses/{urllib.parse.quote(str(response_id))}",
            )

        if response.get("status") != "completed":
            if "status" not in response and response.get("output"):
                return response
            raise RuntimeError(f"Upstage response did not complete: {response.get('status')}")

        return response

    def _request_json(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        query: list[tuple[str, str]] | None = None,
        base_url: str | None = None,
    ) -> dict[str, Any]:
        url = f"{(base_url or self.base_url).rstrip('/')}{path}"
        if query:
            url = f"{url}?{urllib.parse.urlencode(query)}"

        data = None
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Upstage HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Upstage request failed: {exc}") from exc

    def _request_multipart(
        self,
        method: str,
        path: str,
        fields: dict[str, str],
        files: dict[str, str],
    ) -> dict[str, Any]:
        boundary = "----mydata-rag-upstage-boundary"
        body_parts: list[bytes] = []

        for name, value in fields.items():
            body_parts.extend(
                [
                    f"--{boundary}\r\n".encode("utf-8"),
                    f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"),
                    value.encode("utf-8"),
                    b"\r\n",
                ]
            )

        for name, file_path in files.items():
            path_obj = Path(file_path)
            content_type = mimetypes.guess_type(path_obj.name)[0] or "application/octet-stream"
            body_parts.extend(
                [
                    f"--{boundary}\r\n".encode("utf-8"),
                    (
                        f'Content-Disposition: form-data; name="{name}"; '
                        f'filename="{path_obj.name}"\r\n'
                    ).encode("utf-8"),
                    f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                    path_obj.read_bytes(),
                    b"\r\n",
                ]
            )

        body_parts.append(f"--{boundary}--\r\n".encode("utf-8"))
        data = b"".join(body_parts)
        request = urllib.request.Request(
            f"{self.base_url.rstrip('/')}{path}",
            data=data,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Upstage HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Upstage request failed: {exc}") from exc


def render_context(chunks: list[DocumentChunk]) -> str:
    blocks: list[str] = []
    for idx, chunk in enumerate(chunks, start=1):
        metadata = chunk.metadata
        source_id = f"S{idx}"
        blocks.append(
            "\n".join(
                [
                    f"source_id: {source_id}",
                    f"category: {metadata.get('category', '')}",
                    f"source_path: {metadata.get('source_path', '')}",
                    f"locator: {metadata.get('locator', '')}",
                    "text:",
                    chunk.text,
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


def build_evidence_prompt(question: str, context: str) -> str:
    return (
        "Evidence:\n"
        f"{context}\n\n"
        f"Question: {question}\n\n"
        "Return JSON with keys answer, evidence, limitations, next_steps."
    )


def parse_model_output(output_text: str) -> Any:
    try:
        return json.loads(output_text)
    except json.JSONDecodeError:
        return {"answer": output_text}


def extract_chat_completion_text(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if isinstance(choices, list):
        for choice in choices:
            if not isinstance(choice, dict):
                continue
            message = choice.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return message["content"]
    return json.dumps(payload, ensure_ascii=False)


def clean_env_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.startswith("replace-with-"):
        return None
    return cleaned


def normalize_base_url(url: str) -> str:
    return url.rstrip("/")


def derive_chat_base_url(base_url: str) -> str:
    normalized = normalize_base_url(base_url)
    if normalized.endswith("/v2"):
        return f"{normalized[:-3]}/v1"
    return DEFAULT_CHAT_BASE_URL


def extract_output_text(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str):
        return output_text

    texts: list[str] = []
    for output in payload.get("output") or []:
        if not isinstance(output, dict):
            continue
        for content in output.get("content") or []:
            if not isinstance(content, dict):
                continue
            text = content.get("text")
            if isinstance(text, str):
                texts.append(text)
    if texts:
        return "\n".join(texts)
    return json.dumps(payload, ensure_ascii=False)
