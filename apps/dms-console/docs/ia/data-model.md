# 공통 데이터 모델

## 1. 개요

이 문서는 DMS Console이 다루는 핵심 도메인 객체와 각 엔티티의 필드·관계·상태 참조를 한곳에 모은 단일 기준(source of truth)이다. 각 페이지 문서(Overview, Task, WBS, Issues, Work, Agent)는 화면에서 쓰는 필드만 요약하고, 타입과 전체 정의는 이 문서를 인용한다.

- 목적: 엔티티 이름·필드·관계를 통일해 페이지 간 표현 불일치를 막는다.
- 범위: 도메인 객체 관계, 엔티티별 필드 정의, 엔티티 간 관계(1:N 등), 식별자·명명 규칙.
- 다루지 않는 것: 상태 값의 정식 목록과 전이 규칙은 [status-taxonomy.md](./status-taxonomy.md)가, 라우트·화면 구성은 각 페이지 문서가 담당한다.

DMS Console은 입력 문서와 기준 일정을 받아 표준 목록과 생성 일정을 만들고, 그 과정에서 나오는 업무·일정·이슈·개발 작업·에이전트를 관리하는 콘솔이다. 아래 모델은 그 파이프라인의 입력·출력과 운영 객체를 함께 표현한다.

## 2. 도메인 객체 관계 개요

모든 객체는 하나의 프로젝트(Project)에 소속된다. 프로젝트 아래에 파이프라인 입력(DocumentSource), 파이프라인 출력(GeneratedOutput), 그리고 운영 객체(TaskIA, WBSItem, Issue, WorkItem, Agent)가 자리한다.

```text
Project
├── DocumentSource                 (파이프라인 입력)
│   ├── SourceDocument             입력 문서
│   ├── ExistingMasterList         기존 표준 목록
│   └── BaselineSchedule           기준 일정
├── GeneratedOutput                (파이프라인 출력)
│   ├── MasterList                 표준 목록
│   ├── GeneratedSchedule          생성 일정
│   └── ExportFile                 내보내기 파일
├── TaskIA                         업무 정보구조 노드(자기참조 트리)
├── WBSItem                        일정/진행 항목
├── Issue                          이슈·리스크·요청
├── WorkItem                       개발 작업
└── Agent                          에이전트
```

DocumentSource와 GeneratedOutput은 개별 엔티티라기보다 세 하위 유형을 묶는 논리 그룹이다. 개념 수준의 관계는 다음과 같다.

```text
DocumentSource ──(입력)──▶ 생성 파이프라인 ──(출력)──▶ GeneratedOutput

TaskIA ──linkedWbsId──▶ WBSItem            계획 → 일정/진행(1:1 파생)
Issue  ──1:N──▶ WorkItem                    한 이슈 → 여러 작업
WorkItem ──linkedIssue──▶ Issue            작업 → 근거 이슈(N:1)
WorkItem ──linkedAgent──▶ Agent            작업 → 참조 에이전트 기획(N:1)
```

TaskIA·WBSItem은 같은 업무를 계획 축과 시간 축에서 각각 바라보는 관계이고, Issue·WorkItem은 요청과 실행을 잇는 관계다. 상세 매핑은 4절에 정리한다.

## 3. 엔티티 정의

필수 여부는 M(필수)/O(선택)으로 표기한다. 상태 계열 필드의 허용 값은 [status-taxonomy.md](./status-taxonomy.md)를 단일 기준으로 삼는다.

### 3.1 Project

파이프라인과 모든 운영 객체가 소속되는 최상위 컨테이너.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 프로젝트 식별자 |
| `name` | string | M | 프로젝트명 |
| `description` | string | O | 프로젝트 개요 |
| `meta` | ProjectMeta | O | 버전·언어·브랜치·패키지·API 등 표시용 메타(→ [overview.md](./overview.md)) |
| `createdAt` | datetime | O | 생성 시각 |
| `updatedAt` | datetime | O | 수정 시각 |

`meta`의 구성은 Overview가 렌더하는 값(version, language, branch, package, apiEndpoint)을 담는다. 현재는 단일 프로젝트 운영을 전제로 한다. `projectId`는 아주 향후의 다중 프로젝트 확장을 위해 유지만 한다(6절).

### 3.2 DocumentSource — 파이프라인 입력

입력 세 유형은 공통적으로 파일/원천 성격을 가지며, `sourceType`으로 구분한다. 아래는 유형별 세부 정의다.

#### SourceDocument — 입력 문서

생성의 기준이 되는 원본 입력 문서(예: PDF 등).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 입력 문서 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `fileName` | string | M | 원본 파일명 |
| `fileType` | string | O | 파일 형식(pdf 등) |
| `uploadedAt` | datetime | O | 업로드 시각 |
| `parsedStatus` | enum | O | 파싱/청킹 처리 상태(파이프라인 진행 표시용) |

#### ExistingMasterList — 기존 표준 목록

생성 시 참조·정합에 쓰는, 이미 확보된 표준 목록.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 기존 표준 목록 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `fileName` | string | O | 원본 파일명 |
| `version` | string | O | 기준으로 삼은 버전 |
| `itemCount` | number | O | 포함 항목 수 |

#### BaselineSchedule — 기준 일정

생성 일정 산출의 기준선이 되는 일정 데이터.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 기준 일정 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `fileName` | string | O | 원본 파일명 |
| `startDate` | date | O | 기준 일정 시작 |
| `endDate` | date | O | 기준 일정 종료 |

### 3.3 GeneratedOutput — 파이프라인 출력

파이프라인이 생성하는 산출물 세 유형. 각 산출물은 입력에서 파생되며 재생성 가능하다.

#### MasterList — 표준 목록

입력 문서와 기존 표준 목록을 근거로 생성·확정하는 통합 표준 목록.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 표준 목록 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `items` | MasterListItem[] | O | 표준 목록 항목 배열 |
| `version` | string | O | 생성/확정 버전 |
| `generatedAt` | datetime | O | 생성 시각 |
| `status` | enum | O | 초안/확정 등 생성 진행 상태 |

#### GeneratedSchedule — 생성 일정

기준 일정과 표준 목록을 바탕으로 산출한 문서별 제출 일정(마일스톤 포함).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 생성 일정 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `milestones` | Milestone[] | O | 마일스톤/제출 기준 목록 |
| `basedOn` | string | O | 근거가 된 기준 일정(BaselineSchedule) 참조 |
| `generatedAt` | datetime | O | 생성 시각 |

#### ExportFile — 내보내기 파일

생성 결과를 외부로 내보낸 파일(JSON/XLSX/문서 등).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 내보내기 파일 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `format` | enum | M | json \| xlsx \| doc 등 출력 형식 |
| `sourceOutput` | string | O | 내보내기 원본 산출물(MasterList/GeneratedSchedule) 참조 |
| `createdAt` | datetime | O | 생성 시각 |

### 3.4 TaskIA — 업무 정보구조 노드

업무를 구분·(중분류)·세부 업무로 관리하는 자기참조 트리. 세부 업무(type=task)가 담당자·기한·상태·진행률의 정의처이며, WBS는 이를 시간축으로 투영한다. 현재 화면은 구분–세부 2단으로 운영하고 중분류(group)는 스키마에 유지한다(향후 노출). 화면 정의는 [task.md](./task.md).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 노드 식별자 |
| `projectId` | string | M | 소속 프로젝트 |
| `type` | enum | M | category \| group \| task (구분 \| 중분류 \| 세부 업무) |
| `title` | string | M | 노드 라벨 |
| `parentId` | string | O | 상위 노드 id(구분은 null) |
| `status` | enum | O | 세부 업무 상태(→ status-taxonomy). 구분/중분류는 하위 집계로 자동 산출 |
| `owner` | string | O | 담당자(세부 업무) |
| `startDate` | date | O | 시작 기한(세부 업무) |
| `endDate` | date | O | 종료 기한(세부 업무) |
| `progress` | number | O | 진행률 0~100(세부 업무). 없으면 status로 대체 |
| `order` | number | O | 동일 부모 내 정렬 순서 |
| `linkedWbsId` | string | O | 대응 WBSItem 참조(계획↔진행 연결) |
| `createdAt` | datetime | O | 생성 시각 |
| `updatedAt` | datetime | O | 수정 시각 |

### 3.5 WBSItem — 일정/진행 항목

Task 세부 업무(type=task)를 시간축으로 표현하는 투영이다. 아래 필드는 대응 TaskIA에서 파생되며 WBS가 따로 저장하지 않는다 — WBS는 시간축 배치·집계만 담당한다. 화면 정의는 [wbs.md](./wbs.md).

| 필드 | 출처 | 설명 |
| --- | --- | --- |
| `id` | = TaskIA | 대응 세부 업무 식별자 |
| `group` | ← TaskIA 상위 구분 | 구분명(category title 비정규화). 좌측 열 그룹 헤더로 병합 |
| `title` | ← TaskIA | 세부 업무명 |
| `status` | ← TaskIA | 완료/진행 중/진행 예정(→ status-taxonomy) |
| `owner` | ← TaskIA | 담당자 |
| `startDate` | ← TaskIA | 시작일(막대 좌측 경계 산출) |
| `endDate` | ← TaskIA | 종료일(막대 우측 경계 산출) |
| `progress` | ← TaskIA | 진행률 0~100. 없으면 status로 대체 |
| `order` | ← TaskIA | 그룹 내 정렬 순서 |

- 일정·담당·진행의 편집은 Task에서 하고, WBS는 읽어서 배치한다.
- 시간축(월/주차)은 저장 필드가 아니라 전체 항목의 최소 `startDate`~최대 `endDate`에서 파생 계산한다.

### 3.6 Issue — 이슈 (GitHub 정본)

GitHub Issues를 콘솔에서 미러링하는 항목. 대부분 필드는 GitHub가 정본이고, 콘솔은 `priority`와 `linkedWorkItems`만 로컬 저장한다. 화면 정의는 [issues.md](./issues.md).

| 필드 | 출처 | 타입 | 설명 |
| --- | --- | --- | --- |
| `id`(number) | GitHub | number | 이슈 번호(라우트 `:issueId`) |
| `title` | GitHub | string | 제목 |
| `body` | GitHub | string | 본문 |
| `state` | GitHub | enum | open / closed |
| `labels` | GitHub | string[] | 라벨 |
| `assignee` | GitHub | string | 담당자 |
| `createdAt` | GitHub | datetime | 등록일 |
| `htmlUrl` | GitHub | string | GitHub 원문 링크 |
| `priority` | 콘솔 | enum | 우선순위 긴급/높음/보통/낮음(→ status-taxonomy 9절) |
| `linkedWorkItems` | 콘솔 | string[] | 연결된 WorkItem들(1:N) |

### 3.7 WorkItem — 개발 작업

이슈를 실제 실행으로 옮기는 개발 작업. 백로그·칸반으로 관리하며 화면 정의는 [work.md](./work.md).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 작업 식별자(라우트 `:workId`) |
| `title` | string | M | 작업명 |
| `owner` | string | O | 담당자 |
| `status` | enum | O | 진행 상태(→ status-taxonomy) |
| `startDate` | date | O | 시작 일정 |
| `endDate` | date | O | 종료 일정 |
| `description` | string | O | 작업 설명 |
| `linkedIssue` | string | O | 근거가 된 Issue 참조 |
| `linkedAgent` | string | O | 관련 Agent 참조(에이전트 개발 작업일 때) |

### 3.8 Agent — 에이전트 기획

프로젝트 계획 단계에서 만들 에이전트의 기획을 텍스트로 적어 두는 항목. DMS 런타임 실행 대상이 아니다. 화면 정의는 [agent.md](./agent.md).

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | string | M | 에이전트 식별자(라우트 `:agentId`) |
| `name` | string | M | 에이전트명 |
| `status` | enum | O | 기획 상태 기획중/확정/보류(→ status-taxonomy) |
| `description` | string | O | 한 줄 설명 |
| `planNote` | string | O | 기획 메모(자유 텍스트) |
| `references` | string[] | O | (선택) 참고 자료·RAG 소스 링크 |
| `createdAt` | datetime | O | 생성일 |
| `updatedAt` | datetime | O | 수정일 |

- `systemPrompt`·`flowDefinition`·`toolRules` 등 실행용 구조는 현 범위에 없다. 향후 Agent 런타임 고도화(LangChain·LangGraph) 시 도입한다.

## 4. 관계 매핑

주요 엔티티 간 관계(카디널리티 포함).

| 출발 | 관계 | 도착 | 표현 필드 | 의미 |
| --- | --- | --- | --- | --- |
| Project | 1:N | DocumentSource(세 유형) | `projectId` | 프로젝트가 입력을 보유 |
| Project | 1:N | GeneratedOutput(세 유형) | `projectId` | 프로젝트가 산출물을 보유 |
| Project | 1:N | TaskIA / WBSItem / Issue / WorkItem / Agent | `projectId` | 프로젝트가 운영 객체를 보유 |
| DocumentSource | N:M(개념) | GeneratedOutput | (파이프라인 파생) | 입력에서 산출물이 생성됨 |
| BaselineSchedule | 1:N | GeneratedSchedule | `basedOn` | 기준 일정을 근거로 생성 일정 산출 |
| TaskIA(type=task) | 1:1 | WBSItem | `linkedWbsId` | 세부 업무에서 WBS 항목 파생, 일정·진행 속성 부여 |
| TaskIA | 1:N(자기참조) | TaskIA | `parentId` | 구분→중분류→세부 업무 트리 |
| Issue | 1:N | WorkItem | `linkedWorkItems` | 한 이슈에서 여러 작업 파생 |
| WorkItem | N:1(선택) | Issue | `linkedIssue` | 작업의 근거 이슈 |
| WorkItem | N:1(선택) | Agent | `linkedAgent` | 작업이 참조하는 에이전트 기획 |

- Issue↔WorkItem은 1:N이다. 한 이슈(GitHub 정본)에 여러 WorkItem이 연결되며, 이슈 쪽 `linkedWorkItems`(배열)와 작업 쪽 `linkedIssue`(단수)로 표현한다. 작업↔이슈, 작업↔에이전트는 각각 단수(N:1)로 고정한다 — 한 이슈가 여러 에이전트와 관련될 때는 여러 WorkItem을 통해 간접 표현한다(5.2 결정).
- WBSItem은 TaskIA 세부 업무(type=task)에서 파생되는 시간축 투영이다. 세부 업무 등록 시 1:1로 생성되며 `linkedWbsId`로 연결된다. 일정(startDate/endDate)이 아직 없으면 그리드에 막대 없이 표시되고 진행률은 상태 기반으로 산출된다([task.md](./task.md)·[wbs.md](./wbs.md) 참조).
- DocumentSource와 GeneratedOutput의 관계는 특정 FK가 아니라 파이프라인 실행으로 맺어지는 파생 관계다. 생성 일정만 `basedOn`으로 기준 일정을 명시 참조한다.

## 5. 상태 필드 참조

상태 계열 필드(`status`, `priority` 등)의 허용 값·색상·전이 규칙은 이 문서에서 반복 정의하지 않고 [status-taxonomy.md](./status-taxonomy.md)를 단일 기준으로 인용한다. 엔티티별로 참조하는 상태 계열은 다음과 같다.

| 엔티티 | 상태 필드 | 참조 |
| --- | --- | --- |
| TaskIA | `status`(세부 업무) | [status-taxonomy.md](./status-taxonomy.md) — 공통 상태 |
| WBSItem | `status` | [status-taxonomy.md](./status-taxonomy.md) — 공통 상태 |
| Issue | `state`(GitHub open/closed), `priority`(콘솔) | [status-taxonomy.md](./status-taxonomy.md) — Issue 상태 / 우선순위 |
| WorkItem | `status` | [status-taxonomy.md](./status-taxonomy.md) — 작업 상태 |
| Agent | `status` | [status-taxonomy.md](./status-taxonomy.md) — Agent 기획 상태 |
| MasterList / SourceDocument 등 | 생성·파싱 진행 상태 | 최소 enum만 유지, 정식 상태체계 미포함 |

공통 상태(완료/진행중/진행예정)는 TaskIA·WBSItem이, 이슈 상태·작업 상태·에이전트 상태는 각 엔티티가 별도 축으로 사용한다. 값 목록은 반드시 status-taxonomy.md에서 확인한다.

## 6. 식별자·명명 규칙

- 식별자: 모든 엔티티는 문자열 `id`를 가진다. 라우트 파라미터는 엔티티명을 딴다 — Issue `:issueId`, WorkItem `:workId`, Agent `:agentId`.
- 소속 참조: 프로젝트 하위 엔티티는 `projectId`로 소속을 표현한다. 단일 프로젝트 운영 시 생략·고정할 수 있으나, 다중 프로젝트 확장을 위해 필드는 유지한다.
- 참조 필드: 다른 엔티티를 가리키는 필드는 `linked` 접두사 + 대상 엔티티명을 쓴다(`linkedWorkItems`, `linkedIssue`, `linkedAgent`, `linkedWbsId`). 복수 연결은 복수형 배열로 표기한다(`linkedWorkItems`). 트리 상위 참조만 `parentId`로 예외 표기한다.
- 시각 필드: 생성/수정 시각은 `createdAt`/`updatedAt`, 일정 경계는 `startDate`/`endDate`를 공통으로 쓴다.
- 엔티티 표기: 코드·스키마에서는 파스칼케이스 단수형(`WorkItem`, `MasterList`)을, 컬렉션 필드는 복수형 배열(`items`, `milestones`)을 쓴다.
- 상태 값: 상태 계열 값 자체는 이 문서가 아니라 status-taxonomy.md가 정의한다. 필드는 `status`/`priority`로 통일한다.

## 7. 연관 문서 크로스링크

- 상위 IA 인덱스: [../ia.md](../ia.md)
- 상태 값 단일 기준: [status-taxonomy.md](./status-taxonomy.md)
- 공통 셸·레이아웃·라우팅: [foundation.md](./foundation.md)
- 입력/출력 요약과 파이프라인: [overview.md](./overview.md)
- 업무 정보구조(TaskIA): [task.md](./task.md)
- 일정/진행(WBSItem): [wbs.md](./wbs.md)
- 이슈(Issue): [issues.md](./issues.md)
- 개발 작업(WorkItem): [work.md](./work.md)
- 에이전트(Agent): [agent.md](./agent.md)
