---
description: 문서 작성/개정 위임 또는 코드↔문서 드리프트 감사 — 데브가 문서에 컨텍스트를 뺏기지 않게
argument-hint: "<문서 요청 설명 | --audit [경로]>"
---

**doc-writer 서브에이전트**(.claude/agents/doc-writer.md)를 스폰해 수행하라.

- 인자가 `--audit`로 시작하면 감사 모드: 지정 경로(기본 docs/ 전체 + apps/*/docs/)의
  코드↔문서 드리프트·깨진 링크·frontmatter 누락을 검출해 `type:docs` 이슈로 발행하게 하라.
- 그 외에는 작성 모드: "$ARGUMENTS"를 문서 요청으로 전달하라. 산출물은 브랜치+PR로 나오게 하라.

완료 후 산출 PR/이슈 목록을 사람에게 요약 보고하라.
