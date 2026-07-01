from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mydata_rag.catalog import classify_path
from mydata_rag.chunking import chunk_document
from mydata_rag.hub_api import hub_payloads_to_documents
from mydata_rag.index import KeywordIndex
from mydata_rag.loaders import load_documents, load_json_documents
from mydata_rag.models import DocumentChunk, NormalizedDocument, SourceFile
from mydata_rag.sessions import SessionStore
from mydata_rag.upstage import UpstageRagClient, extract_output_text


class CatalogTests(unittest.TestCase):
    def test_classifies_known_sources(self) -> None:
        self.assertEqual(classify_path(Path("medication (1).json")).category, "medication")
        self.assertEqual(classify_path(Path("HEALTHY_BASELINE.json")).category, "health_baseline")
        self.assertEqual(classify_path(Path("HOME_VITALS.json")).category, "home_vitals")
        self.assertEqual(classify_path(Path("ACTIVITY_SLEEP_NUTRITION.json")).category, "lifestyle")
        self.assertEqual(classify_path(Path("MENTAL_WELLBEING.json")).category, "mental_wellbeing")
        self.assertEqual(classify_path(Path("PREVENTIVE_SCREENING.json")).category, "preventive_screening")
        self.assertEqual(classify_path(Path("DENTAL_VISION.json")).category, "preventive_screening")
        self.assertEqual(classify_path(Path("SELF_REPORTED_HISTORY.json")).category, "health_history")
        self.assertEqual(classify_path(Path("L01.vcf.gz")).category, "genomic_vcf")
        self.assertEqual(classify_path(Path("L01.vcf.gz.tbi")).category, "genomic_index")
        self.assertEqual(classify_path(Path("GUTINSIDE.json")).category, "microbiome")


class LoaderTests(unittest.TestCase):
    def test_loads_json_list_records(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "medication (1).json"
            path.write_text(
                '[{"drug":"metformin","date":"2026-04-10"},{"drug":"statin"}]',
                encoding="utf-8",
            )
            docs = load_json_documents(path, SourceFile(str(path), "medication", "json"))

        self.assertEqual(len(docs), 2)
        self.assertIn("drug: metformin", docs[0].text)

    def test_excludes_api_backed_json_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "treatment.json").write_text(
                '[{"visit_date":"2026-04-01","facility":"API-backed mock"}]',
                encoding="utf-8",
            )
            (root / "WELLNESS_LABS.json").write_text(
                '{"records":[{"date":"2026-04-15","hba1c_percent":5.2}]}',
                encoding="utf-8",
            )

            default_docs = load_documents(root)
            inclusive_docs = load_documents(root, include_api_backed_json=True)

        self.assertEqual([doc.category for doc in default_docs], ["health_baseline"])
        self.assertEqual(
            sorted(doc.category for doc in inclusive_docs),
            ["health_baseline", "treatment"],
        )


class ChunkingTests(unittest.TestCase):
    def test_chunks_with_source_metadata(self) -> None:
        doc = NormalizedDocument(
            doc_id="doc1",
            category="checkup",
            source_path="checkup.json",
            source_type="json",
            locator="record[0]",
            title="checkup",
            text="a" * 30 + "\n\n" + "b" * 30,
        )
        chunks = chunk_document(doc, max_chars=40, overlap_chars=5)

        self.assertGreaterEqual(len(chunks), 1)
        self.assertEqual(chunks[0].metadata["category"], "checkup")
        self.assertEqual(chunks[0].metadata["source_path"], "checkup.json")


class KeywordIndexTests(unittest.TestCase):
    def test_search_returns_ranked_hits(self) -> None:
        chunks = [
            DocumentChunk("c1", "d1", "metformin diabetes glucose", {"category": "medication"}),
            DocumentChunk("c2", "d2", "holter arrhythmia report", {"category": "holter_report"}),
        ]
        index = KeywordIndex(chunks)
        hits = index.search("glucose medication", top_k=1)

        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].chunk.chunk_id, "c1")


class HubApiNormalizerTests(unittest.TestCase):
    def test_converts_hub_payload_records_to_documents(self) -> None:
        payloads = {
            "treatment": {
                "result": "SUCCESS",
                "data": {
                    "transactionId": "TX-005",
                    "records": [
                        {
                            "seq": 1,
                            "organizationName": "서울대학교병원",
                            "visitDt": "2025-11-10",
                        }
                    ],
                },
                "error": None,
            }
        }

        docs = hub_payloads_to_documents(payloads, "5030")

        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0].category, "treatment")
        self.assertEqual(docs[0].source_type, "hub_api")
        self.assertIn("/v1/records/treatments", docs[0].source_path)
        self.assertIn("organizationName: 서울대학교병원", docs[0].text)
        self.assertEqual(docs[0].metadata["patient_seq"], "5030")


class SessionStoreTests(unittest.TestCase):
    def test_auto_saves_and_lists_sessions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = SessionStore(Path(tmp))
            session = store.create()
            store.append_message(session.session_id, "user", "혈당 리포트 요약")
            store.append_message(
                session.session_id,
                "assistant",
                "요약 결과",
                {"evidence": [{"rank": 1}]},
            )

            loaded = store.load(session.session_id)
            sessions = store.list_sessions()

        self.assertEqual(len(loaded.messages), 2)
        self.assertEqual(loaded.title, "혈당 리포트 요약")
        self.assertEqual(sessions[0]["message_count"], 2)


class UpstageFallbackTests(unittest.TestCase):
    def test_extracts_responses_output_text(self) -> None:
        payload = {
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "content": [
                        {"type": "output_text", "text": "{\"answer\":\"ok\"}"}
                    ],
                }
            ],
        }

        self.assertEqual(extract_output_text(payload), "{\"answer\":\"ok\"}")

    def test_local_rag_uses_chat_completions(self) -> None:
        client = RecordingUpstageClient()
        chunk = DocumentChunk(
            "c1",
            "d1",
            "fasting glucose: 102 mg/dL",
            {"category": "glucose", "source_path": "glucose.json", "locator": "record[0]"},
        )

        result = client.answer_from_chunks("혈당 수치를 요약해줘", [chunk])

        self.assertEqual(result["answer"], "ok")
        request = client.requests[0]
        self.assertEqual(request["path"], "/chat/completions")
        self.assertEqual(request["base_url"], "https://api.upstage.ai/v1")
        self.assertIn("messages", request["body"])
        self.assertEqual(request["body"]["messages"][0]["role"], "system")
        self.assertNotIn("input", request["body"])

    def test_responses_payload_uses_instructions_not_system_role(self) -> None:
        client = RecordingUpstageClient()

        response = client.create_response(
            input_text="Summarize the file",
            instructions="Answer only from retrieved evidence.",
            tools=[{"type": "file_search", "vector_store_ids": ["vs_123"]}],
        )

        self.assertEqual(extract_output_text(response), "{\"answer\":\"ok\"}")
        request = client.requests[0]
        self.assertEqual(request["path"], "/responses")
        self.assertEqual(request["body"]["input"], "Summarize the file")
        self.assertEqual(request["body"]["instructions"], "Answer only from retrieved evidence.")
        self.assertNotIn('"role"', json.dumps(request["body"]))


class RecordingUpstageClient(UpstageRagClient):
    def __init__(self) -> None:
        super().__init__(api_key="test-key", poll_seconds=0)
        self.requests: list[dict[str, object]] = []

    def _request_json(
        self,
        method: str,
        path: str,
        body: dict[str, object] | None = None,
        query: list[tuple[str, str]] | None = None,
        base_url: str | None = None,
    ) -> dict[str, object]:
        self.requests.append(
            {
                "method": method,
                "path": path,
                "body": body or {},
                "query": query,
                "base_url": base_url or self.base_url,
            }
        )
        if path == "/chat/completions":
            return {"choices": [{"message": {"content": "{\"answer\":\"ok\"}"}}]}
        if path == "/responses":
            return {
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": "{\"answer\":\"ok\"}"}],
                    }
                ]
            }
        raise AssertionError(f"Unexpected request path: {path}")


if __name__ == "__main__":
    unittest.main()
