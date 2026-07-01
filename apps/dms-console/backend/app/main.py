from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        description="Service API for the DMS console.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
