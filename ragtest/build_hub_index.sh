#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SCRIPT_DIR"

for ENV_FILE in "$ROOT_DIR/.env" "$SCRIPT_DIR/.env"; do
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
  fi
done

PYTHON_BIN="${PYTHON:-/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python3"
fi

PATIENT_SEQ="${1:-5030}"
INDEX_PATH="${2:-indexes/hub_${PATIENT_SEQ}_keyword_index.jsonl}"

PYTHONPATH=src "$PYTHON_BIN" -m mydata_rag.cli build-hub-index "$PATIENT_SEQ" "$INDEX_PATH"
