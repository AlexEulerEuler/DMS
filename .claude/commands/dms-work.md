---
description: ready 이슈를 클레임해 구현하고 PR까지 — 데브 에이전트 루프 (정본: docs/policy/10-dev-workflow.md)
argument-hint: "[이슈번호]"
---

DMS 작업 루프를 수행한다. 절차의 정본은 docs/policy/10-dev-workflow.md — 먼저 읽어라.
이 커맨드는 그 절차의 실행 순서만 요약한다.

인자: `$ARGUMENTS` (이슈 번호. 비어 있으면 2단계에서 직접 고른다)

1. **컨텍스트**: 루트 AGENTS.md는 이미 읽혔다. docs/principles.md를 읽어라.
2. **작업 선택**: 이슈 번호가 없으면
   `gh issue list --label ready --search "no:assignee" --state open --json number,title,labels`
   에서 우선순위(P0>P1>P2>P3)와 area 적합성으로 하나를 골라라.
   클레임 전 `gh pr list --state open`으로 같은 area의 진행 중 PR과 파일 겹침을 확인하고, 겹치면 피하라.
3. **클레임** (10-dev-workflow §2의 프로토콜 그대로):
   assignee 비었는지 확인 → self-assign → 재조회(경합 시 늦은 쪽이 양보) →
   `work/<번호>-<slug>` 브랜치를 origin에 push (같은 계정 다중 세션의 승자 판정) →
   이슈에 클레임 코멘트 1줄.
4. **독해**: 이슈 본문의 완료 조건·비범위·컨텍스트 문서(최대 5개)와, 작업 위치의 AGENTS.md,
   해당 area 정책을 읽어라.
5. **구현**: 커밋은 Conventional Commits + `(#번호)` + `Agent: claude-code` 트레일러.
   구현 중 발견한 로그성 판단은 이슈 코멘트로 남겨라(대시보드 타임라인의 원료).
6. **셀프체크**: 품질 CI가 돌리는 명령을 로컬에서 먼저 재현하라
   (콘솔 프론트: `npm run lint:dms:frontend && npm run typecheck:dms:frontend && npm run build:dms:frontend`).
7. **PR**: `git rebase origin/main` 후 PR 생성. 템플릿의 전 섹션 작성, `Closes #번호`,
   검증 섹션에는 실행한 명령과 실제 결과를 기록하라.
7-1. **로컬 검수 (솔로 모드)**: 검수 모드가 local이면(리포에 CI용 API 키 없음 — 기본값)
   verifier 서브에이전트(.claude/agents/verifier.md)를 스폰해 방금 만든 PR을 검수시키고,
   verifier가 head SHA 마커가 포함된 리뷰 코멘트를 게시하게 하라. verdict fail이면 findings를
   먼저 해소하라(8단계 예산에 포함). 이 검수 없이는 gate가 머지를 잠근다.
8. **리뷰 대응 (예산 있음)**: gate 체크 결과를 1회 대기하라(`gh pr checks --watch`).
   fail이면 findings를 읽고 수정하라 — 수정 라운드는 **최대 2회**. 그 후에도 미해결이면
   남은 finding을 PR 코멘트로 요약하고 세션을 종료하라(사람 판단으로 이관).

금지 (AGENTS.md와 동일, 예외 없음): PR 머지, auto-merge 활성화, ready/override 라벨 부여,
main 직접 push, 리포 설정 변경. 완료 후 멈춰라 — 머지는 사람이 한다.
