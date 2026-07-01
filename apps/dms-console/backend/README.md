# DMS Console Backend

FastAPI backend for the DMS management console.

## Development

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

OpenAPI schema:

```bash
npm run openapi:dms:backend
```
