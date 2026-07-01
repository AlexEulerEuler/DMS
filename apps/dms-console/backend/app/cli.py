"""CLI entrypoint (docs/ia/runtime.md §3): python -m app.cli generate [--draft]."""

import argparse
import sys

from app.db import init_db
from app.pipeline.generate import run_pipeline


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.cli", description="DMS Console pipeline CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    gen = sub.add_parser("generate", help="Run the generation pipeline over uploaded inputs")
    gen.add_argument("--draft", action="store_true", help="Leave the master list as draft (skip confirm)")
    gen.add_argument(
        "--formats", default="json,xlsx", help="Comma-separated export formats (json,xlsx,doc)"
    )

    args = parser.parse_args(argv)
    init_db()

    if args.command == "generate":
        formats = tuple(f.strip() for f in args.formats.split(",") if f.strip())
        summary = run_pipeline(confirm=not args.draft, export_formats=formats)
        print(
            f"생성 완료: 표준 목록 {summary.master_list_id} ({summary.version}), "
            f"항목 {summary.item_count}개 (매칭 {summary.matched_count} · 신규 {summary.new_count}), "
            f"일정 {summary.schedule_id or '없음'} (마일스톤 {summary.milestone_count}), "
            f"내보내기 {', '.join(summary.export_ids) or '없음'}"
        )
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
