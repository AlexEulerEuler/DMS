---
layer: decision
status: superseded
owner: product-owner
superseded_by: ../decisions/0002-git-native-agent-workflow.md
---

# [SUPERSEDED] Runtime Architecture — 실전 운영 명세 (v1)

> **이 문서는 [ADR-0002](../decisions/0002-git-native-agent-workflow.md)로 기각·대체되었다.**
> 중앙 SQLite 정본·MCP/claim 루프·오케스트레이터(§4·§8) 설계는 "개발자 로컬에는 git 클론만"
> 원칙과 충돌해 폐기됐고, 영속성·인제스천·파이프라인(§1~3)은 백엔드 폐지와 함께 제거됐다.
> 현행 정본: [docs/policy/10-dev-workflow.md](../policy/10-dev-workflow.md). 에이전트는 이 문서를
> 정본으로 취급하지 말 것. 원문은 기각 사유의 기록으로 아래에 보존한다.

# Runtime Architecture — 실전 운영 명세

> 범위: `docs/spec`이 "향후/범위 밖"으로 미룬 실전 운영 계층의 기획 정본. `docs/spec`(화면·컴포넌트·API·토큰)은 계획/미러 콘솔을 정의하고, 이 문서는 그것을 **실제 개발관리가 가능한 시스템**으로 만드는 5개 계층(영속성·문서 투입·생성 파이프라인·에이전트 루프·인증/배포)을 설계한다. 값·enum·타입은 `docs/spec`을 그대로 상속한다.

## 0. 목표 — "실제 개발관리 가능"의 정의

두 청중 모델을 실제로 성립시킨다.

- **사람**: 웹 대시보드에서 업무(Task/WBS)·작업(Work)·이슈·에이전트 기획을 등록·추적하고, 입력 문서를 넣어 표준 목록·생성 일정을 산출·다운로드한다. **데이터는 재시작 후에도 유지된다.**
- **에이전트**: 문서(스펙·산출물)와 배정된 작업을 기계가 읽을 수 있는 인터페이스로 조회하고, 작업을 클레임해 진행하며, 상태를 되돌려 쓴다.

충족 기준: (1) 데이터 영속, (2) 문서 투입 경로, (3) 산출물 생성, (4) 에이전트 read/claim/report 루프, (5) 실행 가능한 배포.

## 1. 영속성 (Persistence) — Phase 1

- 저장소: **SQLite + SQLAlchemy 2.x**. 단일 파일(`DMS_DB_PATH`, 기본 `./dms.db`), 인프라 없이 임베디드. 다중 워커/팀 확장 시 Postgres로 URL만 교체(SQLAlchemy 추상화 유지).
- 모델: 콘솔 소유 엔티티(`TaskIA`, `WorkItem`, `Agent`, `IssueOverlay`)와 파이프라인 엔티티(`SourceDocument`, `ExistingMasterList`, `BaselineSchedule`, `MasterList`, `GeneratedSchedule`, `ExportFile`)를 ORM 테이블로. Pydantic 스키마(`app/schemas`)는 API 경계 그대로 유지하고 ORM↔Pydantic 변환.
- 식별자: DB 부여(문자열 prefix + 시퀀스 테이블 또는 정수 PK를 prefix 문자열로 노출). 인메모리 `itertools` 카운터 제거 → 재시작 후 충돌 없음.
- 부트스트랩: `lifespan` 훅에서 `create_all`. 시드는 **빈 DB일 때만**, `DMS_SEED=1`(기본 on 개발)일 때만 삽입. 프로덕션은 `DMS_SEED=0`으로 빈 상태 시작.
- 파생 뷰(WBS)·집계는 지금처럼 조회 시 계산(저장 안 함).

## 2. 문서 투입 (Ingestion) — Phase 2

- 업로드: `POST /api/inputs/{sourceType}` (multipart). `sourceType` ∈ `document | master-list | baseline`.
  - 파일은 `DMS_STORAGE_DIR`(기본 `./storage`) 하위에 `{id}__{filename}`으로 저장, 메타는 DB에.
  - `SourceDocument.parsedStatus`는 `pending`→(파이프라인 실행 시)`processing`→`done|error`.
- 조회: `GET /api/inputs` → 세 유형 목록. 삭제 `DELETE /api/inputs/{id}`.
- 화면: `/overview/data`에 입력 업로드 섹션 추가(또는 신규 `Inputs` 2차 메뉴). 파일 선택 + 업로드 + 목록.

## 3. 생성 파이프라인 (Generation) — Phase 3

파이프라인은 **결정론적·플러그블**로 구현한다(LLM 없이도 동작; 매처는 인터페이스로 분리해 후에 LLM 교체 가능).

단계(`docs/ia/overview.md`의 8단계 구체화):

1. **업로드** — 입력 문서 확보(Phase 2).
2. **파싱** — 텍스트 추출(txt/md/csv 기본; PDF는 pdfminer 있으면 사용, 없으면 안내). 결과를 정규화 라인 목록으로.
3. **청킹** — 문단/라인 단위 청크.
4. **매칭** — 기존 표준 목록과 청크를 정규화 문자열 유사도(토큰 자카드/부분일치)로 매칭. `Matcher` 프로토콜: `match(chunks, existing) -> [MatchResult]`. 기본 `HeuristicMatcher`, 후일 `LlmMatcher` 교체 가능.
5. **초안 생성** — 매칭 결과로 `MasterList`(status=`draft`) 항목 생성.
6. **확정** — `PATCH`로 `draft`→`confirmed`.
7. **일정 산출** — `BaselineSchedule`의 start/end와 확정 표준 목록 항목 수로 문서별 제출 일정·마일스톤(A/B) 계산 → `GeneratedSchedule`.
8. **내보내기** — `ExportFile` 실제 바이너리 생성: `json`(전체 덤프), `xlsx`(openpyxl 있으면 실제 시트, 없으면 csv 폴백 + 형식 표기), `doc`(마크다운/텍스트).

- 실행: `POST /api/pipeline/run`(백그라운드 태스크) + **CLI** `python -m app.cli generate ...`. 산출물은 DB에서 조회(`/api/overview/outputs`)하고 다운로드는 실제 파일 스트림.
- 멱등: 재실행 시 새 버전(`v{n}`) 생성.

## 4. 에이전트 루프 (Agent Loop) — Phase 4

"에이전트가 문서를 읽고 개발"을 성립시키는 기계 인터페이스. 두 형태로 제공(같은 백엔드):

- **REST(에이전트 전용 조회/쓰기)**: 기존 `/api`를 그대로 사용하되 아래를 추가.
  - `GET /api/agent/context` — 스펙 문서 목록 + 프로젝트 상태 요약(열린 작업 수·이슈 등) 한 번에.
  - `GET /api/docs/spec/{path}` — `docs/spec`·`docs/ia` 원문을 기계가 읽도록 노출(읽기 전용, 경로 화이트리스트).
  - **작업 클레임**: `WorkItem`에 `executor`(에이전트 식별자)·`claimedAt` 필드 추가. `POST /api/work/{id}/claim`(원자적: 미클레임일 때만 성공, 아니면 409) / `POST /api/work/{id}/report`(status·note 갱신, 진행 되쓰기).
- **MCP 서버**: `app/mcp_server.py` — 위 기능을 MCP 툴로 노출(`list_open_work`, `claim_work`, `report_work`, `read_doc`, `get_context`). 코딩 에이전트가 붙어 문서를 읽고 작업을 받아 상태를 보고.

상태 전이: 에이전트가 `claim`하면 `planned→in_progress`(+executor), `report`로 `review`/`done`. 사람이 대시보드에서 본 것과 동일 데이터(양방향).

## 5. 인증·배포 (Auth / Deploy) — Phase 5

- 인증: 스펙은 단일 사용자 전제. 실전 최소치로 **선택적 토큰 게이트**(`DMS_API_TOKEN` 설정 시 `Authorization: Bearer` 요구, 미설정 시 개방=현행). 다중 사용자·RBAC는 향후(Postgres + per-user 스코프).
- 배포: 백엔드/프론트 **Dockerfile** + `docker-compose.yml`(백엔드 + 프론트 + 볼륨(dms.db, storage)). 프로덕션 CORS·시크릿·`DMS_SEED=0`.

## 6. 환경 변수(신규)

| 변수 | 기본 | 용도 |
| --- | --- | --- |
| `DMS_DB_PATH` | `./dms.db` | SQLite 파일 경로 |
| `DMS_STORAGE_DIR` | `./storage` | 업로드/산출 파일 저장 |
| `DMS_SEED` | `1`(dev) | 빈 DB 시드 여부 |
| `DMS_API_TOKEN` | (없음) | 설정 시 API 토큰 게이트 |
| `DMS_DOCS_DIR` | (없음) | 에이전트 루프가 읽는 docs 루트(컨테이너용) |
| `DMS_WORKER_CMD` | (없음) | 오케스트레이터가 작업당 실행할 워커 명령(코딩 에이전트) |
| `DMS_GITHUB_TOKEN/OWNER/REPO` | (없음) | 기존 GitHub 프록시 |

## 7. 구현 순서·검증

Phase 1→5 순차. 각 Phase: 구현 → 테스트 → 빌드/린트/타입체크 → 런타임 확인 → 커밋·푸시. 핵심 회귀 테스트: **재시작 후 데이터 유지**, 업로드→생성→다운로드, 에이전트 claim/report 왕복.

## 8. 자율 오케스트레이션 (Autonomous Orchestration) — Phase 6

목표: **사람은 기획·문서만, 나머지는 에이전트가 자율로.** §4의 에이전트 툴 층(MCP) 위에 "일을 스스로 집어 돌리는" 구동 층을 얹는다. 재설계가 아니라 확장이다.

### 8.1 역할 분리

- **DMS = 조율 substrate(수동적)**: 상태·문서·작업을 저장하고 MCP/REST 툴로 노출. 스스로 무언가를 하지 않는다.
- **오케스트레이터 = 구동기(능동적)**: 미착수 작업을 계속 가져와 워커에 위임하는 루프. `app/orchestrator.py`.
- **워커 = 실제 실행자**: 작업을 실제로 수행. 보통 외부 **코딩 에이전트**(예: DMS MCP를 붙인 Claude Code). DMS 범위 밖의 실행 주체이며 교체 가능(pluggable).

### 8.2 분해(decomposition)

에이전트가 큰 목표를 하위 작업으로 쪼갤 수 있도록 MCP에 생성 툴을 노출한다: `create_work`, `create_task`, `split_work`(부모에 자식 작업 N개 생성). WorkItem에 `parentId`를 추가해 분해 트리를 추적한다.

### 8.3 자율 루프

```text
orchestrator.run_once():
  for item in list_open_work(unclaimed_only=True) where status == planned:
    claim_work(item, executor)        # 원자적 — 다른 실행이 이미 잡았으면 skip(409)
    dispatch(worker, item)            # 워커에 위임
      · DMS_WORKER_CMD 미설정 → 내장 데모 워커(모의: review로 보고)
      · 설정 → 서브프로세스 실행(env: DMS_WORK_ID/EXECUTOR/WORK_JSON), 워커가 API/MCP로 보고
run(): run_once를 반복(--once 1회 / --poll N초 폴링). 재클레임 없음 → 중복 처리 없음.
```

실행: `python -m app.orchestrator --once` 또는 `--poll 5`. 실제 코딩 에이전트 연결은 `DMS_WORKER_CMD`에 "작업 컨텍스트를 받아 개발하고 report_work로 보고하는" 명령을 지정하면 된다.

### 8.4 범위 경계(정직)

- DMS는 코드를 **직접 실행하지 않는다** — 레포/CI/코드 작성은 워커(코딩 에이전트)의 몫이다. DMS는 "무엇을·누가·어디까지"의 조율만 담당한다.
- 데모 워커는 사이클 검증용(모의)이며, 실전에서는 실제 코딩 에이전트로 교체한다.
- 향후: 워커 결과 검증(테스트/CI 게이트), 실패 재시도·백오프, 병렬 워커 풀, 승인 게이트.
