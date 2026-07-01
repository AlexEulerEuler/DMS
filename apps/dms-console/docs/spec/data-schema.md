# 엔티티 TypeScript 타입·enum

> 범위: `apps/dms-console` 콘솔 한정. 이 문서는 [../ia/data-model.md](../ia/data-model.md)의 엔티티를 TypeScript 타입으로 구체화한다. enum 값·라벨·색 규약은 [README.md](./README.md)를 단일 기준(SoT)으로 삼고, 필드명·필수 여부·관계는 data-model.md 표를 따른다. 두 문서와 모순되면 그쪽을 우선한다.

## 1. 개요

- 모든 엔티티는 문자열 `id`(Issue만 GitHub 이슈 번호로 `number`)를 가지며, 다른 엔티티 참조는 대상의 `id`(또는 `number`) 문자열로 표현한다.
- 필수/선택은 data-model.md의 M/O 표기를 그대로 옮긴다. 선택 필드는 TypeScript `?`로 표시한다.
- 상태 계열 필드의 값은 이 문서에서 새로 만들지 않고 3절 Canonical Enums만 쓴다.
- 날짜 계열은 문자열로 다룬다: 시각(시:분 포함)은 ISO 8601 datetime 문자열, 일정 경계는 `YYYY-MM-DD` date 문자열. 아래에서 `DateTimeString`·`DateString` 별칭으로 구분한다.

```ts
/** ISO 8601 datetime 문자열 (예: "2026-07-01T09:00:00Z") */
type DateTimeString = string;

/** date 문자열 (예: "2026-07-01") */
type DateString = string;
```

## 2. 관계 카디널리티 요약

data-model.md 4절 관계 매핑을 타입 관점에서 요약한다. 참조 필드는 모두 대상 식별자 문자열이다.

```text
Project        1:N  DocumentSource / GeneratedOutput / TaskIA / WBSItem / Issue / WorkItem / Agent   (projectId)
BaselineSchedule 1:N GeneratedSchedule                                                                   (basedOn)
TaskIA(task) 1:1 WBSItem                                                                             (linkedWbsId)
TaskIA     1:N  TaskIA (자기참조 트리)                                                            (parentId)
Issue          1:N  WorkItem                                                                            (linkedWorkItems[])
WorkItem       N:1  Issue  (선택)                                                                        (linkedIssue)
WorkItem       N:1  Agent  (선택)                                                                        (linkedAgent)
```

- 이슈:작업 = 1:N. 이슈 쪽은 `linkedWorkItems`(배열), 작업 쪽은 `linkedIssue`(단수)로 표현한다.
- 작업↔이슈, 작업↔에이전트 = N:1(단수, 선택). 여러 에이전트 관련은 여러 WorkItem으로 간접 표현한다.

## 3. Canonical Enums

README 3절 값을 그대로 정의한다. 코드에서는 key를, 화면에서는 라벨 맵을 쓴다. GitHub 정본(`IssueState`)은 영문 값을 화면에도 그대로 노출한다.

```ts
/** 공통 상태 — Task 세부 업무·WBS 공유 */
type CommonStatus = 'planned' | 'in_progress' | 'done';

const CommonStatusLabel: Record<CommonStatus, string> = {
  planned: '진행예정',
  in_progress: '진행중',
  done: '완료',
};

/** 작업 상태 — 공통 3단계에 리뷰중 추가 */
type WorkStatus = 'planned' | 'in_progress' | 'review' | 'done';

const WorkStatusLabel: Record<WorkStatus, string> = {
  planned: '진행예정',
  in_progress: '진행중',
  review: '리뷰중',
  done: '완료',
};

/** 에이전트 기획 상태 */
type AgentStatus = 'draft' | 'confirmed' | 'on_hold';

const AgentStatusLabel: Record<AgentStatus, string> = {
  draft: '기획중',
  confirmed: '확정',
  on_hold: '보류',
};

/** 이슈 상태 — GitHub 정본. 영문 값 그대로 노출 */
type IssueState = 'open' | 'closed';

const IssueStateLabel: Record<IssueState, string> = {
  open: 'open',
  closed: 'closed',
};

/** 우선순위 — 기본값 normal */
type Priority = 'urgent' | 'high' | 'normal' | 'low';

const PriorityLabel: Record<Priority, string> = {
  urgent: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

/** Task 노드 유형 */
type TaskNodeType = 'category' | 'group' | 'task';

const TaskNodeTypeLabel: Record<TaskNodeType, string> = {
  category: '구분',
  group: '중분류',
  task: '세부 업무',
};

/** 내보내기 형식 */
type ExportFormat = 'json' | 'xlsx' | 'doc';

const ExportFormatLabel: Record<ExportFormat, string> = {
  json: 'JSON',
  xlsx: 'XLSX',
  doc: '문서',
};

/** 파이프라인 처리 상태(최소 enum) */
type ParsedStatus = 'pending' | 'processing' | 'done' | 'error';

const ParsedStatusLabel: Record<ParsedStatus, string> = {
  pending: '대기',
  processing: '처리중',
  done: '완료',
  error: '오류',
};

/** 표준 목록 생성 상태 */
type MasterListStatus = 'draft' | 'confirmed';

const MasterListStatusLabel: Record<MasterListStatus, string> = {
  draft: '초안',
  confirmed: '확정',
};
```

## 4. Project

프로젝트와 표시용 메타. `meta`는 Overview가 렌더하는 값을 담는다.

```ts
/** 파이프라인·운영 객체가 소속되는 최상위 컨테이너 */
interface Project {
  id: string;
  name: string;
  description?: string;
  meta?: ProjectMeta;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

/** Overview 표시용 메타(version, language, branch, package, apiEndpoint) */
interface ProjectMeta {
  version?: string;
  language?: string;
  branch?: string;
  package?: string;
  apiEndpoint?: string;
}
```

## 5. 파이프라인 입력 (DocumentSource)

입력 세 유형. 공통적으로 파일/원천 성격을 가진다.

```ts
/** 입력 문서 — 생성의 기준이 되는 원본(예: PDF) */
interface SourceDocument {
  id: string;
  projectId: string;
  fileName: string;
  fileType?: string;
  uploadedAt?: DateTimeString;
  /** 파싱/청킹 처리 상태(파이프라인 진행 표시용) */
  parsedStatus?: ParsedStatus;
}

/** 기존 표준 목록 — 생성 시 참조·정합에 쓰는 이미 확보된 목록 */
interface ExistingMasterList {
  id: string;
  projectId: string;
  fileName?: string;
  version?: string;
  itemCount?: number;
}

/** 기준 일정 — 생성 일정 산출의 기준선 */
interface BaselineSchedule {
  id: string;
  projectId: string;
  fileName?: string;
  startDate?: DateString;
  endDate?: DateString;
}
```

## 6. 파이프라인 출력 (GeneratedOutput)

입력에서 파생되며 재생성 가능한 산출물 세 유형.

```ts
/** 표준 목록 — 입력 문서·기존 표준 목록을 근거로 생성·확정 */
interface MasterList {
  id: string;
  projectId: string;
  items?: MasterListItem[];
  version?: string;
  generatedAt?: DateTimeString;
  status?: MasterListStatus;
}

/**
 * 표준 목록 항목.
 * data-model.md는 MasterList.items의 요소 타입으로 MasterListItem을 참조하나
 * 개별 필드 표를 정의하지 않는다. 최소 형태로 두고 파이프라인 확정 시 확장한다.
 */
interface MasterListItem {
  id: string;
  title?: string;
}

/** 생성 일정 — 기준 일정·표준 목록 기반 문서별 제출 일정(마일스톤 포함) */
interface GeneratedSchedule {
  id: string;
  projectId: string;
  milestones?: Milestone[];
  /** 근거가 된 BaselineSchedule 참조 */
  basedOn?: string;
  generatedAt?: DateTimeString;
}

/**
 * 마일스톤/제출 기준.
 * data-model.md는 GeneratedSchedule.milestones의 요소로 Milestone을 참조하나
 * 개별 필드 표를 정의하지 않는다. 최소 형태로 두고 파이프라인 확정 시 확장한다.
 */
interface Milestone {
  id: string;
  title?: string;
  date?: DateString;
}

/** 내보내기 파일 — 생성 결과를 외부로 내보낸 파일 */
interface ExportFile {
  id: string;
  projectId: string;
  format: ExportFormat;
  /** 내보내기 원본 산출물(MasterList/GeneratedSchedule) 참조 */
  sourceOutput?: string;
  createdAt?: DateTimeString;
}
```

## 7. TaskIA — 업무 정보구조 노드

업무를 구분·중분류·세부 업무로 관리하는 자기참조 트리. 세부 업무(`type='task'`)가 담당자·기한·상태·진행률의 정의처이며, WBS는 이를 시간축으로 투영한다. 구분/중분류의 상태는 하위 집계로 자동 산출한다.

```ts
/**
 * 업무 정보구조 노드(자기참조 트리).
 * - parentId로 상위를 참조한다(구분은 null/미지정).
 * - owner·startDate·endDate·progress·status는 세부 업무(type='task')에서 의미를 가진다.
 * - 구분(category)/중분류(group)의 status는 저장하지 않고 하위 집계로 산출한다.
 */
interface TaskIA {
  id: string;
  projectId: string;
  type: TaskNodeType;
  title: string;
  /** 상위 노드 id. 구분은 없음(null) */
  parentId?: string | null;
  /** 세부 업무 상태. 구분/중분류는 하위 집계로 자동 산출 */
  status?: CommonStatus;
  /** 담당자(세부 업무) */
  owner?: string;
  /** 시작 기한(세부 업무) */
  startDate?: DateString;
  /** 종료 기한(세부 업무) */
  endDate?: DateString;
  /** 진행률 0~100(세부 업무). 없으면 status로 대체 */
  progress?: number;
  /** 동일 부모 내 정렬 순서 */
  order?: number;
  /** 대응 WBSItem 참조(계획↔진행 연결, type='task'에서 1:1) */
  linkedWbsId?: string;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}
```

## 8. WBSItem — 일정/진행 항목 (뷰 타입)

```ts
/**
 * 일정/진행 항목 — 뷰(파생) 타입.
 * TaskIA(type='task')를 시간축으로 표현하는 투영이며, WBS는 이 필드를 따로
 * 저장하지 않는다. 아래 모든 필드는 대응 세부 업무(Task)에서 투영된다.
 *   id       ← TaskIA.id (대응 세부 업무 식별자)
 *   group    ← TaskIA 상위 구분(category)의 title 비정규화(그룹 헤더 병합용)
 *   title    ← TaskIA.title
 *   status   ← TaskIA.status
 *   owner    ← TaskIA.owner
 *   startDate← TaskIA.startDate (막대 좌측 경계)
 *   endDate  ← TaskIA.endDate   (막대 우측 경계)
 *   progress ← TaskIA.progress (없으면 status로 대체)
 *   order    ← TaskIA.order
 * 시간축(월/주차)은 저장 필드가 아니라 전체 항목의 최소 startDate~최대 endDate에서
 * 파생 계산한다. 일정·담당·진행 편집은 Task에서 하고 WBS는 읽어서 배치한다.
 */
interface WBSItem {
  id: string;
  /** 구분명(category title 비정규화). 좌측 열 그룹 헤더로 병합 */
  group: string;
  title: string;
  status: CommonStatus;
  owner?: string;
  startDate?: DateString;
  endDate?: DateString;
  /** 진행률 0~100. 없으면 status로 대체 */
  progress?: number;
  order?: number;
}
```

## 9. Issue — 이슈 (GitHub 정본 + 콘솔 오버레이)

GitHub Issues를 콘솔에서 미러링한다. GitHub가 정본인 필드와 콘솔 로컬 필드(`priority`, `linkedWorkItems`)를 분리해 세 타입으로 정의한다.

```ts
/**
 * GitHub 정본 필드. 콘솔은 읽기 전용 미러(+새 이슈 생성 write-through).
 * number가 이슈 식별자이며 라우트 `:issueId`에 대응한다.
 */
interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: IssueState;
  labels: string[];
  assignee: string;
  createdAt: DateTimeString;
  htmlUrl: string;
}

/**
 * 콘솔 로컬 오버레이. GitHub에 없고 콘솔만 저장한다.
 * issueNumber로 GitHubIssue.number에 결합한다.
 */
interface IssueOverlay {
  issueNumber: number;
  /** 우선순위(기본 normal) */
  priority: Priority;
  /** 연결된 WorkItem id들(이슈:작업 1:N) */
  linkedWorkItems: string[];
}

/** 화면에서 쓰는 병합 뷰 — GitHubIssue + IssueOverlay */
interface IssueView extends GitHubIssue {
  priority: Priority;
  linkedWorkItems: string[];
}
```

## 10. WorkItem — 개발 작업

이슈를 실제 실행으로 옮기는 개발 작업. 백로그·칸반으로 관리한다.

```ts
/**
 * 개발 작업.
 * - id는 라우트 `:workId`에 대응한다.
 * - linkedIssue: 근거 이슈 참조(Issue.number 문자열). 작업↔이슈 N:1(선택).
 * - linkedAgent: 참조 에이전트 기획(Agent.id). 작업↔에이전트 N:1(선택).
 */
interface WorkItem {
  id: string;
  title: string;
  owner?: string;
  status?: WorkStatus;
  startDate?: DateString;
  endDate?: DateString;
  description?: string;
  /** 근거가 된 Issue 참조(단수) */
  linkedIssue?: string;
  /** 관련 Agent 참조(에이전트 개발 작업일 때, 단수) */
  linkedAgent?: string;
}
```

## 11. Agent — 에이전트 기획

계획 단계에서 만들 에이전트의 기획을 텍스트로 적어 두는 항목. 런타임 실행 대상이 아니다.

```ts
/**
 * 에이전트 기획.
 * id는 라우트 `:agentId`에 대응한다.
 * systemPrompt·flowDefinition·toolRules 등 실행용 구조는 현 범위 밖(향후 런타임 고도화 시 도입).
 */
interface Agent {
  id: string;
  name: string;
  /** 기획 상태 */
  status?: AgentStatus;
  /** 한 줄 설명 */
  description?: string;
  /** 기획 메모(자유 텍스트) */
  planNote?: string;
  /** (선택) 참고 자료·RAG 소스 링크 */
  references?: string[];
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}
```
