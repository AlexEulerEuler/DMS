# dms-console 스코프 가이드

DMS 진행 상황 대시보드 — **읽기 전용 투영**. GitHub(이슈·PR·커밋)과 리포 문서를 조회해 렌더할 뿐,
도메인 데이터를 소유하거나 쓰지 않는다. 작업 흐름의 필수 경로가 아니다(꺼져 있어도 개발은 진행된다).

## 구조

- `frontend/` — Next.js App Router 단독 앱 (Vercel 배포 대상). 백엔드 없음.
  - `src/lib/github.ts` — GitHub API·리포 문서 조회 데이터층 (서버 전용, revalidate 캐시)
  - `src/lib/derive.ts` — 상태 유도(칸반 단계·진척률). 규칙 정본: [/docs/policy/10-dev-workflow.md §1·§5](../../docs/policy/10-dev-workflow.md)
  - `src/app/` — overview(홈+문서), task, wbs, issues, work, agents(활동)
- `docs/ia/` — 화면 IA 정본, `docs/spec/` — 화면·컴포넌트·토큰 스펙

## 명령

```bash
npm run dev:dms:frontend        # 개발 서버 (리포 루트에서)
npm run lint:dms:frontend
npm run typecheck:dms:frontend
npm run build:dms:frontend
```

## 규칙

- 대시보드에 쓰기 경로를 추가하지 않는다 (GitHub로의 write-through 포함 — ADR-0002)
- 상태를 저장하지 않는다 — 매 요청 GitHub에서 유도 (fetch 캐시 revalidate로 완충)
- 유도 규칙(칸반 단계·티어·라벨)은 정책 문서의 표를 구현한다 — 새 규칙을 여기서 발명하지 않는다
- 환경변수: `DMS_GITHUB_OWNER`, `DMS_GITHUB_REPO`, `GITHUB_TOKEN`(읽기 전용 PAT, 선택 — 없으면 저율 한도)
