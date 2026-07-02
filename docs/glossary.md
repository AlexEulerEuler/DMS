---
layer: reference
status: approved
owner: product-owner
---

# 도메인 용어 정본

## 요약

DMS 전반에서 쓰는 용어의 단일 정의. 다른 문서는 재정의하지 않고 여기로 링크한다.

| 용어 | 정의 |
|---|---|
| 작업 항목 (work item) | GitHub 이슈로 표현되는 실행 단위. 이슈 폼 필수 필드를 갖춘 것 |
| 클레임 (claim) | ready 이슈에 self-assign + `work/N-slug` 브랜치 push로 착수를 선점하는 행위 |
| ready | "이 정의만 읽고 에이전트가 시작해도 된다"는 사람의 승인 서명(라벨) |
| 티어 (T0/T1/T2) | PR의 위험 등급. 변경 경로+diff로 판정하며 머지 조건이 다르다 — [10-dev-workflow.md §5](policy/10-dev-workflow.md) |
| gate | 모든 PR에 실행되는 required check 워크플로우. 티어 판정+규약 검사+에이전트 검수 |
| 검수 에이전트 (verifier) | CI에서 base 브랜치 체크리스트를 로드해 PR을 검수하는 fresh 컨텍스트 에이전트 |
| 테스터 (tester) | 구현이 기획 문서대로 작동하는지 실행 검증하는 에이전트. 발견은 `type:bug` |
| 문서 감사 (docs audit) | 코드↔문서 드리프트를 검출해 `type:docs` 이슈를 여는 활동 |
| 작업 스펙 (work spec) | 큰 이슈의 상세 문서 (`docs/work/N-slug.md`). 상태는 담지 않는다 |
| WD | Work Definition의 약칭 — 이슈+작업 스펙을 합쳐 부르는 말 |
| Task (T-###) | `docs/plan/tasks.yaml`의 계획 노드. 이슈는 `task:T-###` 라벨로 연결 |
| 대시보드 (console) | GitHub·리포 문서를 읽어 진행을 비추는 읽기 전용 투영. 작업의 필수 경로가 아님 |
| 정본 (SoT) | 어떤 사실의 단일 출처. 실행 상태=GitHub, 정의·규칙=리포 문서 |
| supersede | 문서를 삭제하지 않고 대체 문서 링크와 함께 폐기 표기하는 것 |
| break-glass | 장애 시 기록을 남기고 게이트를 우회하는 비상 절차 — [30-ops-policy.md §4](policy/30-ops-policy.md) |
