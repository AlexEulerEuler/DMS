"""SQLite engine + session (docs/ia/runtime.md §1).

A single SQLite file (``DMS_DB_PATH``) holds all mutable, console-owned state so
it survives restarts. Store functions open a short-lived session per call via the
``session_scope()`` context manager, which keeps the router/API layer unchanged.
Swapping to Postgres later is a URL change (SQLAlchemy abstracts the rest).
"""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


# check_same_thread=False: FastAPI runs sync endpoints in a threadpool, so a
# connection may be used across threads. Sessions are still per-call (not shared).
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional session: commit on success, rollback on error, always close."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create tables (idempotent) and seed an empty DB when enabled."""
    # Import models so they register on Base.metadata before create_all.
    from app import models_db  # noqa: F401

    Base.metadata.create_all(bind=engine)

    if settings.seed:
        from app.seed import seed_if_empty

        seed_if_empty()
