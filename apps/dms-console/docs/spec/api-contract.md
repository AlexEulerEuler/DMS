---
layer: spec
status: superseded
owner: product-owner
superseded_by: ../../../../docs/decisions/0002-git-native-agent-workflow.md
---

> **[SUPERSEDED]** 이 계약이 기술하던 콘솔 REST 백엔드는 [ADR-0002](../../../../docs/decisions/0002-git-native-agent-workflow.md)로
> 제거되었다. 현행 데이터 경로는 프론트엔드 내부의 GitHub 직접 조회 라우트(`/api/gh/*`,
> `frontend/src/lib/server/`)이며, 라벨·상태 유도 규약의 정본은 [docs/policy/10-dev-workflow.md](../../../../docs/policy/10-dev-workflow.md)다.
> 아래 원문은 기록으로 보존한다.

# API Contract — 콘솔 REST API + GitHub 연동

> 범위: `apps/dms-console` 콘솔 한정. 이 문서는 콘솔 프론트엔드가 호출하는 REST API 계약과, 그 중 GitHub Issues를 프록시하는 연동 규약을 정의한다. 값·enum·페이지네이션·인증의 단일 기준(SoT)은 [README.md](./README.md)이며, 요청/응답 스키마의 타입명은 [data-schema.md](./data-schema.md)(엔티티 TypeScript 타입, 작성 예정) 및 [../ia/data-model.md](../ia/data-model.md)를 인용한다. IA·README와 모순되면 그쪽을 우선하며, 발견한 불일치는 12절에 모은다.

## 1. 공통 규약

### 1.1 기본 (Base)

- 베이스 URL: 모든 콘솔 API는 `/api` 하위에 둔다. 예) `GET /api/tasks`.
- 콘텐츠 타입: 요청/응답 본문은 `application/json; charset=utf-8`.
- 단일 프로젝트 전제: 콘솔은 단일 사용자·단일 프로젝트 운영을 전제로 한다(README §6). 대부분의 리소스는 현재 프로젝트에 암묵적으로 소속되며, `projectId`는 스키마에는 유지하되 요청에서 생략·서버 고정할 수 있다(data-model §6, §3.1).
- 시각 표기: `createdAt`/`updatedAt` 등 datetime 필드는 ISO 8601(UTC, 예 `2026-07-01T09:30:00Z`), `startDate`/`endDate` 등 date 필드는 `YYYY-MM-DD`.
- 식별자: 콘솔 자체 엔티티의 `id`는 문자열, Issue의 `id`(=GitHub 이슈 번호)만 number다(data-model §3.6, §6).

### 1.2 인증

- 콘솔 자체 API: 단일 사용자 전제로 역할·권한이 없다(전체 접근). 콘솔↔서버 인증 방식(세션·토큰 유무)은 구현 재량이며 본 계약에서 값을 규정하지 않는다.
- GitHub 프록시: 서버가 보유한 GitHub 토큰/App으로 GitHub REST를 호출한다. 자격증명은 서버에만 존재하고 콘솔·응답에 노출하지 않는다(README §6, 값 미기재). 상세는 8절.

### 1.3 페이지네이션 (리스트 공통)

목록형 응답은 페이지 기반 페이지네이션을 쓴다(README §5 — 무한 스크롤 아님, 페이지 크기 25 고정).

- 요청 쿼리: `page`(1-기반, 기본 1), `size`(기본·최대 25).
- 응답 봉투: 목록은 아래 형태로 감싸고, 헤더 요약(총 개수)에 쓸 `total`과 현재 `page`를 함께 반환한다.

```json
{
  "items": [ /* 엔티티 배열 */ ],
  "total": 137,
  "page": 1,
  "size": 25
}
```

- 정렬 기본: 등록일(`createdAt`) 최신순. 단, Issues는 우선순위(긴급→낮음) → 등록일 순(README §5, status-taxonomy §9).
- 필터: 상태 필터를 기본 제공. Issues는 상태(`state`) + 우선순위(`priority`) 필터를 제공한다. 값 목록은 3절 enum을 따른다.
- 검색: 제목 기준 텍스트 검색이 필요한 목록은 `q` 쿼리를 받는다(foundation §8.1).

### 1.4 에러 모델

실패 응답은 표준 상태코드 + 아래 본문을 반환한다.

```json
{
  "error": {
    "code": "not_found",
    "message": "해당 리소스를 찾을 수 없습니다."
  }
}
```

- `error.code`: 기계 판별용 문자열(snake_case). `error.message`: 사람이 읽는 한국어 설명.
- 대표 코드: `bad_request`, `validation_error`, `not_found`, `conflict`, `github_error`(GitHub 프록시 실패), `rate_limited`(GitHub 레이트리밋), `internal_error`.

### 1.5 표준 상태코드

| 코드 | 사용처 |
| --- | --- |
| 200 OK | 조회·수정 성공(본문 반환) |
| 201 Created | 생성 성공(생성된 리소스 반환) |
| 204 No Content | 삭제 성공(본문 없음) |
| 400 Bad Request | 잘못된 요청/유효성 실패(`validation_error`) |
| 404 Not Found | 없는 라우트·식별자(UI는 "없음" 화면) |
| 409 Conflict | 상태 충돌(예: 이미 존재) |
| 422 Unprocessable Entity | 의미상 처리 불가한 입력(선택 사용) |
| 429 Too Many Requests | GitHub 레이트리밋 초과(`rate_limited`) |
| 5xx | 서버·업스트림(GitHub) 오류(`internal_error`/`github_error`) |

- 404·5xx·429는 foundation 공통 상태 셸(not-found/error)로 렌더된다(foundation §8).

## 2. 모듈별 엔드포인트 개요

| 모듈 | 메서드·경로 | 용도 |
| --- | --- | --- |
| Overview | `GET /api/overview/meta` | 프로젝트 메타 + 파이프라인 요약 |
| Overview | `GET /api/overview/docs/:slug` | 문서 콘텐츠 1건 |
| Overview | `GET /api/overview/outputs` | 산출물 조회 + 다운로드 링크 |
| Task | `GET /api/tasks` | IA 트리 조회 |
| Task | `POST /api/tasks` | 노드 생성 |
| Task | `PATCH /api/tasks/:id` | 노드 수정 |
| Task | `DELETE /api/tasks/:id` | 노드 삭제(연쇄) |
| WBS | `GET /api/wbs` | Task 파생 투영(읽기 전용) |
| Work | `GET /api/work` | 목록(backlog/kanban) |
| Work | `POST /api/work` | 작업 생성 |
| Work | `GET/PATCH/DELETE /api/work/:id` | 작업 상세·수정·삭제 |
| Agent | `GET /api/agents` | 목록 |
| Agent | `POST /api/agents` | 생성 |
| Agent | `GET/PATCH/DELETE /api/agents/:id` | 상세·수정·삭제 |
| Issues | `GET /api/issues` | GitHub 미러 + 오버레이 병합 목록 |
| Issues | `GET /api/issues/:number` | 이슈 상세 |
| Issues | `POST /api/issues` | GitHub write-through 생성 |
| Issues | `PATCH /api/issues/:number/overlay` | 로컬 오버레이(priority·linkedWorkItems)만 수정 |

## 3. Canonical Enums (요청·응답 공통)

enum 값은 README §3을 그대로 사용한다(코드=key, 화면=라벨). 요청/응답에서는 key를 값으로 전송한다.

```ts
type CommonStatus = 'planned' | 'in_progress' | 'done';                 // TaskIA·WBSItem
type WorkStatus   = 'planned' | 'in_progress' | 'review' | 'done';      // WorkItem
type AgentStatus  = 'draft' | 'confirmed' | 'on_hold';                  // Agent
type IssueState   = 'open' | 'closed';                                  // Issue(GitHub 정본)
type Priority     = 'urgent' | 'high' | 'normal' | 'low';               // 기본 normal
type TaskNodeType = 'category' | 'group' | 'task';                      // TaskIA.type
type ExportFormat = 'json' | 'xlsx' | 'doc';                            // ExportFile.format
type ParsedStatus = 'pending' | 'processing' | 'done' | 'error';
type MasterListStatus = 'draft' | 'confirmed';
```

- Kanban 열 ↔ WorkStatus: Todo=`planned`, In Progress=`in_progress`, Review=`review`, Done=`done`(README §3).

## 4. Overview

읽기 전용. 문서 콘텐츠·메타·산출물을 원격 조회한다(overview §6, §8). 편집·생성 액션은 없다(파이프라인 실행은 CLI/백엔드 담당).

### 4.1 `GET /api/overview/meta`

프로젝트 메타(`ProjectMeta`)와 파이프라인 요약(`PipelineSummary`)을 반환한다.

```http
GET /api/overview/meta
```

응답 `200`:

```json
{
  "meta": {
    "version": "0.4.1",
    "language": "TypeScript / Node 20",
    "branch": "main",
    "package": "dms-console",
    "apiEndpoint": "/api"
  },
  "pipeline": {
    "inputs": [
      { "key": "input1", "title": "입력 문서", "description": "생성 기준 원본" },
      { "key": "input2", "title": "기존 표준 목록", "description": "참조 목록" },
      { "key": "input3", "title": "기준 일정", "description": "일정 기준선" }
    ],
    "outputs": [
      { "title": "표준 목록", "description": "..." },
      { "title": "생성 일정", "description": "..." },
      { "title": "내보내기 파일", "description": "..." }
    ],
    "workflowSteps": [
      { "order": 1, "label": "업로드" },
      { "order": 2, "label": "..." }
    ]
  }
}
```

- `meta`는 `ProjectMeta`(version, language, branch, package, apiEndpoint), `pipeline`은 `PipelineSummary`(inputs/outputs/workflowSteps) 타입을 따른다(overview §6, data-model §3.1).
- 메타 일부 누락은 정상이며, 값 없는 필드는 생략한다(overview §10 — 값 없는 칩 숨김).

### 4.2 `GET /api/overview/docs/:slug`

문서 1건의 콘텐츠를 반환한다. `:slug`는 12개 고정 슬러그 중 하나(overview §3, foundation §6).

- 허용 slug: `overview`(기본, "프로젝트 개요") · `glossary` · `pipeline` · `modules` · `api` · `cli` · `folder-structure` · `data` · `tech-stack` · `env` · `runbook` · `limitations`.

```http
GET /api/overview/docs/glossary
```

응답 `200`:

```json
{
  "slug": "glossary",
  "title": "도메인 용어",
  "content": "..."
}
```

- `content` 렌더 형식(마크다운/구조화 블록)은 구현 재량. 특정 문서는 표(글로서리·API 목록 등) 구조를 담을 수 있다.
- 미정의 slug: `404`(`not_found`). UI는 "없음" 화면으로 처리한다(overview §10, foundation §7).
- 표시할 내용이 아직 없으면 `200` + 빈 콘텐츠(empty 상태 안내로 렌더).

### 4.3 `GET /api/overview/outputs`

"주요 데이터"(`/overview/data`)용. 생성 산출물 세 유형과 다운로드 링크를 반환한다(overview §3, §8 — 조회·다운로드까지만).

```http
GET /api/overview/outputs
```

응답 `200`:

```json
{
  "masterLists": [
    { "id": "ml_01", "version": "v3", "status": "confirmed", "generatedAt": "2026-06-20T00:00:00Z", "downloadUrl": "/api/overview/outputs/master-list/ml_01/download" }
  ],
  "generatedSchedules": [
    { "id": "gs_01", "basedOn": "bs_01", "generatedAt": "2026-06-21T00:00:00Z", "downloadUrl": "..." }
  ],
  "exportFiles": [
    { "id": "ex_01", "format": "xlsx", "sourceOutput": "ml_01", "createdAt": "2026-06-22T00:00:00Z", "downloadUrl": "/api/overview/outputs/export/ex_01/download" }
  ]
}
```

- 각 항목은 `MasterList` / `GeneratedSchedule` / `ExportFile` 타입 필드(data-model §3.3)에 다운로드 링크를 더한 형태다. `ExportFile.format`은 `ExportFormat` enum.
- 다운로드 링크(`downloadUrl`)는 파일 바이너리를 반환하는 GET 엔드포인트다. 응답은 파일 스트림(`Content-Disposition: attachment`)이며, 존재하지 않으면 `404`.
- 산출물 미제공: 해당 배열을 비워 반환하고, 화면은 안내 문구로 대체한다(overview §10).

## 5. Task (IA 트리)

TaskIA 노드는 자기참조 트리다. 세부 업무(`type=task`)가 담당자·기한·상태·진행률의 정의처이며, 등록 시 WBSItem이 1:1 파생된다(task §6, data-model §3.4·§4).

### 5.1 `GET /api/tasks` — 트리 조회

전체 트리를 반환한다. 목록형이지만 트리 특성상 페이지네이션 없이 프로젝트의 노드 전체를 내려주는 것을 기본으로 한다(화면은 펼침/접힘으로 탐색 — task §3).

```http
GET /api/tasks?status=in_progress
```

쿼리:

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `status` | `CommonStatus` | 세부 업무 상태 필터(전체는 생략). status-taxonomy §7의 "전체/완료/진행중/진행예정"에 대응 |

응답 `200`: `TaskIA` 노드 배열. 계층은 `parentId`로 표현하며, 클라이언트가 트리로 조립하거나 서버가 중첩 형태로 내려주는 방식 중 하나를 쓴다(구현 재량). 각 노드 필드는 data-model §3.4를 따른다(`id`, `type`, `title`, `parentId`, `status`, `owner`, `startDate`, `endDate`, `progress`, `order`, `linkedWbsId`, `createdAt`, `updatedAt`).

- 구분/중분류(`category`/`group`)의 `status`·`progress`는 하위 세부 업무 집계로 서버가 산출해 내려준다(수동 지정 아님 — task §6).
- 상태 필터 결과가 비어도 트리 골격(상위 노드)은 유지한다(task §10).

### 5.2 `POST /api/tasks` — 노드 생성

```http
POST /api/tasks
Content-Type: application/json

{
  "type": "task",
  "title": "문서별 제출 일정 생성",
  "parentId": "cat_04",
  "status": "planned",
  "owner": "담당자명",
  "startDate": "2026-07-10",
  "endDate": "2026-07-20"
}
```

- 요청은 `TaskIA`의 생성 가능 필드다. `type`·`title` 필수, `parentId`는 구분(category)일 때 null. 상태·담당·기한·진행률은 세부 업무에서만 의미를 가진다.
- 계층 깊이는 구분–중분류–세부 업무 3단을 초과할 수 없다(task §10 — 초과 시 `400 validation_error`).
- 응답 `201`: 생성된 `TaskIA` 노드. 세부 업무(`type=task`) 생성 시 대응 WBSItem이 서버에서 1:1 자동 파생되고 `linkedWbsId`가 채워진다(task §6, data-model §4).

### 5.3 `PATCH /api/tasks/:id` — 노드 수정

```http
PATCH /api/tasks/task_12
Content-Type: application/json

{ "status": "in_progress", "endDate": "2026-07-25" }
```

- 부분 수정. 세부 업무의 상태·일정 변경은 파생 WBSItem 투영과 진행률에 자동 반영된다(task §8, wbs §6).
- 트리 이동(재부모)은 `parentId` 변경으로 표현하며, 하위 노드가 함께 따라간다(task §10 — 이동은 재부모).
- 응답 `200`: 수정된 노드. 없는 `:id`는 `404`.

### 5.4 `DELETE /api/tasks/:id` — 노드 삭제(연쇄)

```http
DELETE /api/tasks/cat_04
```

- 구분·중분류 삭제는 하위를 연쇄 삭제한다(task §10 — 확인 후 연쇄 삭제). 삭제 확인 UI는 화면 책임이며, API는 연쇄 삭제를 수행한다.
- 세부 업무 삭제 시 파생 WBSItem도 함께 제거된다(1:1 파생 관계 — data-model §4).
- 응답 `204`. 없는 `:id`는 `404`.

## 6. WBS (Task 파생 투영, 읽기 전용)

WBSItem은 Task 세부 업무(`type=task`)에서 파생된 시간축 투영이며 별도 저장하지 않는다. WBS는 조회만 제공하고 편집은 Task에서 한다(wbs §1·§6, data-model §3.5).

### 6.1 `GET /api/wbs`

```http
GET /api/wbs
```

응답 `200`:

```json
{
  "items": [
    {
      "id": "task_03",
      "group": "데이터 준비",
      "title": "입력 문서 수집",
      "status": "done",
      "owner": "담당자명",
      "startDate": "2026-02-03",
      "endDate": "2026-02-14",
      "progress": 100,
      "order": 1
    }
  ],
  "milestones": [
    { "id": "ms_01", "type": "A", "label": "1차 제출", "date": "2026-03-31" }
  ],
  "overallProgress": 62,
  "timeAxis": { "startDate": "2026-02-01", "endDate": "2026-05-31" }
}
```

- `items`: `WBSItem` 배열. 모든 필드는 대응 TaskIA에서 투영된 값이며 읽기 전용이다(data-model §3.5). `group`은 상위 구분(category) title 비정규화값.
- `milestones`: 생성 일정(GeneratedSchedule)의 마일스톤을 그리드에 표기하기 위한 목록(제출 마일스톤 유형 A/B — wbs §5·§8). `Milestone` 타입(data-model §3.3의 GeneratedSchedule.milestones).
- `overallProgress`: 전체 진행률(단순 평균, 0~100). 산출식은 wbs §7.3(완료=100·진행중=50·진행예정=0, `progress` 있으면 우선).
- `timeAxis`: 전체 항목의 최소 `startDate`~최대 `endDate`. 시간축(월/주차)은 저장값이 아니라 이 범위에서 파생 계산한다(wbs §6). 서버가 경계만 내려주고 월/주 분할은 클라이언트가 계산하는 방식을 기본으로 한다.
- 쓰기 메서드(POST/PATCH/DELETE)는 제공하지 않는다(읽기 전용). 일정·진행 편집은 Task API(5절)로 한다.
- 업무 0건: `items` 빈 배열, `overallProgress`는 0 또는 미표시(wbs §10).

## 7. Work (Backlog / Kanban)

동일한 WorkItem 집합을 backlog(테이블)·kanban(보드) 두 뷰로 표현한다. 데이터는 하나이며 상태 값을 양방향 공유한다(work §1·§6·§7).

### 7.1 `GET /api/work` — 목록

```http
GET /api/work?view=kanban&status=in_progress&page=1&size=25
```

쿼리:

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `view` | `backlog` \| `kanban` | 표현 뷰. 기본 `backlog`. kanban은 상태별 열 구성에 쓴다 |
| `status` | `WorkStatus` | 상태 필터(backlog 목록·kanban 열 필터) |
| `q` | string | 제목 검색(backlog — foundation §8.1) |
| `page`, `size` | number | 페이지네이션(§1.3). `size` 기본·최대 25 |

- `view=backlog`: 페이지네이션된 목록. 정렬 등록일 최신순(work §12).
- `view=kanban`: 보드 구성용. 상태별로 카드를 묶어 내려주거나, 평면 목록 + 클라이언트 그룹핑 중 하나(구현 재량). 어느 쪽이든 응답 봉투는 §1.3을 따르고 카드 필드는 `WorkItem`을 쓴다.

응답 `200`(페이지 봉투):

```json
{
  "items": [
    {
      "id": "work_07",
      "title": "비교 로직 구현",
      "owner": "담당자명",
      "status": "in_progress",
      "startDate": "2026-03-02",
      "endDate": "2026-03-20",
      "description": "...",
      "linkedIssue": "42",
      "linkedAgent": null
    }
  ],
  "total": 18,
  "page": 1,
  "size": 25
}
```

- 각 항목은 `WorkItem` 타입(data-model §3.7). `linkedIssue`(N:1, Issue 참조)·`linkedAgent`(N:1, Agent 참조)는 각각 0..1이며 없으면 null(work §6).

### 7.2 `POST /api/work` — 작업 생성

```http
POST /api/work
Content-Type: application/json

{
  "title": "비교 로직 구현",
  "owner": "담당자명",
  "status": "planned",
  "startDate": "2026-03-02",
  "endDate": "2026-03-20",
  "description": "...",
  "linkedIssue": "42",
  "linkedAgent": "agent_03"
}
```

- 요청은 `WorkItem` 생성 필드. `title` 필수, 나머지 선택. `status` 생략 시 기본 `planned`(Kanban Todo).
- `endDate < startDate`는 `400 validation_error`(work §10). 담당·일정 미지정 등록은 허용(미지정 상태로 구분 표시).
- 응답 `201`: 생성된 `WorkItem`.

### 7.3 `GET /api/work/:id`

```http
GET /api/work/work_07
```

- 응답 `200`: `WorkItem` 1건. 없는 `:id`는 `404`(work §10 — 오류 안내·목록 복귀).

### 7.4 `PATCH /api/work/:id`

```http
PATCH /api/work/work_07
Content-Type: application/json

{ "status": "review" }
```

- 부분 수정. Kanban 드래그로 인한 열 이동, backlog·상세에서의 상태 변경 모두 이 엔드포인트로 상태를 갱신한다. 두 뷰가 같은 값을 공유하므로 변경은 즉시 상호 반영된다(work §7.1). 상태 변경은 WBS/Task 진행률에도 자동 반영된다(work §12).
- 연결 이슈/에이전트가 삭제된 경우 연결은 끊어진 링크로 처리되며, 값 자체는 그대로 둘 수 있다(work §10).
- 응답 `200`: 수정된 `WorkItem`. 없는 `:id`는 `404`.

### 7.5 `DELETE /api/work/:id`

```http
DELETE /api/work/work_07
```

- 응답 `204`. 없는 `:id`는 `404`.

## 8. Agent (기획 텍스트)

에이전트 기획을 텍스트로 관리한다. 런타임 실행 대상이 아니며 `systemPrompt`·`flowDefinition` 등 실행 구조는 현 범위에 없다(agent/data-model §3.8). 라우트 경로는 복수형 `/agents`를 쓴다(foundation §6 — 라벨 Agent ↔ 경로 `/agents`, 유일한 예외).

### 8.1 `GET /api/agents` — 목록

```http
GET /api/agents?status=confirmed&q=검색어&page=1&size=25
```

쿼리:

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `status` | `AgentStatus` | 기획 상태 필터(`draft`/`confirmed`/`on_hold`) |
| `q` | string | 이름 검색(foundation §8.1) |
| `page`, `size` | number | 페이지네이션(§1.3) |

응답 `200`(페이지 봉투): `items`는 `Agent` 배열. 정렬 등록일 최신순.

```json
{
  "items": [
    {
      "id": "agent_03",
      "name": "표준 목록 정합 에이전트",
      "status": "draft",
      "description": "한 줄 설명",
      "planNote": "기획 메모(자유 텍스트)",
      "references": ["https://..."],
      "createdAt": "2026-06-10T00:00:00Z",
      "updatedAt": "2026-06-18T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "size": 25
}
```

### 8.2 `POST /api/agents` — 생성

```http
POST /api/agents
Content-Type: application/json

{ "name": "표준 목록 정합 에이전트", "status": "draft", "description": "...", "planNote": "..." }
```

- 요청은 `Agent` 생성 필드. `name` 필수. `status` 생략 시 기본 `draft`(기획중 — status-taxonomy §3.1).
- 응답 `201`: 생성된 `Agent`.

### 8.3 `GET /api/agents/:id`

- 응답 `200`: `Agent` 1건. 없는 `:id`는 `404`.

### 8.4 `PATCH /api/agents/:id`

```http
PATCH /api/agents/agent_03
Content-Type: application/json

{ "status": "confirmed", "planNote": "..." }
```

- 부분 수정. 상태 전이는 기획중→확정, 기획중↔보류(재개 시 기획중)를 따른다(status-taxonomy §6.2).
- 응답 `200`: 수정된 `Agent`. 없는 `:id`는 `404`.

### 8.5 `DELETE /api/agents/:id`

- 응답 `204`. 없는 `:id`는 `404`. 이 Agent를 참조하던 WorkItem의 `linkedAgent`는 끊어진 링크로 처리된다(work §10).

## 9. Issues (GitHub 미러 + 로컬 오버레이)

이슈의 정본은 GitHub다. 제목·본문·상태·라벨·담당자·등록일·원문 링크는 GitHub에서 오고, 콘솔은 `priority`·`linkedWorkItems`만 로컬 저장(오버레이)한다. 콘솔이 쓰는 것은 새 이슈 생성(write-through)·오버레이뿐이며, 기존 GitHub 필드는 편집하지 않고 원문 링크로 넘긴다(issues §1·§8, data-model §3.6). GitHub 프록시·인증·동기화·레이트리밋은 10절에 정리한다.

- 경로 파라미터: API는 이슈 번호를 `:number`로 받는다. 이는 GitHub 이슈 번호이자 `Issue.id`(number)이며, UI 라우트의 `:issueId`(data-model §6)와 동일한 값이다.

### 9.1 `GET /api/issues` — 목록 (미러+오버레이 병합)

진입 시 GitHub에서 이슈를 조회하고, 로컬 오버레이(priority·linkedWorkItems)를 병합해 반환한다.

```http
GET /api/issues?state=open&priority=high&page=1&size=25
```

쿼리:

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `state` | `IssueState` | `open`(기본, 열린 이슈) \| `closed`(아카이브 필터) |
| `priority` | `Priority` | 우선순위 필터(콘솔 로컬 축) |
| `q` | string | 제목 검색 |
| `page`, `size` | number | 페이지네이션(§1.3) |

- 정렬: 우선순위(긴급→낮음) → 등록일 최신순(README §5, status-taxonomy §9). 우선순위는 로컬 오버레이 값 기준이며, 미지정은 기본 `normal`로 간주해 정렬한다(issues §10).
- 기본은 `open`만 노출. `closed`는 아카이브 필터로 조회한다(issues §3·§7).

응답 `200`(페이지 봉투): `items`는 병합된 `Issue` 배열(GitHub 필드 + `priority`·`linkedWorkItems`).

```json
{
  "items": [
    {
      "id": 42,
      "title": "표준 목록 매칭 오류",
      "body": "...",
      "state": "open",
      "labels": ["bug"],
      "assignee": "octocat",
      "createdAt": "2026-06-15T00:00:00Z",
      "htmlUrl": "https://github.com/<owner>/<repo>/issues/42",
      "priority": "high",
      "linkedWorkItems": ["work_07", "work_09"]
    }
  ],
  "total": 12,
  "page": 1,
  "size": 25
}
```

- 필드 출처: `id`·`title`·`body`·`state`·`labels`·`assignee`·`createdAt`·`htmlUrl`는 GitHub, `priority`·`linkedWorkItems`는 콘솔 로컬(data-model §3.6).
- 우선순위 미지정 이슈는 `priority: "normal"`로 반환(기본값 — issues §10).
- GitHub 연동 실패 시 `502/500 github_error`(레이트리밋은 `429 rate_limited`). UI는 error 상태로 재시도 제공(issues §10).

### 9.2 `GET /api/issues/:number` — 상세

```http
GET /api/issues/42
```

- 응답 `200`: 병합된 `Issue` 1건(9.1과 동일 형태). 본문(`body`)은 GitHub 원문.
- 존재하지 않는 번호는 `404`(UI "없음" — issues §10). GitHub 연동 실패는 `github_error`/`rate_limited`.

### 9.3 `POST /api/issues` — 생성 (GitHub write-through)

콘솔에서 작성하면 GitHub에 이슈를 생성하고, 콘솔 로컬 오버레이(priority)를 함께 저장한다.

```http
POST /api/issues
Content-Type: application/json

{
  "title": "표준 목록 매칭 오류",
  "body": "...",
  "priority": "high"
}
```

- `title` 필수, `body` 선택은 GitHub로 전달(write-through)한다. `priority`(선택, 기본 `normal`)는 콘솔 로컬에만 저장하며 GitHub 라벨로 내보내지 않는다(issues §12 — 우선순위는 콘솔 로컬로만 관리).
- 담당자·라벨은 GitHub 값 영역이며, 생성 폼에서의 취급은 화면 스펙을 따른다(issues §4 — "담당자·라벨 [GitHub 값]"). 본 계약에서 콘솔이 필수로 쓰는 것은 title·body·priority다.
- 응답 `201`: 생성된 병합 `Issue`(GitHub가 부여한 `id`(number)·`htmlUrl` 포함). GitHub 생성 실패는 `github_error`/`rate_limited`.

### 9.4 `PATCH /api/issues/:number/overlay` — 로컬 오버레이만 수정

콘솔 로컬 오버레이(`priority`·`linkedWorkItems`)만 수정한다. GitHub 필드(제목·본문·상태·라벨·담당자)는 이 엔드포인트로 바꿀 수 없다(issues §8 — 기존 GitHub 필드는 콘솔에서 읽기 전용, 편집은 원문 링크에서).

```http
PATCH /api/issues/42/overlay
Content-Type: application/json

{ "priority": "urgent", "linkedWorkItems": ["work_07", "work_09", "work_11"] }
```

- 허용 필드: `priority`(`Priority`), `linkedWorkItems`(string[], 연결 WorkItem id 배열 — 1:N). 그 외 필드가 오면 `400 validation_error`.
- `linkedWorkItems`는 이슈 쪽 표현이며, 작업 쪽은 `WorkItem.linkedIssue`(단수, N:1)로 대응한다(data-model §4). 양방향 정합은 서버 책임(구현 재량).
- 응답 `200`: 갱신된 병합 `Issue`. 없는 번호는 `404`.
- GitHub 호출이 필요 없는 로컬 전용 쓰기이므로 GitHub 레이트리밋 영향을 받지 않는다.

## 10. GitHub 연동

Issues 모듈은 GitHub Issues를 프록시·미러링한다. 콘솔은 GitHub를 직접 호출하지 않고 서버 API를 경유한다(자격증명이 서버에만 있으므로).

### 10.1 프록시하는 GitHub REST 엔드포인트

콘솔 API ↔ GitHub REST 대응(서버가 프록시).

| 콘솔 API | GitHub REST(개념) | 방향 |
| --- | --- | --- |
| `GET /api/issues` | `GET /repos/{owner}/{repo}/issues` (list, state 필터) | 조회 |
| `GET /api/issues/:number` | `GET /repos/{owner}/{repo}/issues/{number}` (single) | 조회 |
| `POST /api/issues` | `POST /repos/{owner}/{repo}/issues` (create) | 생성(write-through) |
| `PATCH /api/issues/:number/overlay` | (GitHub 호출 없음 — 로컬 오버레이만) | 로컬 |

- 목록/상세/생성만 프록시한다. 기존 이슈의 GitHub 필드 수정(GitHub `PATCH .../issues/{number}`)은 콘솔이 호출하지 않으며, 편집은 상세의 원문 링크(`htmlUrl`)를 통해 GitHub에서 직접 한다(issues §8).
- `{owner}`/`{repo}`는 서버 설정값이다(단일 프로젝트 전제, 값 미기재).

### 10.2 인증

- 서버가 보유한 GitHub 토큰 또는 GitHub App으로 인증한다(README §6). 단일 사용자 전제.
- 자격증명은 서버 측에만 저장하며 콘솔·API 응답에 노출하지 않는다(값 미기재). 인증 방식의 선택·주입은 구현·배포 단계에서 확정한다.

### 10.3 동기화

- 진입 시 조회: Issues 목록/상세에 진입할 때 서버가 GitHub에서 최신 상태를 조회한다(pull). 로컬 오버레이(priority·linkedWorkItems)를 병합해 반환한다.
- 수동 새로고침: 사용자가 명시적으로 새로고침하면 다시 조회한다(issues §12).
- webhook: 실시간 반영(webhook 수신)은 현 범위 밖이며 향후 도입한다(README §6, issues §12).
- 상태 반영: 이슈 완료(closed)는 GitHub에서 닫힐 때(예: 연결 PR 병합) 다음 조회에 반영된다. 콘솔은 자체 규칙으로 상태를 전이시키지 않는다(issues §7, status-taxonomy §6.3).

### 10.4 레이트리밋

- GitHub REST 레이트리밋이 적용된다. 서버는 남은 한도를 고려해 호출하고, 초과 시 콘솔에는 `429 rate_limited`로 반환한다.
- 진입 시 조회를 매번 무제한으로 수행하면 한도 소진 위험이 있으므로, 서버 측 캐시·조건부 요청(ETag)·백오프 등 완화책을 둘 수 있다(구현 재량). 완화책 세부는 본 계약에서 규정하지 않는다.
- 레이트리밋·연동 실패는 UI error 상태로 노출하고 재시도를 제공한다(issues §10).

### 10.5 GitHub 필드 편집 경계 (요약)

- 콘솔 쓰기 범위: (a) 새 이슈 생성(write-through), (b) 로컬 오버레이(priority·linkedWorkItems). 이 둘뿐이다.
- 읽기 전용(GitHub 정본): title·body·state·labels·assignee·createdAt·htmlUrl. 편집은 GitHub 원문(`htmlUrl`)으로 이관한다.
- 우선순위는 콘솔 로컬로만 관리하고 GitHub 라벨로 내보내지 않는다(issues §12).

## 11. 연관 문서 크로스링크

- 단일 기준(SoT): [README.md](./README.md) — 페이지네이션·인증·enum·라우트·색.
- 엔티티 타입: [data-schema.md](./data-schema.md)(작성 예정) · [../ia/data-model.md](../ia/data-model.md).
- 상태·우선순위 값: [../ia/status-taxonomy.md](../ia/status-taxonomy.md).
- 공통 셸·라우팅·리스트 규약: [../ia/foundation.md](../ia/foundation.md).
- 모듈 IA: [../ia/overview.md](../ia/overview.md) · [../ia/task.md](../ia/task.md) · [../ia/wbs.md](../ia/wbs.md) · [../ia/issues.md](../ia/issues.md) · [../ia/work.md](../ia/work.md).

## 12. 불일치 · 의문점 (구현 확정 필요)

계약 작성 중 발견한 IA·README 간 불일치와 미확정 사항. IA·README와 모순되면 그쪽을 우선했으며, 아래는 확인용 메모다.

1. 페이지네이션 방식 상충: README §5(SoT)는 "페이지 기반, 무한 스크롤 아님"으로 확정하나, foundation §8.1은 "페이지 이동 또는 무한 스크롤 중 하나"로 여지를 둔다. 본 계약은 SoT를 따라 페이지 기반(size=25)으로 고정했다.
2. Issue 경로 파라미터 표기: data-model §6·foundation §6은 UI 라우트를 `:issueId`로 쓰나, 본 계약(태스크 지시)은 API 경로에 `:number`를 쓴다. 둘은 동일한 GitHub 이슈 번호(`Issue.id`, number)를 가리킨다 — 9절에 명시. 확정 시 표기 통일 필요.
3. `data-schema.md` 부재: 스키마 타입 정본 파일이 아직 없어 타입명을 data-model 기준 PascalCase(`TaskIA`, `WBSItem`, `WorkItem`, `Agent`, `Issue`, `MasterList`, `GeneratedSchedule`, `ExportFile`, `ProjectMeta` 등)로 인용했다. data-schema.md 확정 시 필드·타입명 재정합 필요.
4. WBS 마일스톤 타입명: data-model은 `GeneratedSchedule.milestones`를 `Milestone[]`로만 정의하고 필드 상세가 없다. `GET /api/wbs` 응답의 마일스톤 필드(`type` A/B, `label`, `date`)는 wbs §5·overview §3.1을 근거로 임시 구성했으며 data-schema에서 확정 필요.
5. Task 트리 조회의 페이지네이션: 트리 특성상 전체 노드를 내려주는 것으로 설계했다(리스트 공통 규약의 페이지네이션 미적용). 노드 수가 매우 커질 경우의 처리(지연 로딩 등)는 미확정.
6. Overview `outputs` 다운로드 링크 형식: `downloadUrl`을 상대경로 GET 엔드포인트로 가정했다. 실제 파일 서빙 방식(직접 스트림 vs 서명 URL)은 구현 단계에서 확정.
7. Issue 생성 시 담당자·라벨: issues §4 등록 폼은 "담당자·라벨 [GitHub 값]"으로 표기하나 필수/선택·전달 여부가 불명확하다. 본 계약은 콘솔 필수 입력을 title·body·priority로 한정하고, 담당자·라벨의 write 여부는 화면 스펙(screens.md)·구현에서 확정하도록 남겼다.
