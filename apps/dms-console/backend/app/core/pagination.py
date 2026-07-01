"""Page envelope helper (api-contract.md §1.3)."""

from app.schemas.common import MAX_PAGE_SIZE


def paginate(items: list, page: int, size: int) -> dict:
    page = max(page, 1)
    size = max(1, min(size, MAX_PAGE_SIZE))
    start = (page - 1) * size
    end = start + size
    return {"items": items[start:end], "total": len(items), "page": page, "size": size}
