from fastapi import APIRouter, Response

from app import store
from app.core.errors import AppError

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/meta")
def get_meta() -> dict:
    return {"meta": store.get_meta(), "pipeline": store.get_pipeline_summary()}


@router.get("/outputs")
def get_outputs() -> dict:
    return store.get_outputs()


@router.get("/outputs/{kind}/{item_id}/download")
def download_output(kind: str, item_id: str) -> Response:
    result = store.get_download(kind, item_id)
    if result is None:
        raise AppError(404, "not_found", "다운로드할 파일을 찾을 수 없습니다.")
    filename, content = result
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/docs/{slug}")
def get_doc(slug: str) -> dict:
    return store.get_doc(slug)
