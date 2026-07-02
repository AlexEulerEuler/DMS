---
layer: policy
status: approved
owner: product-owner
---

# 개발 워크플로우 정책

## 요약

작업 항목은 GitHub 이슈, 클레임은 self-assign + 브랜치 push, 상태는 GitHub 사실에서 유도한다.
모든 변경은 `work/<이슈번호>-<slug>` 브랜치의 PR로만 main에 들어가며, gate CI(required check)가
티어를 판정해 규약·검수를 강제한다. 머지는 사람만 한다(T0 자동 머지는 gate가 관리).

## 1. 작업 항목과 상태

- 작업 항목의 단일 레코드는 **GitHub 이슈**다. 이슈 폼(`.github/ISSUE_TEMPLATE/work.yml`)의
  필수 필드(배경/목적, 완료 조건, 컨텍스트 문서, 예상 변경 영역, 비범위)를 채워야 한다.
- 큰 작업은 상세 스펙을 `docs/work/<이슈번호>-<slug>.md`로 작성하고 이슈 본문에서 링크한다.
  스펙 문서 PR은 `Refs #N`(비종결 참조)을 쓴다 — `Closes`는 구현 PR 1개만 쓴다.
- 에픽: `epic` 라벨 이슈 + 본문 체크리스트(`- [ ] #124`)로 하위 이슈를 나열한다.

**상태는 라벨이 아니라 GitHub 사실에서 유도한다.** 판정 우선순위(위가 이김):

| 우선 | 상태 | 판정 규칙 |
|---|---|---|
| 1 | Blocked | open + `blocked` 라벨 |
| 2 | Review | 해당 이슈를 `Closes #N`으로 참조하는 open PR(draft 제외) 존재 |
| 3 | In Progress | open + assignee 있음 |
| 4 | Todo (Ready) | open + `ready` 라벨 + assignee 없음 |
| 5 | Backlog (Draft) | open + `ready` 라벨 없음 |
| — | Done | closed |

사람이 다는 상태성 라벨은 `ready`(착수 승인 서명)와 `blocked` 둘뿐이다.
`ready` 없는 이슈에 에이전트는 착수할 수 없다. `ready` 부여는 사람만 한다.

## 2. 클레임 프로토콜 (중앙 서버 없는 상호배제)

```text
1. gh issue view N --json assignees  →  비어 있지 않으면 다른 이슈로
2. gh issue edit N --add-assignee @me
3. 재조회: 자기 혼자가 아니면 assign 이벤트 시각이 늦은 쪽이 self-unassign 후 양보
4. 브랜치 work/N-slug 를 origin에 push — 같은 계정의 다중 세션 경합은
   "해당 브랜치를 먼저 push한 세션이 승자" (git push의 원자성)
5. 이슈 코멘트 1줄: "클레임: 브랜치 work/N-slug"
```

- 클레임 전 같은 area의 진행 중 PR을 확인하고(`gh pr list --state open`), 파일 겹침이 예상되면 그 이슈를 피한다.
- 순서 의존 작업은 PR 본문에 `Depends-on: #M` — gate가 M이 open인 동안 실패 처리하고,
  M이 닫히면 `recheck` 라벨 부여로 재평가한다.
- 스테일 회수: assignee가 있는데 72시간 활동(push·PR·코멘트) 없음 → 경고 코멘트, 96시간 → 자동 unassign.
  **단, open PR이 연결된 이슈는 제외한다**(리뷰 대기는 사람 몫).

## 3. 브랜치·커밋·PR 규약 (기계 파싱 대상 — 대시보드·CI의 계약)

**브랜치**: `^(work|feat|fix|docs|chore|refactor)/\d+-[a-z0-9-]+$` — 숫자는 이슈 번호, 슬러그 필수.
예외 prefix는 `hotfix/`(사후 이슈 필수)와 `bootstrap/`(초기 구축기 한정) 둘뿐이다.

**커밋**: Conventional Commits + 이슈 참조 + 에이전트 트레일러.

```text
feat(console-frontend): 이슈 목록 GitHub 직접 조회로 전환 (#123)

<본문: 무엇을 왜>

Agent: claude-code
```

`Agent:` 트레일러는 에이전트 산출 커밋의 기계 식별 신호다(대시보드 활동 뷰·감사 추적).

**PR**: 본문에 `Closes #N`(구현 PR) 또는 `Refs #N`(부속 PR) 필수, N은 브랜치 번호와 일치.
템플릿(`.github/PULL_REQUEST_TEMPLATE.md`)의 섹션(요약·연결·변경 사항·검증·문서 영향·정책 준수)을 전부 작성한다.
이슈당 구현 PR 1개가 원칙이다. PR 직전 `git rebase origin/main`을 수행한다.

## 4. 라벨 사전 (단일 정본 — CI·대시보드·부트스트랩 스크립트가 이 표를 구현)

| 축 | 값 | 용도 |
|---|---|---|
| type | `type:feature` `type:bug` `type:docs` `type:chore` `type:spike` | 작업 성격 |
| area | `area:console-frontend` `area:docs` `area:infra` `area:target-frontend` `area:target-backend` | 영역·충돌 회피·정책 라우팅 |
| priority | `P0` `P1` `P2` `P3` | 긴급/높음/보통/낮음 |
| task | `task:T-###` | 이슈 → 계획(tasks.yaml) 연결. 이슈당 1개 |
| 게이트 | `ready` `blocked` | 사람이 다는 유이한 상태성 라벨 |
| 구조 | `epic` | 분해 트리 루트 |
| 출처 | `by:agent` | 에이전트 생성 이슈 표식 |
| 제어 | `tier:t2` `recheck` `override` | 티어 상향(상향만 가능)·재평가·쿨다운 우회(기록됨) |

## 5. 티어 결정 테이블 (gate가 구현 — 라벨이 아니라 변경 경로+diff로 판정)

| 티어 | 판정 (위에서부터, 첫 매치) | 머지 조건 |
|---|---|---|
| **T2 헌법급** | diff가 다음 중 하나라도 접촉: `.github/**`, `scripts/**`, `docs/policy/**`, `docs/principles.md`, `docs/templates/**`, `CLAUDE.md`, `**/AGENTS.md`, `.claude/**`, 루트 `package.json`·lockfile. 또는 `tier:t2` 라벨 | 전 체크 green + **24h 쿨다운**(마지막 실질 커밋 기준, `override` 라벨은 기록됨) + 사람 정독·머지 |
| **T0 자동** | diff의 **모든** 파일이 비실행 콘텐츠(`docs/**`, `work/**`, `*.md`, 이미지)이고 총 400라인 미만 | 전 체크 green → gate가 auto-merge 활성화. 사람 개입 0 |
| **T1 코드** | 그 외 전부 | 전 체크 green + 사람이 **check run의 리뷰 리포트**를 읽고 머지. **오토파일럿 ON 시 자동 머지**(§9) |

라벨은 티어를 **올릴 수만** 있다. rename·심링크·모드 변경도 경로 검사에 포함한다(`git diff --name-status`).

## 6. 검수 (정본: [20-review-policy.md](20-review-policy.md))

- 1차 잠금은 **결정적 체크**(테스트·린트·타입체크·규약 검사)다. LLM 리뷰는 가산 신호다.
- 검수 모드 2종(20-review-policy §6): **local(솔로, 기본)** — 로컬 fresh 서브에이전트가 검수하고
  head SHA 마커 코멘트를 남기면 gate가 검증. **ci(옵션)** — 시크릿 등록 시 CI 검수 에이전트 자동 활성화.
- 사람은 리뷰 **코멘트**가 아니라 head SHA에 바인딩된 **check run 결과**를 신뢰한다.

## 7. 금지 사항 (에이전트·사람 공통, 위반 시 즉시 revert 대상)

- 에이전트의 PR 머지, auto-merge 활성화, `ready`·`override` 라벨 부여
- main 직접 push, 보호 규칙·리포 설정 변경
- `pull_request_target` + head checkout + secrets 조합 (워크플로우 작성 시)
- "Allow GitHub Actions to create and approve pull requests" 설정 ON
- 에이전트 세션에 admin 스코프 토큰 주입 — 에이전트용 `GH_TOKEN`은 fine-grained PAT
  (Contents/Pull requests/Issues write만, Administration·delete_repo·Checks/Statuses write 제외)

## 8. 잔여 위험 (정직한 기록)

단일 계정 운용의 한계로 다음은 기계 강제가 아니라 절차 규율이다: T1의 "사람이 머지",
override 라벨의 인간 전용성. 보완: gate의 check run 바인딩, 대시보드의 자동 머지 피드,
주간 표본 감사(0-findings 자동 머지 편향 샘플링).

## 9. 오토파일럿 모드 (사람 부재 시 완전 자동 — on/off 토글)

리포 변수 **`DMS_AUTOPILOT`** 하나로 켜고 끈다. 변수 관리 권한은 admin 전용이므로
**에이전트는 스스로 켤 수 없다** (라벨·파일 방식으로 구현 금지 — 이 전용성이 무너진다).

```bash
gh variable set DMS_AUTOPILOT --body on     # 켜기 (자기 전)
gh variable set DMS_AUTOPILOT --body off    # 끄기 (킬 스위치 — 다음 gate 실행부터 반영)
./scripts/autopilot.sh [최대이슈수]          # 야간 구동 루프 (기본 5건, 연속 실패 2회 중단, 매 회 토글 재확인)
```

ON일 때 바뀌는 것 — 완화되는 것은 **착수 서명과 머지 클릭뿐**, 검수는 그대로:

| 게이트 | OFF (기본) | ON |
|---|---|---|
| `ready` 착수 서명 | 필수 (gate error) | 경고로 완화 — 위반 기록은 남음 |
| T0 머지 | 자동 | 자동 (변화 없음) |
| T1 머지 | 사람 클릭 | 전 체크 green 시 **자동 머지** |
| **T2 머지** | 쿨다운 + 사람 | **변화 없음 — 어떤 모드에서도 사람** |
| 검수(로컬 마커/CI verdict) | 필수 | **필수 (완화 없음)** |
| `blocked` 라벨 | 착수 금지 | 착수 금지 |

안전 근거: 시스템이 밤새 자기 규칙(T2 경로: `.github`·`docs/policy`·`.claude` 등)을 바꿀 수 없고,
모든 자동 머지는 여전히 결정적 체크+검수를 통과해야 한다. 아침에 대시보드 활동 뷰와
`gh pr list --state merged`로 전량 확인하며, 야간 자동 머지분은 표본 감사(20-review-policy §5)의 1순위 표본이다.
