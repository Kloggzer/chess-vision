"""Per-session crop counts over JSONL crop manifests, cached per (mtime_ns, size) file version."""

from __future__ import annotations

import threading
from collections import Counter
from pathlib import Path

from .ioutil import iter_jsonl, mtime_size

_LOCK = threading.Lock()
_CACHE: dict[Path, tuple[tuple[int, int], dict]] = {}


def _scan(path: Path) -> dict:
    crops: Counter = Counter()
    for row in iter_jsonl(path):
        crops[row.get("session_id")] += 1
    return {"crops_by_session": dict(crops)}


def manifest_stats(path: Path) -> dict:
    """Per-session aggregates for a manifest file; cached until the file changes."""
    path = Path(path)
    try:
        key = mtime_size(path)
    except FileNotFoundError:
        return {"crops_by_session": {}}
    with _LOCK:
        hit = _CACHE.get(path)
    if not (hit and hit[0] == key):
        hit = (key, _scan(path))
        with _LOCK:
            _CACHE[path] = hit
    # A copy: handing out the cached dict let one caller's mutation become every later answer.
    return {"crops_by_session": dict(hit[1]["crops_by_session"])}


def session_crop_count(path: Path, session_id: str) -> int:
    return manifest_stats(path)["crops_by_session"].get(session_id, 0)
