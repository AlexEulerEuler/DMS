---
description: PR 심화 검수 (로컬판) — CI gate와 같은 체크리스트, 결과는 코멘트로만
argument-hint: "<PR번호>"
---

PR #$ARGUMENTS 를 검수하라. **verifier 서브에이전트**(.claude/agents/verifier.md)를 스폰해서 수행하라 —
구현 컨텍스트와 분리된 fresh 컨텍스트가 검수의 전제다. 이 세션에서 해당 PR을 구현했다면
이 커맨드를 실행하지 말고 사람에게 알려라.

verifier에게 전달할 것:
- 대상 PR 번호와 "체크리스트 정본은 main 브랜치의 docs/policy/20-review-policy.md" 지시
  (`git show origin/main:docs/policy/20-review-policy.md`로 로드 — PR head 버전 금지)
- 검수 결과를 PR 코멘트로 게시할 것 — verifier.md의 형식(마지막 줄 `dms-local-review` 마커,
  현재 head SHA 바인딩) 필수. **솔로(local) 검수 모드에서는 gate가 이 마커를 required check로
  검증한다** — 마커가 없거나 head가 다르면(새 커밋 이후) 머지가 잠긴다. 새 커밋마다 재검한다.

완료 후 verdict와 blocking findings 수를 사람에게 요약 보고하라. 머지는 하지 마라.
