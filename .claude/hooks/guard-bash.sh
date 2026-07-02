#!/usr/bin/env bash
# 에이전트 세션의 실수 방지용 best-effort 가드 (정본 강제는 GitHub 브랜치 보호 + 토큰 스코프 —
# docs/policy/10-dev-workflow.md §7·§8). 문자열 검사라 우회 가능하며, 그 한계는 정책 문서에 기록돼 있다.
set -euo pipefail

CMD=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || true)
[ -z "$CMD" ] && exit 0

block() { echo "차단됨(정책): $1 — docs/policy/10-dev-workflow.md §7. 머지·설정 변경은 사람이 한다." >&2; exit 2; }

# 에이전트의 머지 금지 (auto-merge 활성화 포함)
echo "$CMD" | grep -qiE 'gh[[:space:]]+pr[[:space:]]+merge' && block "gh pr merge"
# main 직접 push 금지 (refspec 변형 포함)
echo "$CMD" | grep -qiE 'git[[:space:]]+push[^|;&]*([[:space:]:/]main([[:space:]]|$)|HEAD:main)' && block "main push"
echo "$CMD" | grep -qiE 'git[[:space:]]+push[[:space:]]+(-[a-z-]+[[:space:]]+)*origin[[:space:]]*$' && block "현재 브랜치 확인 없는 push"
# 리포 설정·보호 규칙·시크릿·변수 변경 금지 (오토파일럿 토글 자가 활성화 차단 — ADR-0003)
echo "$CMD" | grep -qiE 'gh[[:space:]]+repo[[:space:]]+(edit|delete|archive)' && block "gh repo 설정 변경"
echo "$CMD" | grep -qiE 'gh[[:space:]]+secret' && block "gh secret"
echo "$CMD" | grep -qiE 'gh[[:space:]]+variable[[:space:]]+(set|delete)' && block "gh variable 변경 (오토파일럿 토글은 사람만)"
echo "$CMD" | grep -qiE 'gh[[:space:]]+api[^|;&]*-X[[:space:]]*(PUT|DELETE|PATCH)[^|;&]*(protection|permissions|visibility|merge|variables)' && block "gh api 설정 변경"
# 게이트 라벨 셀프 부여 금지
echo "$CMD" | grep -qiE 'gh[[:space:]]+(issue|pr)[[:space:]]+edit[^|;&]*--add-label[^|;&]*(ready|override)' && block "ready/override 라벨 부여"

exit 0
