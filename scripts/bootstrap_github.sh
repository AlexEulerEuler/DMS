#!/usr/bin/env bash
# GitHub 리포 설정 부트스트랩 — 오너가 직접 실행한다 (admin 토큰 필요, 에이전트 실행 금지).
# 목표 상태의 정본: docs/policy/30-ops-policy.md §1
set -euo pipefail

REPO="${DMS_REPO:-AlexEulerEuler/DMS}"

echo "== DMS GitHub 부트스트랩: $REPO =="
echo
echo "[0/5] 전제 확인"
gh auth status
read -r -p "리포를 public으로 전환합니다 (브랜치 보호·Actions 무제한의 전제). 계속? [y/N] " ok
[ "${ok:-n}" = "y" ] || { echo "중단"; exit 1; }

echo "[1/5] 리포 공개 전환 + 머지 설정"
gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
gh repo edit "$REPO" --enable-auto-merge --delete-branch-on-merge --enable-squash-merge

echo "[2/5] 라벨 생성 (정본: docs/policy/10-dev-workflow.md §4)"
create_label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force; }
create_label "type:feature" "1D76DB" "기능"
create_label "type:bug"     "D73A4A" "구현이 문서와 다름"
create_label "type:docs"    "0075CA" "문서가 낡음/필요"
create_label "type:chore"   "CFD3D7" "잡무"
create_label "type:spike"   "D4C5F9" "조사"
create_label "area:console-frontend" "BFD4F2" "콘솔 프론트엔드"
create_label "area:docs"    "BFD4F2" "문서"
create_label "area:infra"   "BFD4F2" "인프라"
create_label "area:target-frontend" "BFD4F2" "관리 대상 프론트"
create_label "area:target-backend"  "BFD4F2" "관리 대상 백엔드"
create_label "P0" "B60205" "긴급"; create_label "P1" "D93F0B" "높음"
create_label "P2" "FBCA04" "보통"; create_label "P3" "C2E0C6" "낮음"
create_label "ready"    "0E8A16" "착수 승인 (사람만 부여)"
create_label "blocked"  "F9A825" "차단됨"
create_label "epic"     "3E4B9E" "분해 트리 루트"
create_label "by:agent" "EDEDED" "에이전트 생성"
create_label "tier:t2"  "5319E7" "티어 상향 (상향만 가능)"
create_label "recheck"  "EDEDED" "gate 재평가 트리거"
create_label "override" "B60205" "쿨다운/게이트 우회 — 감사 대상"

echo "[3/5] main 브랜치 보호 (required check: gate·quality, 관리자 포함)"
gh api -X PUT "repos/$REPO/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "checks": [ { "context": "gate" }, { "context": "quality" } ] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

echo "[4/5] Actions 기본 권한 축소 + 'Actions의 PR 승인' OFF 확인"
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=false

echo "[5/5] 남은 수동 단계"
cat <<'EOF'

  1. 시크릿 등록:  gh secret set ANTHROPIC_API_KEY --repo <repo>
     (gate의 에이전트 검수용 — 없으면 검수는 경고 후 생략되는 부트스트랩 모드)
  2. 에이전트 세션용 fine-grained PAT 발급 (docs/policy/30-ops-policy.md §2):
     - Repository access: DMS 한정
     - Permissions: Contents/Pull requests/Issues = Read and write. 그 외 전부 없음
       (Administration·Checks·Commit statuses 제외가 핵심)
     - 에이전트 세션에서: export GH_TOKEN=<그 토큰>  (오너 admin 토큰과 분리 보관)
  3. Vercel 프로젝트 생성: apps/dms-console/frontend,
     env: DMS_GITHUB_OWNER, DMS_GITHUB_REPO, GITHUB_TOKEN(읽기 전용 PAT)
  4. (권장) .github/workflows의 third-party 액션을 SHA로 핀:
     gh api repos/anthropics/claude-code-action/git/ref/tags/v1 로 SHA 확인 후 교체
EOF
echo "완료. 이후 모든 변경은 규약 경로(이슈→브랜치→PR→gate)를 따른다."
