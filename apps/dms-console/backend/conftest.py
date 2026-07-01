"""Test bootstrap: point the app at a fresh temp SQLite DB and seed it.

Env vars are set BEFORE importing app modules so Settings() (instantiated at
import time) picks up the temp paths. Module-level TestClient(app) does not run
the FastAPI lifespan, so we initialize the DB explicitly here.
"""

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="dms-test-")
os.environ["DMS_DB_PATH"] = os.path.join(_tmp, "test.db")
os.environ["DMS_STORAGE_DIR"] = os.path.join(_tmp, "storage")
os.environ["DMS_SEED"] = "1"
os.environ.setdefault("DMS_API_TOKEN", "")  # keep API open during tests

from app.db import init_db  # noqa: E402

init_db()
