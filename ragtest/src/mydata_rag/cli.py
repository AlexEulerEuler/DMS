from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from .catalog import classify_path, iter_source_files
from .chunking import chunk_documents
from .hub_api import HUB_RECORD_ENDPOINTS, HubApiClient, hub_payloads_to_documents
from .index import KeywordIndex, format_hits
from .loaders import load_documents, summarize_catalog
from .upstage import UpstageRagClient


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> None:
    load_env_file(Path(".env"))

    parser = argparse.ArgumentParser(description="Medical MyData RAG research CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan = subparsers.add_parser("scan", help="classify files under a raw data folder")
    scan.add_argument("raw_dir", type=Path)

    build = subparsers.add_parser("build-local-index", help="build a local keyword index")
    build.add_argument("raw_dir", type=Path)
    build.add_argument("index_path", type=Path)
    build.add_argument("--max-chars", type=int, default=1200)
    build.add_argument("--overlap-chars", type=int, default=120)
    build.add_argument(
        "--include-api-backed-json",
        action="store_true",
        help="also index legacy local JSON for treatment/checkup/medication/immunization",
    )

    fetch_hub = subparsers.add_parser("fetch-hub", help="fetch API-backed medical records from HUB")
    fetch_hub.add_argument("patient_seq")
    fetch_hub.add_argument("output_dir", type=Path)
    fetch_hub.add_argument("--category", choices=sorted(HUB_RECORD_ENDPOINTS), action="append")

    build_hub = subparsers.add_parser("build-hub-index", help="fetch HUB records and build a local index")
    build_hub.add_argument("patient_seq")
    build_hub.add_argument("index_path", type=Path)
    build_hub.add_argument("--category", choices=sorted(HUB_RECORD_ENDPOINTS), action="append")
    build_hub.add_argument("--max-chars", type=int, default=1200)
    build_hub.add_argument("--overlap-chars", type=int, default=120)

    ask_local = subparsers.add_parser("ask-local", help="retrieve local evidence")
    ask_local.add_argument("index_path", type=Path)
    ask_local.add_argument("question")
    ask_local.add_argument("--top-k", type=int, default=5)
    ask_local.add_argument("--category")

    ask_upstage_rag = subparsers.add_parser(
        "ask-upstage-rag",
        help="retrieve locally, then synthesize with Upstage",
    )
    ask_upstage_rag.add_argument("index_path", type=Path)
    ask_upstage_rag.add_argument("question")
    ask_upstage_rag.add_argument("--top-k", type=int, default=5)
    ask_upstage_rag.add_argument("--category")

    ask_file = subparsers.add_parser(
        "ask-upstage-file",
        help="upload one file and ask Upstage Responses API",
    )
    ask_file.add_argument("file_path")
    ask_file.add_argument("instruction")

    args = parser.parse_args()

    if args.command == "scan":
        run_scan(args.raw_dir)
    elif args.command == "build-local-index":
        run_build(
            args.raw_dir,
            args.index_path,
            args.max_chars,
            args.overlap_chars,
            args.include_api_backed_json,
        )
    elif args.command == "fetch-hub":
        run_fetch_hub(args.patient_seq, args.output_dir, args.category)
    elif args.command == "build-hub-index":
        run_build_hub(
            args.patient_seq,
            args.index_path,
            args.category,
            args.max_chars,
            args.overlap_chars,
        )
    elif args.command == "ask-local":
        run_ask_local(args.index_path, args.question, args.top_k, args.category)
    elif args.command == "ask-upstage-rag":
        run_ask_upstage_rag(args.index_path, args.question, args.top_k, args.category)
    elif args.command == "ask-upstage-file":
        run_ask_upstage_file(args.file_path, args.instruction)


def run_scan(raw_dir: Path) -> None:
    files = iter_source_files(raw_dir)
    payload = {
        "root": str(raw_dir),
        "counts": summarize_catalog(raw_dir),
        "files": [
            {
                "path": source.path,
                "category": source.category,
                "source_type": source.source_type,
            }
            for source in files
        ],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def run_build(
    raw_dir: Path,
    index_path: Path,
    max_chars: int,
    overlap_chars: int,
    include_api_backed_json: bool,
) -> None:
    documents = load_documents(raw_dir, include_api_backed_json=include_api_backed_json)
    chunks = chunk_documents(documents, max_chars=max_chars, overlap_chars=overlap_chars)
    KeywordIndex(chunks).save_jsonl(index_path)
    payload = {
        "raw_dir": str(raw_dir),
        "index_path": str(index_path),
        "document_count": len(documents),
        "chunk_count": len(chunks),
        "include_api_backed_json": include_api_backed_json,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def run_fetch_hub(
    patient_seq: str,
    output_dir: Path,
    categories: list[str] | None,
) -> None:
    payloads = HubApiClient().fetch_patient_records(patient_seq, categories)
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for category, payload in payloads.items():
        path = output_dir / f"{patient_seq}-{category}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(str(path))
    print(json.dumps({"patient_seq": patient_seq, "written": written}, ensure_ascii=False, indent=2))


def run_build_hub(
    patient_seq: str,
    index_path: Path,
    categories: list[str] | None,
    max_chars: int,
    overlap_chars: int,
) -> None:
    payloads = HubApiClient().fetch_patient_records(patient_seq, categories)
    documents = hub_payloads_to_documents(payloads, patient_seq)
    chunks = chunk_documents(documents, max_chars=max_chars, overlap_chars=overlap_chars)
    KeywordIndex(chunks).save_jsonl(index_path)
    print(
        json.dumps(
            {
                "patient_seq": patient_seq,
                "categories": categories or list(HUB_RECORD_ENDPOINTS),
                "index_path": str(index_path),
                "document_count": len(documents),
                "chunk_count": len(chunks),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def run_ask_local(
    index_path: Path,
    question: str,
    top_k: int,
    category: str | None,
) -> None:
    index = KeywordIndex.load_jsonl(index_path)
    hits = index.search(question, top_k=top_k, category=category)
    print(format_hits(hits))


def run_ask_upstage_rag(
    index_path: Path,
    question: str,
    top_k: int,
    category: str | None,
) -> None:
    index = KeywordIndex.load_jsonl(index_path)
    hits = index.search(question, top_k=top_k, category=category)
    client = UpstageRagClient()
    answer = client.answer_from_chunks(question, [hit.chunk for hit in hits])
    print(json.dumps(answer, ensure_ascii=False, indent=2))


def run_ask_upstage_file(file_path: str, instruction: str) -> None:
    source = classify_path(Path(file_path))
    prompt = (
        f"Source category hint: {source.category}\n"
        f"Instruction: {instruction}\n"
        "Return concise JSON with extracted facts and source limitations."
    )
    answer = UpstageRagClient().ask_file(file_path, prompt)
    print(json.dumps(answer, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
