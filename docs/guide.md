---
layer: reference
status: approved
owner: product-owner
---

# DMS 사용 가이드

## 요약

DMS에서 일하는 방법을 한 문서로 설명한다. 핵심은 세 문장이다:
**사람은 이슈로 작업을 정의하고 `ready`로 서명한다. 에이전트가 `/dms-work`로 나머지(구현→PR→검수 대응)를 수행한다.
gate CI가 위험 등급(티어)에 따라 머지를 자동 처리하거나 사람에게 남긴다.**

## 1. 전제 (개발자 로컬에 필요한 것)

```bash
git clone https://github.com/AlexEulerEuler/DMS.git
gh auth login          # GitHub CLI 인증
claude                 # Claude Code (또는 AGENTS.md를 읽는 다른 코딩 에이전트)
```

서버·MCP·대시보드 실행은 필요 없다. 클론이 곧 작업 환경이다.
에이전트 세션에는 admin 권한 없는 fine-grained PAT 사용을 권장한다 ([30-ops-policy.md §2](policy/30-ops-policy.md)).

## 2. 일상 루프

### ① 사람: 작업을 정의하고 서명한다

- GitHub에서 **이슈 폼**("작업")으로 이슈 생성 — 배경·완료 조건·컨텍스트 문서·비범위가 필수 필드다.
  귀찮으면 에이전트에게 시킨다: `/dms-define "칸반에 담당자 필터 추가"` → 폼을 갖춘 초안 이슈가 생긴다.
- 정의를 검토하고 **`ready` 라벨**을 단다. 이것이 "에이전트가 시작해도 된다"는 유일한 서명이며,
  이 라벨 없이는 어떤 PR도 gate를 통과하지 못한다.

### ② 에이전트: 실행한다

```text
/dms-work        # ready 이슈 중 하나를 골라 수행
/dms-work 12     # 12번 이슈를 지정 수행
```

에이전트가 스스로: 클레임(self-assign+브랜치 push) → 컨텍스트 문서 독해 → 구현 →
로컬 셀프체크 → PR 생성 → 검수 대응(최대 2라운드) 후 멈춘다. **에이전트는 절대 머지하지 않는다.**

### ③ 검수: 자동으로 걸린다

- **솔로 모드(기본, API 키 불필요)**: `/dms-work`가 fresh 컨텍스트의 verifier를 스폰해 검수하고,
  PR에 head SHA가 박힌 검수 마커 코멘트를 남긴다. gate가 이 마커를 검증한다 — 새 커밋을 올리면
  자동으로 재검이 요구된다. 수동 재검은 `/dms-review <PR번호>`.
- **CI 모드**: 리포에 `ANTHROPIC_API_KEY` 시크릿을 등록하면 gate가 CI에서 검수 에이전트를
  자동 실행한다(코드 변경 불요). 기준은 두 모드 모두 [20-review-policy.md](policy/20-review-policy.md).

### ④ 머지: 티어가 결정한다

| 티어 | 무엇이 해당되나 | 머지 방법 |
|---|---|---|
| **T0** | 문서·이미지 등 비실행 콘텐츠만, 400라인 미만 | 체크 green이면 **자동 머지** — 사람 개입 0 |
| **T1** | 일반 코드 | 체크 green + **사람이 검수 리포트를 읽고 머지 클릭** |
| **T2** | 정책·CI·에이전트 지침(`.github` `scripts` `docs/policy` `.claude` `AGENTS.md` 등) | 체크 green + **쿨다운**(기본 24h, `DMS_COOLDOWN_HOURS`로 조정·0=비활성) + 사람 정독·머지 |

티어는 라벨이 아니라 **변경된 파일 경로**로 자동 판정된다(라벨 `tier:t2`로 올릴 수만 있다).
머지되면 연결 이슈가 자동으로 닫히고 대시보드에 반영된다 — 별도 보고는 없다.

## 3. 보조 커맨드

| 커맨드 | 용도 |
|---|---|
| `/dms-define <아이디어>` | 러프한 아이디어 → 폼 갖춘 이슈 초안 (ready는 사람이) |
| `/dms-review <PR>` | PR 심화 검수 + 검수 마커 갱신 |
| `/dms-test <이슈|PR|영역>` | 기획 문서 기준 실행 검증 — 발견은 `type:bug` 이슈/PR 코멘트 |
| `/dms-docs <요청>` / `--audit` | 문서 작성 위임 / 코드↔문서 드리프트 감사 |

새 프로젝트 부트스트랩(기획 이해→환경→정책 수립)은 [policy/playbooks/](policy/playbooks/)를 에이전트에게 지목한다.

## 4. 상태를 읽는 법

상태 라벨을 관리하지 않는다. **사람이 다는 라벨은 `ready`와 `blocked` 둘뿐**이고,
나머지는 GitHub 사실에서 유도된다: assignee 있음=진행중, open PR 연결=리뷰중, closed=완료.
대시보드(`npm run dev:dms:frontend` 또는 Vercel)가 이 규칙으로 칸반·타임라인·WBS를 그린다.
계획(Task/WBS)의 정본은 [plan/tasks.yaml](plan/tasks.yaml) — 이슈에 `task:T-###` 라벨을 달면 진척이 자동 집계된다.

## 5. 자주 겪는 상황

| 증상 | 원인·대응 |
|---|---|
| gate 실패: "ready 라벨이 부여된 적 없음" | 연결 이슈에 사람이 `ready`를 달지 않았다 — 정의 검토 후 라벨 부여 |
| gate 실패: "T2 쿨다운 미충족" | 정책급 변경은 24h 숙성 — 기다렸다 `recheck` 라벨, 급하면 `override` 라벨(기록됨) |
| gate 실패: "로컬 검수 기록 없음" | 새 커밋 이후 재검 안 됨 — `/dms-review <PR>` 실행 |
| gate 실패: 검수 verdict fail | PR 코멘트의 findings(근거 인용 포함)를 해소하고 재push |
| 체크가 red→green이 안 바뀜 | 같은 커밋 재평가는 `recheck` 라벨 부착으로 트리거 |
| 담당자가 잡고 방치된 이슈 | 72h 무활동 경고→96h 자동 회수(스테일). 리뷰 대기 중인 건 제외 |
| CI 검수가 API 장애로 실패 | 결정적 체크는 살아 있음 — 사람 검토 후 break-glass 절차([30-ops-policy §4](policy/30-ops-policy.md)) |

## 6. 오토파일럿 (자리 비울 때 완전 자동)

자기 전에 두 줄이면 된다:

```bash
gh variable set DMS_AUTOPILOT --body on    # 서명 게이트 완화 (끄기: --body off)
./scripts/autopilot.sh                     # 구동 루프 (기본 5건, 연속 실패 시 자동 중단)
```

ON 동안: `ready` 없이도 착수 가능(기록 남음), T1도 검수 통과 시 자동 머지.
**T2(정책·CI 변경)와 검수 요구는 절대 완화되지 않는다.** 아침에 대시보드 활동 뷰로 확인하고
끄면 된다. 정본: [10-dev-workflow.md §9](policy/10-dev-workflow.md).

야간 전용이 아니다 — **개발 초기에는 상시 ON + 쿨다운 0**이 권장 프리셋이다
(`gh variable set DMS_COOLDOWN_HOURS --body 0`). 그러면 사람이 하는 일은 T2 PR의
머지 클릭과 사후 확인뿐이다. 안정기에 off/24h로 복귀한다.

## 7. 문서를 고치고 싶을 때

문서도 코드와 같은 루프를 탄다: 이슈 → 브랜치 → PR → gate. 형식 규칙(frontmatter·요약·정본
레지스트리)은 [00-doc-system.md](policy/00-doc-system.md), 어디에 무엇을 쓰는지는 [README.md](README.md) 문서 지도 참조.
기존 문서와 현실이 어긋난 걸 발견하면 고치지 말고 우선 `type:docs` 이슈를 연다.
