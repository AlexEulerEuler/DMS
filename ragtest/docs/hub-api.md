# HUB API Integration

The following public medical MyData categories are fetched from the DSTAT HUB
mock API instead of local JSON files.

Base URL:

```text
https://dev-dstat-hub-api.lulumedic.com
```

Spec pages checked:

- Swagger UI: https://dev-dstat-hub-api.lulumedic.com/docs/api-test.html
- ReDoc guide: https://dev-dstat-hub-api.lulumedic.com/docs/api-guide.html
- OpenAPI spec: https://dev-dstat-hub-api.lulumedic.com/docs/openapi3.json

## Authentication

Token endpoint:

```text
POST /v1/auth/token
```

Request body:

```json
{
  "grantType": "CLIENT_CREDENTIALS",
  "clientId": "...",
  "clientSecret": "..."
}
```

The response contains `data.accessToken`, which is sent as:

```text
Authorization: Bearer <accessToken>
```

Credentials must stay in environment variables or a local, uncommitted `.env`
file.

## Record Endpoints

All four endpoints take `patientSeq` as a query parameter.

| Category | Endpoint |
| --- | --- |
| treatment | `GET /v1/records/treatments` |
| checkup | `GET /v1/records/health-checkup` |
| medication | `GET /v1/records/medication-dispense` |
| immunization | `GET /v1/records/immunizations` |

Mock patient numbers:

```text
5030, 5199, 5337
```

## Commands

```bash
cd /Users/alex/DMS/test
PYTHON=/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

export DSTAT_HUB_CLIENT_ID="..."
export DSTAT_HUB_CLIENT_SECRET="..."

PYTHONPATH=src $PYTHON -m mydata_rag.cli fetch-hub 5030 data/raw/hub/5030
PYTHONPATH=src $PYTHON -m mydata_rag.cli build-hub-index 5030 indexes/hub_5030_keyword_index.jsonl
```

`fetch-hub` writes raw API snapshots under ignored `data/raw/hub/`.
`build-hub-index` fetches the API responses and immediately builds a local
keyword index without persisting snapshots.

Use the chat UI against a HUB index:

```bash
cd /Users/alex/DMS
./scripts/run-mydata-rag-chat.sh indexes/hub_5030_keyword_index.jsonl
```
