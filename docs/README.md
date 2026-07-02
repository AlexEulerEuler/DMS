---
layer: meta
status: approved
owner: product-owner
---

# 문서 지도

DMS 워크스페이스의 문서 계층과 정본 레지스트리. 문서 작성 규칙의 정본은 [policy/00-doc-system.md](policy/00-doc-system.md).

## 계층

| 계층 | 위치 | 내용 | 보호 |
|---|---|---|---|
| L0 원칙 | [principles.md](principles.md) | 변하지 않는 것 (1페이지) | T2 |
| L1~L2 정책 | [policy/](policy/) | 개발 워크플로우·검수·운영·메타 정책 | T2 |
| 템플릿 | [templates/](templates/) | 정책·작업·ADR 문서 템플릿 | T2 |
| L3 결정 | [decisions/](decisions/) | ADR (번호 연속, 삭제 금지) | T1 |
| L3 기획 | [product/](product/), `apps/*/docs/` | 무엇을 만드는가 | T1 |
| L3 계획 | [plan/tasks.yaml](plan/tasks.yaml) | Task/WBS 트리 정본 | T1 |
| L4 작업 스펙 | [work/](work/) | 큰 이슈의 상세 스펙 (이슈에서 링크) | T0 |
| 아카이브 | [archive/](archive/) | superseded 문서의 무덤 (읽기 전용) | — |

진입점: 루트 [AGENTS.md](../AGENTS.md) (에이전트) / 루트 [README.md](../README.md) (사람).
사용법: [guide.md](guide.md) — 일상 루프·티어·트러블슈팅 한 장 요약.

## 정본 레지스트리 (같은 사실을 두 곳에 쓰지 않는다)

| 주제 | 정본 | 다른 문서의 의무 |
|---|---|---|
| 작업 실행 상태 | GitHub 이슈·PR | 문서에 실행 상태 기록 금지 |
| 작업 절차·클레임·브랜치·커밋·PR 규약 | [policy/10-dev-workflow.md](policy/10-dev-workflow.md) | 요약+링크만 |
| 라벨 사전·티어 결정 테이블 | [policy/10-dev-workflow.md](policy/10-dev-workflow.md) §라벨·§티어 | CI·대시보드는 이 표를 구현 |
| 검수 기준 | [policy/20-review-policy.md](policy/20-review-policy.md) | gate CI가 이 문서를 로드 |
| 용어 정의 | [glossary.md](glossary.md) | 재정의 금지, 링크만 |
| Task/WBS 계획 | [plan/tasks.yaml](plan/tasks.yaml) | 대시보드는 파싱만 |
| 상태 enum·색 | [../apps/dms-console/docs/ia/status-taxonomy.md](../apps/dms-console/docs/ia/status-taxonomy.md) | 파생 표기 |
| 콘솔 화면·컴포넌트 스펙 | `apps/dms-console/docs/spec/` | — |

## 레거시 위치 (이동하지 않고 제자리 유지)

`apps/dms-console/docs/ia/`(콘솔 기획 정본)와 `apps/dms-console/docs/spec/`(콘솔 스펙)은
콘솔 코드와 함께 움직이므로 앱 로컬에 유지한다. 단 `docs/ia/runtime.md`의 에이전트 루프 설계(§4·§8)는
[ADR-0002](decisions/0002-git-native-agent-workflow.md)로 기각되어 [archive/](archive/)로 이동했다.
