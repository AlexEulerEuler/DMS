from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from .chunking import stable_id
from .models import NormalizedDocument


DEFAULT_HUB_BASE_URL = "https://dev-dstat-hub-api.lulumedic.com"

API_BACKED_CATEGORIES = {
    "treatment",
    "checkup",
    "medication",
    "immunization",
}


@dataclass(frozen=True)
class HubRecordEndpoint:
    category: str
    endpoint: str
    summary: str


HUB_RECORD_ENDPOINTS: dict[str, HubRecordEndpoint] = {
    "treatment": HubRecordEndpoint(
        category="treatment",
        endpoint="/v1/records/treatments",
        summary="진료이력 정보 조회",
    ),
    "checkup": HubRecordEndpoint(
        category="checkup",
        endpoint="/v1/records/health-checkup",
        summary="건강검진 정보 조회",
    ),
    "medication": HubRecordEndpoint(
        category="medication",
        endpoint="/v1/records/medication-dispense",
        summary="투약정보 조회",
    ),
    "immunization": HubRecordEndpoint(
        category="immunization",
        endpoint="/v1/records/immunizations",
        summary="예방접종 정보 조회",
    ),
}


class HubApiError(RuntimeError):
    pass


class HubApiClient:
    def __init__(
        self,
        base_url: str | None = None,
        client_id: str | None = None,
        client_secret: str | None = None,
        timeout_seconds: float = 20,
    ) -> None:
        self.base_url = (base_url or os.getenv("DSTAT_HUB_BASE_URL", DEFAULT_HUB_BASE_URL)).rstrip("/")
        self.client_id = clean_env_value(client_id or os.getenv("DSTAT_HUB_CLIENT_ID"))
        self.client_secret = clean_env_value(client_secret or os.getenv("DSTAT_HUB_CLIENT_SECRET"))
        self.timeout_seconds = timeout_seconds
        self._access_token: str | None = clean_env_value(os.getenv("DSTAT_HUB_ACCESS_TOKEN"))

    def require_credentials(self) -> None:
        if self._access_token:
            return
        missing = [
            name
            for name, value in (
                ("DSTAT_HUB_CLIENT_ID", self.client_id),
                ("DSTAT_HUB_CLIENT_SECRET", self.client_secret),
            )
            if not value
        ]
        if missing:
            raise HubApiError(f"Missing required HUB credential env vars: {', '.join(missing)}")

    def get_access_token(self) -> str:
        if self._access_token:
            return self._access_token

        self.require_credentials()
        response = self._request_json(
            "POST",
            "/v1/auth/token",
            body={
                "grantType": "CLIENT_CREDENTIALS",
                "clientId": self.client_id,
                "clientSecret": self.client_secret,
            },
            auth=False,
        )
        data = response.get("data") or {}
        token = data.get("accessToken")
        if not token:
            raise HubApiError("HUB token response did not include data.accessToken")
        self._access_token = str(token)
        return self._access_token

    def fetch_category(self, patient_seq: str, category: str) -> dict[str, Any]:
        endpoint = HUB_RECORD_ENDPOINTS[category]
        return self._request_json(
            "GET",
            endpoint.endpoint,
            query={"patientSeq": patient_seq},
            auth=True,
        )

    def fetch_patient_records(
        self,
        patient_seq: str,
        categories: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        selected = categories or list(HUB_RECORD_ENDPOINTS)
        return {
            category: self.fetch_category(patient_seq, category)
            for category in selected
        }

    def _request_json(
        self,
        method: str,
        path: str,
        query: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
        auth: bool = True,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        if query:
            url = f"{url}?{urllib.parse.urlencode(query)}"

        headers = {"Accept": "application/json"}
        payload: bytes | None = None
        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if auth:
            headers["Authorization"] = f"Bearer {self.get_access_token()}"

        request = urllib.request.Request(url, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise HubApiError(f"HUB HTTP {exc.code} for {method} {path}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise HubApiError(f"HUB request failed for {method} {path}: {exc}") from exc


def hub_payloads_to_documents(
    payloads: dict[str, dict[str, Any]],
    patient_seq: str,
) -> list[NormalizedDocument]:
    documents: list[NormalizedDocument] = []
    for category, payload in payloads.items():
        endpoint = HUB_RECORD_ENDPOINTS[category]
        data = payload.get("data") or {}
        transaction_id = data.get("transactionId")
        records = data.get("records") or []
        if not isinstance(records, list):
            records = [records]

        for idx, record in enumerate(records):
            locator = f"hub:{endpoint.endpoint}#records[{idx}]"
            text = hub_record_to_text(category, patient_seq, endpoint.endpoint, transaction_id, record)
            seq = record.get("seq") if isinstance(record, dict) else None
            documents.append(
                NormalizedDocument(
                    doc_id=stable_id("hub", category, patient_seq, endpoint.endpoint, seq or idx, text[:80]),
                    category=category,
                    source_path=f"hub://{endpoint.endpoint}?patientSeq={patient_seq}",
                    source_type="hub_api",
                    locator=locator,
                    title=f"{category}: HUB patientSeq {patient_seq} record {seq or idx}",
                    text=text,
                    metadata={
                        "source_name": "dstat-hub-api",
                        "patient_seq": patient_seq,
                        "api_endpoint": endpoint.endpoint,
                        "api_summary": endpoint.summary,
                        "transaction_id": transaction_id,
                        "record_seq": seq,
                    },
                )
            )
    return documents


def hub_record_to_text(
    category: str,
    patient_seq: str,
    endpoint: str,
    transaction_id: Any,
    record: Any,
) -> str:
    lines = [
        f"category: {category}",
        f"source: dstat-hub-api",
        f"api_endpoint: {endpoint}",
        f"patient_seq: {patient_seq}",
    ]
    if transaction_id:
        lines.append(f"transaction_id: {transaction_id}")
    for key, value in flatten_json(record):
        if value is None or value == "":
            continue
        lines.append(f"{key}: {value}")
    return "\n".join(lines)


def clean_env_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.startswith("replace-with-"):
        return None
    return cleaned


def flatten_json(value: Any, prefix: str = "") -> list[tuple[str, Any]]:
    flattened: list[tuple[str, Any]] = []
    if isinstance(value, dict):
        for key in sorted(value):
            next_prefix = f"{prefix}.{key}" if prefix else str(key)
            flattened.extend(flatten_json(value[key], next_prefix))
    elif isinstance(value, list):
        for idx, item in enumerate(value):
            next_prefix = f"{prefix}[{idx}]"
            flattened.extend(flatten_json(item, next_prefix))
    else:
        flattened.append((prefix or "value", value))
    return flattened
