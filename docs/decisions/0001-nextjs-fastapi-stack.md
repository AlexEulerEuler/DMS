# 0001. Use Next.js and FastAPI for the DMS Console

## Status

Partially superseded by [ADR-0002](0002-git-native-agent-workflow.md) — FastAPI 백엔드는 제거되었고 Next.js 단독(GitHub 직접 조회)으로 전환됨. Next.js 채택 부분은 유효.

## Context

The repository contains both projects managed by DMS and the DMS console itself. The DMS console needs independently deployable frontend and backend applications without occupying `apps/frontend` or `apps/backend`, because those directories are reserved for the managed target project.

## Decision

- Use Next.js for `apps/dms-console/frontend`.
- Use FastAPI for `apps/dms-console/backend`.
- Keep DMS console API contracts under `apps/dms-console/contracts`.
- Keep app internals private to each app. Apps may communicate through HTTP APIs and shared packages, but should not import another app's internal `src` or `app` modules.

## Consequences

- The DMS console frontend can be deployed separately from the DMS console backend.
- The DMS console backend can use the Python ecosystem for document, data, and LLM workflows.
- The managed target project can still use `apps/frontend` and `apps/backend` without inheriting DMS console code.
