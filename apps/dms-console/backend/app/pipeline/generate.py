"""Steps 1-8: the generation pipeline (docs/ia/runtime.md §3).

Deterministic and dependency-light: parse uploaded documents, chunk them, match
against the existing master list, produce a master list draft, confirm it,
compute a submission schedule from the baseline, and export real JSON/XLSX files.
Runnable from the API (POST /api/pipeline/run) and the CLI (python -m app.cli).
"""

import json
import os
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

from app.core.config import settings
from app.core.errors import AppError
from app.db import session_scope
from app.models_db import (
    BaselineScheduleRow,
    ExistingMasterListRow,
    ExportFileRow,
    GeneratedScheduleRow,
    MasterListRow,
    SourceDocumentRow,
)
from app.pipeline.matcher import HeuristicMatcher, Matcher
from app.pipeline.parsing import chunk, parse_text
from app.store import PROJECT_ID, next_id


@dataclass
class PipelineSummary:
    master_list_id: str
    version: str
    item_count: int
    matched_count: int
    new_count: int
    schedule_id: str | None
    milestone_count: int
    export_ids: list[str]
    document_count: int


def run_pipeline(
    confirm: bool = True,
    export_formats: tuple[str, ...] = ("json", "xlsx"),
    matcher: Matcher | None = None,
) -> PipelineSummary:
    matcher = matcher or HeuristicMatcher()
    os.makedirs(os.path.join(settings.storage_dir, "exports"), exist_ok=True)

    with session_scope() as session:
        documents = list(session.execute(select(SourceDocumentRow)).scalars())
        existing_rows = list(session.execute(select(ExistingMasterListRow)).scalars())
        baselines = list(session.execute(select(BaselineScheduleRow)).scalars())

        if not documents and not existing_rows:
            raise AppError(
                400, "validation_error", "생성할 입력이 없습니다. 입력 문서나 기존 표준 목록을 먼저 업로드하세요."
            )

        # Step 2-3: parse + chunk documents.
        doc_chunks: list[str] = []
        for doc in documents:
            doc.parsed_status = "processing"
            text = parse_text(doc.stored_path) if doc.stored_path else ""
            doc_chunks.extend(chunk(text))
            doc.parsed_status = "done" if text else "error"

        # Existing master-list items (one per non-empty line).
        existing_items: list[str] = []
        for row in existing_rows:
            if row.stored_path:
                existing_items.extend(chunk(parse_text(row.stored_path)))

        # Step 4: match chunks against existing items.
        results = matcher.match(doc_chunks, existing_items)
        matched_titles = {r.matched_title for r in results if r.matched_title}
        new_titles: list[str] = []
        seen = {t.lower() for t in existing_items}
        for result in results:
            if result.matched_title is None:
                key = result.chunk.lower()
                if key not in seen:
                    seen.add(key)
                    new_titles.append(result.chunk)

        # Step 5: build the unified master list (existing items + new document items).
        items: list[dict] = []
        idx = 0
        for title in existing_items:
            idx += 1
            items.append(
                {
                    "id": f"mli_{idx:03d}",
                    "title": title,
                    "source": "existing",
                    "matched": title in matched_titles,
                }
            )
        for title in new_titles:
            idx += 1
            items.append({"id": f"mli_{idx:03d}", "title": title, "source": "document", "matched": False})

        matched_count = sum(1 for it in items if it.get("matched"))
        new_count = len(new_titles)

        version = f"v{session.execute(select(func.count()).select_from(MasterListRow)).scalar_one() + 1}"
        master_id = next_id(session, "ml")
        master_row = MasterListRow(
            id=master_id,
            project_id=PROJECT_ID,
            items=items,
            version=version,
            status="confirmed" if confirm else "draft",
            generated_at=datetime.now(UTC),
        )
        session.add(master_row)

        # Step 7: schedule from baseline range + item count.
        schedule_id: str | None = None
        milestones: list[dict] = []
        start, end = _baseline_range(baselines)
        if start and end and items:
            milestones = _build_milestones(start, end, len(items))
            schedule_id = next_id(session, "gs")
            session.add(
                GeneratedScheduleRow(
                    id=schedule_id,
                    project_id=PROJECT_ID,
                    milestones=milestones,
                    based_on=baselines[0].id if baselines else None,
                    generated_at=datetime.now(UTC),
                )
            )

        # Step 8: export real files.
        export_ids: list[str] = []
        payload = {
            "masterList": {"id": master_id, "version": version, "items": items},
            "schedule": {"id": schedule_id, "milestones": milestones},
        }
        for fmt in export_formats:
            export_id = next_id(session, "ex")
            path = _write_export(export_id, fmt, payload)
            session.add(
                ExportFileRow(
                    id=export_id,
                    project_id=PROJECT_ID,
                    format=fmt,
                    source_output=master_id,
                    stored_path=path,
                    created_at=datetime.now(UTC),
                )
            )
            export_ids.append(export_id)

        session.flush()
        return PipelineSummary(
            master_list_id=master_id,
            version=version,
            item_count=len(items),
            matched_count=matched_count,
            new_count=new_count,
            schedule_id=schedule_id,
            milestone_count=len(milestones),
            export_ids=export_ids,
            document_count=len(documents),
        )


def _baseline_range(baselines: list[BaselineScheduleRow]) -> tuple[str | None, str | None]:
    starts = [b.start_date for b in baselines if b.start_date]
    ends = [b.end_date for b in baselines if b.end_date]
    return (min(starts) if starts else None, max(ends) if ends else None)


def _build_milestones(start: str, end: str, item_count: int) -> list[dict]:
    start_d = date.fromisoformat(start)
    end_d = date.fromisoformat(end)
    span = max((end_d - start_d).days, 0)
    count = max(1, min(item_count, 8))
    milestones: list[dict] = []
    for i in range(1, count + 1):
        offset = round(span * i / count)
        milestone_date = (start_d + timedelta(days=offset)).isoformat()
        label = "최종 제출" if i == count else f"{i}차 제출"
        milestones.append({"id": f"ms_{i:02d}", "title": label, "date": milestone_date})
    return milestones


def _write_export(export_id: str, fmt: str, payload: dict) -> str:
    directory = os.path.join(settings.storage_dir, "exports")
    os.makedirs(directory, exist_ok=True)

    if fmt == "json":
        path = os.path.join(directory, f"{export_id}.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
        return path

    if fmt == "xlsx":
        from openpyxl import Workbook

        path = os.path.join(directory, f"{export_id}.xlsx")
        wb = Workbook()
        ws1 = wb.active
        ws1.title = "표준 목록"
        ws1.append(["ID", "제목", "출처", "매칭"])
        for item in payload["masterList"]["items"]:
            ws1.append([item["id"], item["title"], item.get("source", ""), "Y" if item.get("matched") else ""])
        ws2 = wb.create_sheet("생성 일정")
        ws2.append(["마일스톤", "날짜"])
        for m in payload["schedule"]["milestones"]:
            ws2.append([m["title"], m["date"]])
        wb.save(path)
        return path

    # doc / fallback: readable markdown-ish text.
    path = os.path.join(directory, f"{export_id}.{fmt}")
    lines = [f"# 표준 목록 {payload['masterList']['version']}", ""]
    for item in payload["masterList"]["items"]:
        lines.append(f"- {item['title']}")
    lines += ["", "# 생성 일정", ""]
    for m in payload["schedule"]["milestones"]:
        lines.append(f"- {m['date']}  {m['title']}")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    return path
