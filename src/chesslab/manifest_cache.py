"""mtime-based cache of per-session aggregates over crop manifests (JSONL).

The web UI repeatedly needs "how many crops / which frames does session X have?".
Reading a 300k-line manifest per request (or worse, per session) is what made the
sessions panel slow. Instead each manifest is scanned ONCE per file version
((mtime_ns, size) key) and the aggregates are served from memory afterwards.
Manifests are append-mostly, so any write changes mtime/size and invalidates the
entry automatically. This deliberately stays a cache over the JSONL source of
truth — no database, nothing to migrate or keep in sync.
"""

from __future__ import annotations

import json
import threading
from collections import Counter
from pathlib import Path

_LOCK = threading.Lock()
_CACHE: dict[Path, tuple[tuple[int, int], dict]] = {}


def _scan(path: Path) -> dict:
    crops: Counter = Counter()
    frames: dict[str, set] = {}
    stats_rows: list[dict] = []          # only the fields compute_stats() reads
    by_label: dict[str, list] = {}       # only the fields the class browser needs
    intern = {}                          # dedupe repeated strings (session ids, labels, colors)

    def _i(v):
        return intern.setdefault(v, v)

    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            r = json.loads(line)
            sid = _i(r.get("session_id"))
            lab = _i(r.get("label"))
            crops[sid] += 1
            frames.setdefault(sid, set()).add(str(r.get("frame")))
            stats_rows.append({"label": lab, "square_color": _i(r.get("square_color")),
                               "session_id": sid})
            by_label.setdefault(lab, []).append({"path": r.get("path"), "session_id": sid,
                                                 "frame": r.get("frame"),
                                                 "square": r.get("square"), "label": lab})
    return {"crops_by_session": dict(crops),
            "frames_by_session": {k: sorted(v) for k, v in frames.items()},
            "stats_rows": stats_rows, "by_label": by_label}


def manifest_stats(path: Path) -> dict:
    """Per-session aggregates for a manifest file; cached until the file changes."""
    path = Path(path)
    try:
        st = path.stat()
    except FileNotFoundError:
        return {"crops_by_session": {}, "frames_by_session": {}}
    key = (st.st_mtime_ns, st.st_size)
    with _LOCK:
        hit = _CACHE.get(path)
        if hit and hit[0] == key:
            return hit[1]
    stats = _scan(path)
    with _LOCK:
        _CACHE[path] = (key, stats)
    return stats


def session_crop_count(path: Path, session_id: str) -> int:
    return manifest_stats(path)["crops_by_session"].get(session_id, 0)


def stats_rows(path: Path) -> list[dict]:
    """Lightweight rows (label/square_color/session_id) — enough for compute_stats()."""
    return manifest_stats(path)["stats_rows"]
