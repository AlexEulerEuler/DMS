#!/usr/bin/env bash
# 야간 자율 구동 루프 (10-dev-workflow §9) — 자기 전에 실행해 두면 ready 큐를 순차 수행한다.
# 전제: 오너가 토글을 켠 상태여야 한다:  gh variable set DMS_AUTOPILOT --body on
# 안전 장치: 매 회 토글 재확인(끄면 즉시 중단), 이슈 예산, 연속 실패 중단, T2는 gate가 어차피 차단.
set -u

REPO="${DMS_REPO:-AlexEulerEuler/DMS}"
MAX_ISSUES="${1:-5}"        # 한 번의 야간 실행에서 처리할 최대 이슈 수
MAX_FAILS=2                 # 연속 실패 시 중단 (같은 문제로 밤새 태우는 것 방지)

fails=0
done_count=0

echo "[autopilot] 시작 — 예산: 이슈 ${MAX_ISSUES}개, 연속 실패 한도 ${MAX_FAILS}"

while [ "$done_count" -lt "$MAX_ISSUES" ]; do
  # 1) 킬 스위치: 토글이 꺼졌으면 즉시 중단
  TOGGLE=$(gh variable get DMS_AUTOPILOT --repo "$REPO" 2>/dev/null || echo "off")
  if [ "$TOGGLE" != "on" ]; then
    echo "[autopilot] DMS_AUTOPILOT=$TOGGLE — 중단"
    break
  fi

  # 2) 다음 일감: autopilot에서도 '정의된 작업'만 수행 (open + 미배정, ready 우선 정렬)
  NEXT=$(gh issue list --repo "$REPO" --state open --search "no:assignee" \
    --json number,labels --jq '[.[] | select(([.labels[].name] | contains(["blocked"]) | not))]
      | sort_by([(.labels[].name == "ready") | not]) | .[0].number' 2>/dev/null)
  if [ -z "$NEXT" ] || [ "$NEXT" = "null" ]; then
    echo "[autopilot] 수행할 이슈 없음 — 종료"
    break
  fi

  echo "[autopilot] 이슈 #$NEXT 착수 ($(date +%H:%M))"
  if claude -p "/dms-work $NEXT" --permission-mode acceptEdits --max-turns 150; then
    fails=0
    done_count=$((done_count + 1))
  else
    fails=$((fails + 1))
    echo "[autopilot] 실패 ${fails}/${MAX_FAILS}"
    [ "$fails" -ge "$MAX_FAILS" ] && { echo "[autopilot] 연속 실패 한도 도달 — 중단"; break; }
  fi
done

echo "[autopilot] 종료 — 처리 ${done_count}건. 아침 확인: 대시보드 활동 뷰 또는 gh pr list --state merged"
