# Medical MyData RAG Research Sandbox

This folder is an isolated research space for a medical MyData RAG system.
It assumes a mixed source set: structured JSON, clinical/lifestyle reports as
PDFs, VCF genomic files, and tabix indexes.

## Scope

Target source categories:

- outpatient treatment and pharmacy visits: HUB API `/v1/records/treatments`
- health checkups: HUB API `/v1/records/health-checkup`
- medication history: HUB API `/v1/records/medication-dispense`
- immunizations: HUB API `/v1/records/immunizations`
- genomic variants: `*.vcf.gz` and `*.vcf.gz.tbi`
- gut microbiome: `GUTINSIDE.json`
- continuous glucose report PDFs
- Holter report PDFs

The design keeps raw files in `data/raw/`, derives normalized chunks, and always
returns source metadata with retrieved evidence. Clinical answers should stay
evidence-grounded and avoid diagnosis beyond the supplied records.

## Upstage Configuration

Do not hardcode API keys. Use environment variables instead:

```bash
cd /Users/alex/DMS/test
cp .env.example .env
# edit .env locally, or export UPSTAGE_API_KEY in your shell
```

The default model is `solar-pro3`, the current Solar Pro 3 alias documented by
Upstage.

This sandbox uses both Upstage API generations intentionally:

- local chunk RAG synthesis uses Chat Completions at `https://api.upstage.ai/v1`
- file upload RAG uses File Search / Responses at `https://api.upstage.ai/v2`

For v2 Responses, put system guidance in `instructions`; do not send a
`role: system` message there. The `system` role is for Chat Completions.

Official docs checked during setup:

- Solar Pro 3 model: https://developers.upstage.ai/docs/models/solar-pro-3
- File Search / Vector Stores / Responses workflow: https://developers.upstage.ai/docs/capabilities/search/file-search
- Upstage API docs home: https://developers.upstage.ai/docs

## Local Prototype

The local prototype is deliberately dependency-light. It can classify files,
normalize structured records, call the HUB mock API for public medical MyData,
create text chunks, build a keyword index, and retrieve evidence. Upstage calls
are kept in a separate adapter.

```bash
cd /Users/alex/DMS/test
PYTHON=/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

$PYTHON scripts/generate_mock_data.py
$PYTHON -m unittest discover -s tests

PYTHONPATH=src $PYTHON -m mydata_rag.cli scan data/raw
PYTHONPATH=src $PYTHON -m mydata_rag.cli build-local-index data/raw indexes/local_keyword_index.jsonl
PYTHONPATH=src $PYTHON -m mydata_rag.cli ask-local indexes/local_keyword_index.jsonl "혈당 리포트와 홀터 리포트에서 주요 수치를 찾아줘"
```

## HUB API Ingestion

The four public medical MyData categories are API-backed. Store credentials only
in your shell or local `.env`; do not commit them.

```bash
cd /Users/alex/DMS/test
PYTHON=/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

export DSTAT_HUB_CLIENT_ID="..."
export DSTAT_HUB_CLIENT_SECRET="..."

./scripts/build-mydata-hub-index.sh 5030
PYTHONPATH=src $PYTHON -m mydata_rag.cli fetch-hub 5030 data/raw/hub/5030
PYTHONPATH=src $PYTHON -m mydata_rag.cli build-hub-index 5030 indexes/hub_5030_keyword_index.jsonl
PYTHONPATH=src $PYTHON -m mydata_rag.cli ask-local indexes/hub_5030_keyword_index.jsonl "최근 진료이력과 투약정보를 근거와 함께 요약해줘"
```

Supported mock patient numbers: `5030`, `5199`, `5337`.

More details: [docs/hub-api.md](docs/hub-api.md).

## Chat Test Interface

Run the browser-based analysis UI:

```bash
cd /Users/alex/DMS
./scripts/run-mydata-rag-chat.sh
```

Or from the `test` directory:

```bash
cd /Users/alex/DMS/test
./run_chat.sh
```

Open http://127.0.0.1:8765. Conversations are auto-saved under
`data/sessions/` and reloaded from the sidebar. The default index is
`indexes/local_keyword_index.jsonl`; use `--index-path` to point the UI at a HUB
index such as `indexes/hub_5030_keyword_index.jsonl`. If HUB credentials are set
in `/Users/alex/DMS/.env`, `/Users/alex/DMS/test/.env`, or your shell, the
`Build HUB` button can create a patient index from the UI.

From the repository root, pass a HUB index like this:

```bash
./scripts/run-mydata-rag-chat.sh indexes/hub_5030_keyword_index.jsonl
```

For Upstage-grounded generation after local retrieval:

```bash
export UPSTAGE_API_KEY="..."
PYTHONPATH=src $PYTHON -m mydata_rag.cli ask-upstage-rag \
  indexes/local_keyword_index.jsonl \
  "혈당 리포트와 약물복용 이력을 근거로 확인할 점을 정리해줘"
```

The chat UI and CLI call Upstage through the lightweight HTTP adapter in
`src/mydata_rag/upstage.py`.

For a single PDF/file upload, the CLI follows the File Search flow from the
Upstage docs: upload file, create a short-lived vector store, index the file,
then call Responses with a `file_search` tool.

```bash
export UPSTAGE_API_KEY="..."
PYTHONPATH=src $PYTHON -m mydata_rag.cli ask-upstage-file data/raw/report.pdf "이 문서를 JSON으로 구조화해줘"
```

## Current Research Bias

1. Use Upstage-managed File Search for production-scale PDF/report search.
2. Keep a local normalizer for structured MyData JSON so metadata stays precise.
3. Treat VCF as a specialized source: index annotated summaries, not raw variant
   dumps.
4. Require source citations in every medical answer.
5. Keep PHI out of logs, prompts, and generated test fixtures unless explicitly
   approved.
