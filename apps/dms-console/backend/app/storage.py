"""Local file storage for uploaded inputs and generated exports (runtime.md §2)."""

import os

from app.core.config import settings


def _safe(name: str) -> str:
    return os.path.basename(name).replace("/", "_").replace("\\", "_")


def save_file(subdir: str, file_id: str, filename: str, content: bytes) -> str:
    directory = os.path.join(settings.storage_dir, subdir)
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"{file_id}__{_safe(filename)}")
    with open(path, "wb") as handle:
        handle.write(content)
    return path


def read_file(path: str) -> bytes:
    with open(path, "rb") as handle:
        return handle.read()


def delete_file(path: str | None) -> None:
    if path and os.path.exists(path):
        os.remove(path)
