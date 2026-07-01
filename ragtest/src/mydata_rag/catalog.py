from __future__ import annotations

from pathlib import Path

from .models import SourceFile


JSON_CATEGORY_HINTS = {
    "activity": "lifestyle",
    "baseline": "health_baseline",
    "dental": "preventive_screening",
    "history": "health_history",
    "lab": "health_baseline",
    "labs": "health_baseline",
    "treatment": "treatment",
    "checkup": "checkup",
    "fitness": "lifestyle",
    "healthy": "health_baseline",
    "medication": "medication",
    "mental": "mental_wellbeing",
    "nutrition": "lifestyle",
    "preventive": "preventive_screening",
    "profile": "health_baseline",
    "screening": "preventive_screening",
    "sleep": "lifestyle",
    "immunization": "immunization",
    "vitals": "home_vitals",
    "vision": "preventive_screening",
    "wellbeing": "mental_wellbeing",
    "wellness": "health_baseline",
    "gutinside": "microbiome",
}


def classify_path(path: Path) -> SourceFile:
    name = path.name.lower()
    suffixes = "".join(path.suffixes).lower()

    if suffixes.endswith(".vcf.gz.tbi"):
        return SourceFile(str(path), "genomic_index", "tbi")
    if suffixes.endswith(".vcf.gz"):
        return SourceFile(str(path), "genomic_vcf", "vcf")

    if path.suffix.lower() == ".json":
        for hint, category in JSON_CATEGORY_HINTS.items():
            if hint in name:
                return SourceFile(str(path), category, "json")
        return SourceFile(str(path), "unknown", "json")

    if path.suffix.lower() == ".pdf":
        if "glucose" in name or "blood" in name or "혈당" in name:
            return SourceFile(str(path), "glucose_report", "pdf")
        if "holter" in name or "홀터" in name:
            return SourceFile(str(path), "holter_report", "pdf")
        if "checkup" in name or "wellness" in name or "건강" in name:
            return SourceFile(str(path), "wellness_report", "pdf")
        return SourceFile(str(path), "unknown", "pdf")

    return SourceFile(str(path), "unknown", path.suffix.lower().lstrip(".") or "file")


def iter_source_files(root: Path) -> list[SourceFile]:
    files: list[SourceFile] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name == ".gitkeep":
            continue
        files.append(classify_path(path))
    return files
