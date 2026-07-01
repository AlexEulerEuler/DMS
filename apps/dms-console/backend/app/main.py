from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db import init_db

# Endpoints reachable without the token even when the gate is on.
_AUTH_EXEMPT = {"/api/health"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables + seed an empty DB on startup (docs/ia/runtime.md §1).
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        description="Service API for the DMS console.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    @app.middleware("http")
    async def auth_gate(request: Request, call_next):
        # Optional shared-secret gate (runtime.md §5). When DMS_API_TOKEN is set,
        # /api/* (except health) requires `Authorization: Bearer <token>`. CORS
        # preflight (OPTIONS) always passes. Multi-user auth is future work.
        if settings.api_token and request.method != "OPTIONS":
            path = request.url.path
            if path.startswith("/api") and path not in _AUTH_EXEMPT:
                if request.headers.get("authorization") != f"Bearer {settings.api_token}":
                    return JSONResponse(
                        status_code=401,
                        content={"error": {"code": "unauthorized", "message": "인증 토큰이 필요합니다."}},
                    )
        return await call_next(request)

    app.include_router(api_router, prefix="/api")

    @app.get("/", tags=["root"])
    def read_root() -> dict[str, str]:
        return {
            "service": "dms-console-backend",
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


app = create_app()
