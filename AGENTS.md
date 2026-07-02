# DMS 에이전트 가이드

## 이 리포가 무엇인가

DMS(Development Management System) 워크스페이스. 관리 대상 프로젝트(`apps/frontend`, `apps/backend`)와
진행 상황 미러 대시보드(`apps/dms-console/frontend`)를 담는다.
정본 원칙: **작업 상태는 GitHub(이슈·PR), 정의·정책은 리포 문서, 대시보드는 읽기 전용 투영.**
문서 지도: [docs/README.md](docs/README.md)

## 반드시 읽을 것 (순서대로)

1. [docs/principles.md](docs/principles.md) — 원칙 (1페이지)
2. 작업 위치의 `AGENTS.md` — 예: [apps/dms-console/AGENTS.md](apps/dms-console/AGENTS.md)
3. 배정된 GitHub 이슈 본문과, 이슈가 지목한 컨텍스트 문서들 (최대 5개)
4. 해당 area 정책 — [docs/policy/](docs/policy/) 하위

## 작업 절차 (요약 — 정본: [docs/policy/10-dev-workflow.md](docs/policy/10-dev-workflow.md))

- 작업 선택: `ready` 라벨 + assignee 없는 open 이슈
- 클레임: self-assign → 재확인 → `work/<이슈번호>-<slug>` 브랜치 push (먼저 push한 세션이 승자)
- 구현: area 정책 준수, 커밋은 Conventional Commits + `(#이슈)` + `Agent:` 트레일러
- PR: 템플릿 섹션 전부 작성, `Closes #이슈` 필수, 완료 조건 검증 결과 기록
- 리뷰 대응: gate 체크 결과 1회 대기 + 수정 최대 2라운드, 이후 미해결은 PR 코멘트 요약 후 종료

## 금지 (예외 없음)

- **PR 머지 금지** — 머지는 사람만 한다 (T0 auto-merge는 gate가 활성화)
- **auto-merge 활성화 금지**, `ready`·override 라벨 부여 금지
- main 직접 push, 보호 규칙·리포 설정 변경, 시크릿 접근 금지
- 문서 충돌 시 임의 해석 금지 — `type:docs` 이슈를 열 것
- 이슈 없는 작업 착수 금지 (`hotfix/`는 사후 이슈 필수)
