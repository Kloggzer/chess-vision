"""Per-session crop counts over JSONL crop manifests, cached per (mtime_ns, size) file version."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from . import provenance
from .ioutil import iter_jsonl

_CACHE: dict[Path, tuple[tuple, dict]] = {}


def _scan(path: Path) -> dict:
    crops: Counter = Counter()
    for row in iter_jsonl(path):
        crops[row.get("session_id")] += 1
    return {"crops_by_session": dict(crops)}


def manifest_stats(path: Path) -> dict:
    """Per-session aggregates for a manifest file; cached until the file changes."""
    path = Path(path)
    if not path.exists():
        return {"crops_by_session": {}}
    stats = provenance.memo(_CACHE, path, (path,), lambda: _scan(path))
    # A copy: handing out the cached dict let one caller's mutation become every later answer.
    return {"crops_by_session": dict(stats["crops_by_session"])}


def session_crop_count(path: Path, session_id: str) -> int:
    return manifest_stats(path)["crops_by_session"].get(session_id, 0)
