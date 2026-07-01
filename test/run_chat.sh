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

INDEX_PATH="indexes/local_keyword_index.jsonl"
if [[ $# -gt 0 ]]; then
  if [[ "$1" == "--index-path" ]]; then
    INDEX_PATH="${2:?--index-path requires a value}"
    shift 2
  elif [[ "$1" != --* ]]; then
    INDEX_PATH="$1"
    shift
  fi
fi

PYTHONPATH=src "$PYTHON_BIN" -m mydata_rag.server --index-path "$INDEX_PATH" "$@"
