# DMS Console — 개발 착수 스펙 (기준 문서)

> 범위: `apps/dms-console` 콘솔 한정. 정보구조 정본은 [../ia.md](../ia.md)와 [../ia/](../ia/)이며, 이 `spec/` 폴더는 그 IA를 개발 가능한 수준으로 구체화한다. 이 README는 모든 스펙 문서가 공유하는 단일 기준(SoT)이다 — enum·색·규약은 여기 값을 그대로 쓴다.

## 1. 기술 가정

구현 스택이 확정되면 조정한다(현재 가정).

- 프론트엔드: TypeScript + React (SPA, 클라이언트 라우팅)
- 백엔드 API: REST(JSON). 본 스펙은 OpenAPI 스타일로 계약을 기술한다.
- 스타일: 디자인 토큰을 CSS 변수로 노출(+ JSON 미러). 다국어 없음(한국어 단일).
- 상태 관리·번들러 등 세부는 구현 재량.

## 2. 스펙 문서 구성

- [data-schema.md](./data-schema.md) — 엔티티 TypeScript 타입·enum
- [api-contract.md](./api-contract.md) — 콘솔 REST API + GitHub 연동
- [design-tokens.md](./design-tokens.md) — 색·타이포·간격 토큰
- [components.md](./components.md) — 공통 컴포넌트 스펙
- [screens.md](./screens.md) — 라우트별 화면 개발 스펙·수용 기준

## 3. Canonical Enums (전 문서 동일 사용)

English key + 한국어 라벨. 코드에서는 key를, 화면에서는 라벨을 쓴다.

```ts
type CommonStatus = 'planned' | 'in_progress' | 'done';                 // 진행예정 / 진행중 / 완료
type WorkStatus   = 'planned' | 'in_progress' | 'review' | 'done';      // 진행예정 / 진행중 / 리뷰중 / 완료
type AgentStatus  = 'draft' | 'confirmed' | 'on_hold';                  // 기획중 / 확정 / 보류
type IssueState   = 'open' | 'closed';                                  // GitHub 정본
type Priority     = 'urgent' | 'high' | 'normal' | 'low';               // 긴급 / 높음 / 보통 / 낮음 (기본 normal)
type TaskNodeType = 'category' | 'group' | 'task';                      // 구분 / 중분류 / 세부 업무
type ExportFormat = 'json' | 'xlsx' | 'doc';
type ParsedStatus = 'pending' | 'processing' | 'done' | 'error';        // 파이프라인 처리(최소 enum)
type MasterListStatus = 'draft' | 'confirmed';                         // 초안 / 확정
```

Kanban 열 ↔ WorkStatus: Todo=planned, In Progress=in_progress, Review=review, Done=done.

## 4. Canonical 색 팔레트 (hex)

- 선택/primary: `#2563EB`, 선택 배경 tint: `#EFF6FF`
- 상태: done `#2563EB`(파랑) · in_progress `#16A34A`(초록) · planned `#9CA3AF`(회색)
- 정지/보류(on_hold): `#F59E0B`(앰버)
- 우선순위: urgent `#DC2626` · high `#EA580C` · normal `#6B7280` · low `#D1D5DB`
- 뉴트럴: bg `#FFFFFF` · surface `#F9FAFB` · border `#E5E7EB` · text `#111827` · textMuted `#6B7280`
- 시맨틱: error `#DC2626` · success `#16A34A` · warning `#F59E0B` · info `#2563EB`

색은 항상 텍스트 라벨과 함께 노출(색만으로 의미 구분 금지 — status-taxonomy 5절).

## 5. 리스트 공통 규약 (확정)

- 페이지네이션: 페이지 기반, 페이지 크기 25(무한 스크롤 아님).
- 정렬 기본: 등록일 최신순. Issues는 우선순위(urgent→low) → 등록일.
- 필터: 상태 필터 기본. Issues는 우선순위 필터 추가.
- 빈/로딩/에러/없음: foundation 공통 상태 셸 재사용.

## 6. 인증·연동 (확정)

- GitHub: 서버에 GitHub 토큰/App 설정(단일 사용자). 콘솔은 읽기 전용 미러 + 새 이슈 생성(write-through). 조회는 진입 시 + 수동 새로고침(webhook은 향후).
- 콘솔 자체 API: 단일 사용자 전제, 역할·권한 없음(전체 접근).

## 7. 라우트 (foundation 6절과 동일)

```text
/  /overview  /overview/:slug
/task/ia
/wbs
/issues  /issues/new  /issues/:issueId
/work/backlog  /work/kanban  /work/new  /work/:workId
/agents  /agents/new  /agents/:agentId
```

정의되지 않은 경로·식별자는 "없음" 화면(리다이렉트 없음). 모듈 루트→기본 화면 리다이렉트만 예외.
