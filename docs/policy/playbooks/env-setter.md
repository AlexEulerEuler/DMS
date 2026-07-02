---
layer: policy
status: approved
owner: product-owner
---

# 플레이북: 환경 세터

## 요약

기획 정본(IA)을 보고 개발·실행 환경을 세우는 절차. 원칙: 실제 서버에선 서버 분리,
로컬에선 도커로 환경 분리. 저빈도 부트스트랩 작업이라 플레이북으로 둔다.

## 절차

1. **입력**: 대상 앱의 기획 정본과 스택 결정(ADR). 스택이 미정이면 먼저 ADR 초안을 제안한다.
2. **로컬 환경**: `docker-compose.dev.yml`(서비스·DB 분리), `.env.example`(필수 변수 전부,
   실값 금지), `scripts/dev-<앱>.sh`. 로컬 명령은 리포 루트 `package.json` 스크립트로 노출한다.
3. **CI 품질 체크**: `.github/workflows/quality.yml`에 해당 앱의 검사(테스트·린트·타입체크·빌드)를
   추가한다 — 반드시 잡 내부 변경 감지 패턴(paths 필터 금지 — 기존 quality.yml 주석 참조)을 따른다.
4. **프리뷰**: `.claude/launch.json`에 dev 서버 항목을 추가한다(에이전트 검증용).
5. **문서화**: 실행 방법을 해당 앱 `AGENTS.md`의 명령 섹션에 반영한다.
6. **산출**: 하나의 PR. `.github/**` 변경이 포함되므로 T2 경로임을 PR 본문에 명시한다.

## 완료 기준

클론 직후 `npm run dev:<앱>` 한 번으로 로컬 실행이 되고, CI가 그 앱의 품질을 검사한다.
