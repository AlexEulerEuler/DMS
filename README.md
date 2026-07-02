# DMS

Development Management System — 에이전트 위임 개발을 위한 git-native 워크스페이스.

**정본 원칙 (ADR-0002)**: 작업 상태의 정본은 GitHub(이슈·PR·커밋), 정의·정책의 정본은 리포 문서,
대시보드는 읽기 전용 투영이다. 개발자(사람/에이전트)에게 필요한 것은 `git clone` + `gh` CLI + 코딩 에이전트뿐이다.

- **사용 가이드: [docs/guide.md](docs/guide.md)** — 일상 사용법 한 장 요약
- 에이전트 진입점: [AGENTS.md](AGENTS.md) · 문서 지도: [docs/README.md](docs/README.md)
- 작업 절차 정본: [docs/policy/10-dev-workflow.md](docs/policy/10-dev-workflow.md)
- 전환 결정 기록: [docs/decisions/0002-git-native-agent-workflow.md](docs/decisions/0002-git-native-agent-workflow.md)

## Directory Structure

```text
DMS/
├── AGENTS.md / CLAUDE.md   # 에이전트 진입점 (CLAUDE.md는 포인터)
├── .claude/                # 에이전트 킷: /dms-work·/dms-review·/dms-test 커맨드, 역할 정의, 가드 훅
├── .github/                # 이슈 폼·PR 템플릿·gate/quality CI·CODEOWNERS
├── docs/                   # 원칙·정책(playbooks 포함)·템플릿·결정(ADR)·계획(plan/tasks.yaml)·용어·아카이브
├── apps/
│   ├── frontend/           # 관리 대상 프로젝트 프론트엔드 (콘솔 코드 금지)
│   ├── backend/            # 관리 대상 프로젝트 백엔드 (콘솔 코드 금지)
│   └── dms-console/
│       ├── frontend/       # 진행 상황 대시보드 — Next.js 단독, GitHub 직접 조회 (Vercel 배포)
│       └── docs/           # 콘솔 IA·화면 스펙
├── packages/ · infra/
└── scripts/                # gate 검사, GitHub 부트스트랩 등
```

## 작업 흐름 (요약 — 정본: docs/policy/10-dev-workflow.md)

1. 사람이 이슈(작업 정의)를 만들고 `ready` 라벨로 착수를 승인한다.
2. 개발자의 에이전트가 `/dms-work`로 클레임 → `work/<이슈번호>-<slug>` 브랜치 → 구현 → PR.
3. gate CI(required check)가 규약 검사 + 티어 판정 + 에이전트 검수를 수행한다.
4. T0(문서·잡무)은 자동 머지, T1(코드)은 사람이 검수 리포트를 읽고 머지, T2(정책·CI)는 24h 쿨다운 + 정독.
5. 대시보드가 진행 상황·타임라인·활동을 자동으로 비춘다 — 별도 보고 없음.

## Development (대시보드)

```bash
npm install
npm run dev:dms:frontend     # http://localhost:3000
npm run lint:dms:frontend && npm run typecheck:dms:frontend && npm run build:dms:frontend
```

환경변수(선택): `DMS_GITHUB_OWNER`, `DMS_GITHUB_REPO`, `GITHUB_TOKEN`(읽기 전용 PAT — 없으면 저율 한도).
로컬 실행 시 문서 브라우저는 리포 파일시스템을 직접 읽는다.

## 최초 설정 (오너 1회)

```bash
./scripts/bootstrap_github.sh   # 리포 공개 전환·라벨·브랜치 보호·권한 축소 (admin 토큰 필요)
```

이후 남은 수동 단계(시크릿·에이전트용 fine-grained PAT·Vercel)는 스크립트 말미 안내와
[docs/policy/30-ops-policy.md](docs/policy/30-ops-policy.md)를 따른다.
