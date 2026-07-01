# Backend image (docs/ia/runtime.md §5). Build context = apps/dms-console
# (so both backend/ and docs/ are available).
FROM python:3.12-slim

WORKDIR /app

# Runtime dependencies (kept in sync with backend/pyproject.toml).
RUN pip install --no-cache-dir \
    "fastapi[standard]>=0.115.0" \
    "pydantic-settings>=2.7.0" \
    "httpx>=0.27.0" \
    "sqlalchemy>=2.0" \
    "openpyxl>=3.1" \
    "mcp>=1.0"

COPY backend/app ./app
# The agent loop serves these docs (read-only) from DMS_DOCS_DIR.
COPY docs /docs

ENV DMS_DOCS_DIR=/docs \
    DMS_DB_PATH=/data/dms.db \
    DMS_STORAGE_DIR=/data/storage \
    DMS_SEED=0

VOLUME ["/data"]
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
