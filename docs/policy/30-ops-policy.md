---
layer: policy
status: approved
owner: product-owner
---

# 운영 정책

## 요약

배포·시크릿·장애 대응·리포 설정의 규칙. 대시보드는 Vercel(읽기 전용), 작업 흐름의 강제 장치는
GitHub 설정(브랜치 보호·auto-merge·Actions)이며, 이 설정의 목표 상태를 여기 기록해
드리프트를 점검할 수 있게 한다.

## 1. 리포 설정의 목표 상태 (부트스트랩 스크립트 `scripts/bootstrap_github.sh`가 적용)

- 리포 공개(public) — 브랜치 보호·Actions 무제한의 전제
- main 브랜치 보호: PR 필수, required status check = `gate`, force-push 금지,
  **관리자 포함(enforce_admins)**, 머지 시 브랜치 자동 삭제
- Allow auto-merge: ON (T0 자동 머지의 전제 — required check 선행 구성 후에만 의미 있음)
- "Allow GitHub Actions to create and approve pull requests": **OFF 유지**
- 라벨: [10-dev-workflow.md](10-dev-workflow.md) §4 라벨 사전대로 생성
- 시크릿: `ANTHROPIC_API_KEY` (gate 검수 에이전트용)

주의: 이 잠금은 설정이 유지되는 동안만 유효하다. 오너 admin 토큰을 쥔 세션은 설정을 바꿀 수 있으므로,
에이전트 세션에는 admin 스코프 없는 fine-grained PAT만 준다(10-dev-workflow §7).

## 2. 토큰·시크릿

- 에이전트 세션 `GH_TOKEN`: fine-grained PAT — Contents/Pull requests/Issues **write**,
  Administration·delete_repo·Checks/Statuses write **제외**. 오너 admin 토큰은 에이전트 세션 밖에 보관.
- 대시보드(Vercel) `GITHUB_TOKEN`: 읽기 전용 fine-grained PAT (Contents/Issues/PR read).
- 시크릿을 리포 파일·로그에 쓰지 않는다. 유출 의심 시 즉시 회수·재발급이 1순위.

## 3. 배포

- 대시보드: Vercel — `apps/dms-console/frontend`, 환경변수 `DMS_GITHUB_OWNER`/`DMS_GITHUB_REPO`/`GITHUB_TOKEN`.
  main 머지 시 자동 배포. 대시보드 장애는 개발을 막지 않는다(읽기 전용 투영).
- 관리 대상 프로젝트(apps/frontend·backend)의 배포 정책은 해당 프로젝트 확정 시 이 문서에 추가한다.

## 4. 장애·예외 대응

- gate의 검수 에이전트가 인프라 오류(API 장애)로 실패하면: verdict FAIL과 구분되는 오류로 처리되며
  `recheck` 라벨 부여로 재시도한다. 장애가 길어지면 결정적 체크(테스트·린트)는 살아 있으므로
  T1은 사람 정독 후 **break-glass**: `override` 라벨 + 사유 코멘트 + 사후 감사 기록으로 머지할 수 있다.
- hotfix: `hotfix/` 브랜치로 즉시 PR, 사후 이슈 필수. T2 경로는 hotfix로도 우회하지 않는다.
- 스케줄 워크플로우는 공개 리포에서 60일 무활동 시 자동 비활성화된다 — 분기별로 상태를 확인한다.
