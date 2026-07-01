from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def read_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="dms-console-backend",
        version=settings.version,
        environment=settings.environment,
    )
