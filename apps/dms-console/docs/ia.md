# DMS Console Information Architecture

> 이 문서는 최상위 IA이자 세부 IA 문서의 인덱스다. 각 페이지·공통 영역의 상세 정보구조는 `ia/` 하위 문서를 참조한다.

## 1. Product Scope

DMS Console은 입력 문서, 기존 표준 목록, 기준 일정을 기반으로 표준 목록과 생성 일정을 만들고, 관련 업무·일정·이슈·개발 작업·에이전트를 관리하는 내부 운영 콘솔이다. 특정 브랜드·도메인에 종속되지 않는 범용 구조를 지향한다.

## 2. 세부 IA 문서 인덱스

페이지 IA

- [Overview](./ia/overview.md) — 프로젝트 문서 허브, 파이프라인 입력/출력
- [Task](./ia/task.md) — 업무 정보구조(구분·세부 업무) 트리
- [WBS](./ia/wbs.md) — 진행현황, 월/주 단위 간트형 일정
- [Issues](./ia/issues.md) — 이슈·리스크·요청사항 관리
- [Work](./ia/work.md) — 개발 작업 관리(Backlog·Kanban)
- [Agent](./ia/agent.md) — 에이전트 기획(목록·상세, 텍스트 기획)

공통 영역

- [Foundation](./ia/foundation.md) — 앱 셸·글로벌 내비게이션·라우팅·공통 상태
- [Data Model](./ia/data-model.md) — 핵심 도메인 객체와 엔티티 정의
- [Status Taxonomy](./ia/status-taxonomy.md) — 상태 체계·색상·전이 규칙

## 3. Global Navigation

```text
DMS Console
├── Overview
├── Task
├── WBS
├── Issues
├── Work
└── Agent
```

- 상단: 서비스명(DMS Console), 1차 메뉴 6개, 우측 도구(설정)
- 좌측: 현재 1차 메뉴에 종속된 2차 메뉴, 선택 메뉴는 강조 표시

상세는 [Foundation](./ia/foundation.md) 참조.

## 4. Page IA 요약

| 1차 메뉴 | 2차/하위 | 세부 문서 |
|---|---|---|
| Overview | 프로젝트 문서 12종(개요·용어·파이프라인 등) | [overview.md](./ia/overview.md) |
| Task | IA 트리 | [task.md](./ia/task.md) |
| WBS | 진행현황 | [wbs.md](./ia/wbs.md) |
| Issues | 목록·등록·상세 | [issues.md](./ia/issues.md) |
| Work | Backlog·Kanban·등록·상세 | [work.md](./ia/work.md) |
| Agent | 목록·상세(기획 텍스트) | [agent.md](./ia/agent.md) |

## 5. Core Domain Objects

```text
Project
├── SourceDocument (입력 문서)
├── ExistingMasterList (기존 표준 목록)
├── BaselineSchedule (기준 일정)
├── MasterList (표준 목록)
├── GeneratedSchedule (생성 일정)
├── ExportFile (내보내기 파일)
├── TaskIA
├── WBSItem
├── Issue
├── WorkItem
└── Agent
```

필드·관계 상세는 [Data Model](./ia/data-model.md) 참조.

## 6. Status Taxonomy

- 공통: 완료 / 진행중 / 진행예정
- Agent: 기획중 / 확정 / 보류
- Issue: open / closed (GitHub 정본)
- Work: 진행예정 / 진행중 / 리뷰중 / 완료

값 정의·색상·전이 규칙은 [Status Taxonomy](./ia/status-taxonomy.md) 참조.

## 7. Primary User Flows

```text
표준 목록 자동 생성:  Overview → 입력 데이터 확인 → 문서/기준 일정 분석 → 후보 표준 목록 추출 → 생성 일정 산출 → 결과 파일 출력
업무 계획 관리:       Task IA → 업무 항목 등록 → 상태 지정 → WBS 일정 반영 → 진행률 확인
개발 작업 관리:       Issues(GitHub) → Work 작업 생성·연결 → Kanban 진행 관리 → WBS/Task 반영, PR 병합 시 이슈 close
에이전트 기획:        Agent 목록 → 등록 → 이름·설명·기획 메모 작성 → 저장·확정
```

## 8. Suggested Route Map

```text
/
/overview  /overview/glossary  /overview/pipeline  /overview/modules
/overview/api  /overview/cli  /overview/folder-structure  /overview/data
/overview/tech-stack  /overview/env  /overview/runbook  /overview/limitations

/task/ia

/wbs

/issues  /issues/new  /issues/:issueId

/work/backlog  /work/kanban  /work/new  /work/:workId

/agents  /agents/new  /agents/:agentId
```

전체 라우팅 규약은 [Foundation](./ia/foundation.md) 참조.

## 9. Navigation Depth

- 1depth: Overview, Task, WBS, Issues, Work, Agent
- 2depth: 좌측 사이드바 메뉴
- 3depth: 목록에서 진입하는 상세/편집 화면
- 4depth: 상세 화면 내부 탭(현재 미사용, Agent 고도화 시 도입)

## 10. MVP Screen Set

초기 구현 우선순위

1. Overview 프로젝트 개요
2. Task IA
3. WBS 진행현황
4. Issues 목록
5. Work Backlog
6. Agent 목록·상세

후속 확장

1. Work Kanban
2. Work 상세/편집
3. Agent 고도화(flow·플레이그라운드·실행 — LangChain·LangGraph·툴·RAG)
4. (선택) 전용 생성 실행 UI — 현 범위 생성은 CLI/백엔드, 다운로드는 Overview "주요 데이터"

## 11. 주요 결정(Resolved)

- 권한·역할: 제거. 단일 사용자·전체 권한 전제이며, 역할 기반 접근은 향후 과제([foundation.md](./ia/foundation.md)).
- 다국어(i18n): 현재 범위에서 다루지 않음(언어 선택 제거).
- 우선순위: 긴급/높음/보통/낮음(기본 보통) — 정본 [status-taxonomy.md](./ia/status-taxonomy.md) 9절.
- Issues: GitHub Issues가 정본. 콘솔은 미러/뷰(open/closed 반영, 완료·아카이브=GitHub close), 로컬 오버레이는 우선순위·연결 작업. 이슈:작업 1:N.
- Task: 세부 업무가 담당자·기한·상태의 정의처. 구분/중분류 상태·진행률은 자동 집계되어 WBS까지 자동 반영. 현재 화면은 구분–세부 2단(중분류 스키마 유지).
- Task↔WBS: WBS는 Task 세부 업무(type=task)의 시간축 투영으로 1:1 자동 파생.
- Agent: DMS 런타임 기능이 아니라 계획 단계 기획서(텍스트) 도구. flow·플레이그라운드·실행은 향후(LangChain·LangGraph·툴·RAG).
- Overview 콘텐츠: 원격 API 최신화, 메타 런타임 조회, 워크플로우 데이터 렌더.
- 라우팅: 잘못된 경로는 항상 "없음" 화면. 단일 2차 메뉴도 사이드바 표시. 좁은 화면 드로어.
- 프로젝트: 단일 프로젝트 전제(`projectId`만 유지).
- 리스트 공통 규약(정렬·필터·검색·페이지네이션): [foundation.md](./ia/foundation.md) 8.1.

- GitHub 연동: 콘솔은 읽기 전용 미러 + 새 이슈 생성(write-through). 기존 GitHub 필드 편집은 GitHub에서. 진입 시 API 조회 + 수동 새로고침(webhook 향후), 토큰/App 인증(서버 설정).
- 연결 카디널리티: 작업↔이슈·작업↔에이전트는 단수(N:1). 이슈–여러 에이전트는 여러 작업으로 표현(5.2).

논의 보류(추후): 역할별 세부 권한(다중 사용자 도입 시).
