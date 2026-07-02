---
layer: decision
status: approved
owner: product-owner
---

# ADR-0003. 오토파일럿 모드 — 사람 서명 게이트의 명시적 on/off

## 요약

사람 부재 시(수면 등) 시스템이 완전 자동으로 돌 수 있도록 `ready` 서명과 T1 머지 클릭을
리포 변수 토글로 완화한다. 트레이드오프: 야간 자율성 ↔ 사람 사전 검토 생략 — T2 불변·검수
필수 유지·admin 전용 토글·전량 사후 감사로 상쇄한다.

## 맥락

기본 모드는 모든 착수에 사람의 `ready` 서명, T1 머지에 사람 클릭을 요구한다(ADR-0002).
오너가 자리를 비우는 동안에도 정의된 작업이 진행되기를 원하며, 이를 명시적 스위치로
켜고 끌 수 있어야 한다.

## 결정

- 토글 = 리포 Actions 변수 `DMS_AUTOPILOT` (on/off). "에이전트가 스스로 켤 수 없다"는 **3중 방어**로 보장한다:
  ① fine-grained PAT에 변수 권한 미부여(토큰 수준 — 30-ops-policy §2 적용 시), ② 로컬 가드 훅·deny 목록이
  `gh variable set/delete`를 차단(admin 토큰을 임시로 쓰는 기간의 방어 — 검수에서 발견된 공백을 보강),
  ③ 절차 금지(10-dev-workflow §7). 어느 하나가 뚫려도 나머지가 막는다.
- ON 시: gate가 `ready` 미부여를 error→warning으로 완화하고, T1도 전 체크 green이면 auto-merge.
- **불변 조건**: T2(정책·CI·에이전트 지침)는 어떤 모드에서도 사람 머지 + 쿨다운.
  검수(로컬 마커/CI verdict)와 결정적 체크는 어떤 모드에서도 완화되지 않는다. `blocked`는 항상 착수 금지.
- 야간 구동은 `scripts/autopilot.sh` — 매 회 토글 재확인(킬 스위치), 이슈 예산(기본 5건),
  연속 실패 2회 중단. 상세 정본: [10-dev-workflow.md §9](../policy/10-dev-workflow.md).

## 기각한 대안

- **라벨/리포 파일로 토글**: 에이전트 토큰으로 조작 가능해져 "자율 모드를 스스로 켜는 에이전트"를
  허용하게 됨 — 전용성 훼손으로 기각.
- **ready 완화 없이 T1 자동 머지만**: 자기 전 큐를 전부 ready 처리하면 되지만, 야간에 파생되는
  후속 작업(테스터 발견 등)이 멈춘다 — "완전 자동" 요구에 미달. 대신 완화 사실을 gate warning으로 기록.

## 결과

- gate.yml(auto-merge 조건·변수 전달), gate-checks.mjs(ready 완화·autopilot 출력),
  scripts/autopilot.sh 신설, 10-dev-workflow §9·guide.md 갱신.
- 야간 자동 머지분은 표본 감사 1순위 표본이 된다.
