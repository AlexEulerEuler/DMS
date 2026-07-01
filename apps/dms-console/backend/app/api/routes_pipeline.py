from dataclasses import asdict

from fastapi import APIRouter
from pydantic import BaseModel

from app.pipeline.generate import run_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRunRequest(BaseModel):
    confirm: bool = True
    formats: list[str] = ["json", "xlsx"]


@router.post("/run", status_code=201)
def run(payload: PipelineRunRequest | None = None) -> dict:
    payload = payload or PipelineRunRequest()
    summary = run_pipeline(confirm=payload.confirm, export_formats=tuple(payload.formats))
    return asdict(summary)
