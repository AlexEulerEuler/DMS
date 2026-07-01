from fastapi import APIRouter, File, UploadFile

from app import store

router = APIRouter(prefix="/inputs", tags=["inputs"])


@router.get("")
def list_inputs() -> dict:
    return store.list_inputs()


@router.post("/{source_type}", status_code=201)
async def upload_input(source_type: str, file: UploadFile = File(...)) -> dict:
    content = await file.read()
    result = store.create_input(source_type, file.filename or "upload", content)
    return result.model_dump()


@router.delete("/{input_id}", status_code=204)
def delete_input(input_id: str) -> None:
    store.delete_input(input_id)
