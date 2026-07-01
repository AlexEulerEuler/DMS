from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Any, Iterable

from .catalog import classify_path, iter_source_files
from .chunking import stable_id
from .hub_api import API_BACKED_CATEGORIES
from .models import NormalizedDocument, SourceFile


LIST_KEYS = ("data", "items", "results", "records", "entries", "entry")


def load_documents(
    raw_root: Path,
    max_vcf_records: int = 2000,
    include_api_backed_json: bool = False,
) -> list[NormalizedDocument]:
    documents: list[NormalizedDocument] = []
    for source in iter_source_files(raw_root):
        path = Path(source.path)
        if source.source_type == "json":
            if source.category in API_BACKED_CATEGORIES and not include_api_backed_json:
                continue
            documents.extend(load_json_documents(path, source))
        elif source.source_type == "pdf":
            documents.extend(load_pdf_documents(path, source))
        elif source.source_type == "vcf":
            documents.extend(load_vcf_documents(path, source, max_records=max_vcf_records))
        elif source.source_type == "tbi":
            documents.append(index_companion_document(path, source))
        else:
            documents.append(binary_placeholder_document(path, source))
    return documents


def load_json_documents(path: Path, source: SourceFile) -> list[NormalizedDocument]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    records = list(explode_records(payload))
    documents: list[NormalizedDocument] = []
    for idx, record in enumerate(records):
        locator = f"record[{idx}]"
        text = record_to_text(source.category, path.name, locator, record)
        documents.append(
            NormalizedDocument(
                doc_id=stable_id(path, locator, text[:80]),
                category=source.category,
                source_path=str(path),
                source_type=source.source_type,
                locator=locator,
                title=f"{source.category}: {path.name} {locator}",
                text=text,
                metadata={
                    "source_name": path.name,
                    "record_index": idx,
                },
            )
        )
    return documents


def explode_records(payload: Any) -> Iterable[Any]:
    if isinstance(payload, list):
        yield from payload
        return

    if isinstance(payload, dict):
        for key in LIST_KEYS:
            value = payload.get(key)
            if isinstance(value, list):
                yield from value
                return
        yield payload
        return

    yield payload


def record_to_text(category: str, source_name: str, locator: str, record: Any) -> str:
    lines = [
        f"category: {category}",
        f"source: {source_name}",
        f"locator: {locator}",
    ]
    for key, value in flatten_json(record):
        if value is None or value == "":
            continue
        lines.append(f"{key}: {value}")
    return "\n".join(lines)


def flatten_json(value: Any, prefix: str = "") -> Iterable[tuple[str, Any]]:
    if isinstance(value, dict):
        for key in sorted(value):
            next_prefix = f"{prefix}.{key}" if prefix else str(key)
            yield from flatten_json(value[key], next_prefix)
    elif isinstance(value, list):
        for idx, item in enumerate(value):
            next_prefix = f"{prefix}[{idx}]"
            yield from flatten_json(item, next_prefix)
    else:
        yield prefix or "value", value


def load_pdf_documents(path: Path, source: SourceFile) -> list[NormalizedDocument]:
    text = extract_pdf_text(path)
    if not text:
        text = (
            f"PDF source {path.name} could not be parsed locally. "
            "Use Upstage Document Parse or File Search for production ingestion."
        )
    return [
        NormalizedDocument(
            doc_id=stable_id(path, source.category, "pdf"),
            category=source.category,
            source_path=str(path),
            source_type=source.source_type,
            locator="pdf",
            title=f"{source.category}: {path.name}",
            text=text,
            metadata={"source_name": path.name},
        )
    ]


def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError:
        return ""

    reader = PdfReader(str(path))
    pages: list[str] = []
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages.append(f"page {idx + 1}\n{page_text.strip()}")
    return "\n\n".join(pages)


def load_vcf_documents(
    path: Path,
    source: SourceFile,
    max_records: int = 2000,
    group_size: int = 50,
) -> list[NormalizedDocument]:
    records: list[str] = []
    documents: list[NormalizedDocument] = []

    for idx, record in enumerate(iter_vcf_records(path)):
        if idx >= max_records:
            break
        records.append(record)
        if len(records) >= group_size:
            documents.append(vcf_group_document(path, source, records, len(documents)))
            records = []

    if records:
        documents.append(vcf_group_document(path, source, records, len(documents)))

    if not documents:
        documents.append(
            NormalizedDocument(
                doc_id=stable_id(path, "empty-vcf"),
                category=source.category,
                source_path=str(path),
                source_type=source.source_type,
                locator="vcf",
                title=f"{source.category}: {path.name}",
                text=f"No variant records parsed from {path.name}.",
                metadata={"source_name": path.name},
            )
        )
    return documents


def iter_vcf_records(path: Path) -> Iterable[str]:
    opener = gzip.open if "".join(path.suffixes).lower().endswith(".vcf.gz") else open
    with opener(path, "rt", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line or line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 8:
                continue
            chrom, pos, variant_id, ref, alt, qual, filt, info = parts[:8]
            yield (
                f"variant: {chrom}:{pos} {ref}>{alt}; "
                f"id: {variant_id}; qual: {qual}; filter: {filt}; info: {info}"
            )


def vcf_group_document(
    path: Path,
    source: SourceFile,
    records: list[str],
    group_index: int,
) -> NormalizedDocument:
    locator = f"vcf_group[{group_index}]"
    text = "\n".join(
        [
            f"category: {source.category}",
            f"source: {path.name}",
            f"locator: {locator}",
            *records,
        ]
    )
    return NormalizedDocument(
        doc_id=stable_id(path, locator),
        category=source.category,
        source_path=str(path),
        source_type=source.source_type,
        locator=locator,
        title=f"{source.category}: {path.name} {locator}",
        text=text,
        metadata={"source_name": path.name, "vcf_group_index": group_index},
    )


def index_companion_document(path: Path, source: SourceFile) -> NormalizedDocument:
    text = (
        f"{path.name} is a tabix index companion for a compressed VCF. "
        "It should be retained with the VCF for random access, but not embedded "
        "as clinical content."
    )
    return NormalizedDocument(
        doc_id=stable_id(path, "tbi"),
        category=source.category,
        source_path=str(path),
        source_type=source.source_type,
        locator="tabix-index",
        title=f"{source.category}: {path.name}",
        text=text,
        metadata={"source_name": path.name},
    )


def binary_placeholder_document(path: Path, source: SourceFile) -> NormalizedDocument:
    return NormalizedDocument(
        doc_id=stable_id(path, "binary"),
        category=source.category,
        source_path=str(path),
        source_type=source.source_type,
        locator="file",
        title=f"{source.category}: {path.name}",
        text=f"Unparsed source file: {path.name}",
        metadata={"source_name": path.name},
    )


def summarize_catalog(raw_root: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    for source in iter_source_files(raw_root):
        counts[source.category] = counts.get(source.category, 0) + 1
    return counts
