from fastapi import APIRouter

from app import store

router = APIRouter(prefix="/wbs", tags=["wbs"])


@router.get("")
def get_wbs() -> dict:
    return store.get_wbs()
