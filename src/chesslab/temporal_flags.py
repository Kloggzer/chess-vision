"""Persist SAM-free anomaly measurements and route candidates to position review.

One derived report per recording keeps re-scans independent. Human corrections
and matte coverage remain authoritative; this module never writes either.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from pathlib import Path

from . import config
from .calibration import profile_path
from .cell_rule import PIECE_VISIBLE_MAX
from .ioutil import read_jsonl, write_rows
from .labeling import all_squares
from .provenance import version
from .realgames.position import SETTLE_MIN_FRAMES
from .session_store.log import read_log_rows
from .session_store.matte import read_matte
from .session_store.names import log_path, meta_path
from .session_store.paths import read_session_meta, session_dir
from .state import GameState


def report_path(recording: Path) -> Path:
    return config.DATA.reports / "temporal" / f"{recording.name}.jsonl"


def source_stamp(recording: Path) -> list:
    """Metadata fingerprint of geometry, labels and every reference/target board. Matte changes do
    not invalidate it: live coverage filters the candidates again.
    """
    files = [log_path(recording), meta_path(recording)]
    files += [recording / r["board"] for r in read_log_rows(recording) if r.get("board")]
    entries = [(path.relative_to(recording).as_posix(), path) for path in sorted(set(files))]
    profile = read_session_meta(recording).get("profile")
    if profile:
        path = profile_path(profile)
        entries.append((f"profile:{profile}", path if path.is_file() else None))
    # Gespeichert als `[name, Groesse, mtime_ns]`, fehlend `[name, None, None]`.
    out = []
    for name, path in entries:
        ns, size = (path and version(path)) or (None, None)
        out.append([name, size, ns])
    return out


def scan_session(session_id: str, *, cut: float = config.TEMPORAL_AUDIT_CUT) -> dict:
    from .sensor_audit import audit

    if not math.isfinite(cut) or cut <= 0:
        raise ValueError("temporal cut must be finite and positive")
    recording, _ = session_dir(session_id)
    before = source_stamp(recording)
    rows = list(audit(recording, temporal=True, reference_stock="boards"))
    if source_stamp(recording) != before:
        raise RuntimeError("Session changed during temporal scan; rerun before publishing flags")
    path = report_path(recording)
    path.parent.mkdir(parents=True, exist_ok=True)
    header = {"_schema": 1, "_session_id": session_id, "_cut": cut,
              "_source": before, "_written_at": datetime.now(UTC).isoformat()}
    write_rows(path, [header, *rows])
    flags, _ = load_flags(recording, session_id, read_log_rows(recording), read_matte(recording))
    return {"path": path, "cells": len(rows), "flags": len(flags)}


def candidate_flags(measurements, entries, matte, session_id, cut):
    """Join to current labels; never replace unknown coverage with a measured zero."""
    by_stem = {Path(r["frame"]).stem: r for r in entries}
    squares = set(all_squares())
    found = {}
    for cell in measurements:
        score, raw = cell.get("temporal_normalized"), cell.get("temporal_raw")
        if (score is None or raw is None or not math.isfinite(score) or not math.isfinite(raw)
                or score < cut or raw < 0 or cell.get("reference_stock") != "boards"
                or cell.get("reference_peers", 0) < SETTLE_MIN_FRAMES):
            continue
        stem, square = cell.get("frame"), cell.get("square")
        entry = by_stem.get(stem)
        if entry is None or square not in squares or entry.get("unusable"):
            continue
        if square in set(entry.get("unknown_squares") or ()) | set(entry.get("ambiguous_squares") or ()):
            continue
        coverage = matte.get(stem, {}).get(square)
        if coverage is not None and coverage > PIECE_VISIBLE_MAX:
            continue
        found[(stem, square)] = {
            "session_id": session_id, "frame": stem, "square": square,
            "fen_label": GameState(entry["fen"]).label_for(square), "ply": entry.get("ply"),
            "dev": round(raw, 2), "matte_cov": coverage, "seen": None,
            "reason": "temporal", "temporal_score": round(score, 4),
        }
    return list(found.values())


def load_flags(recording, session_id, entries, matte):
    path = report_path(recording)
    if not path.is_file():
        return [], False
    lines = read_jsonl(path)
    header = lines[0] if lines else {}
    if (header.get("_schema") != 1 or header.get("_session_id") != session_id
            or header.get("_source") != source_stamp(recording)):
        return [], True
    return candidate_flags(lines[1:], entries, matte, session_id, header["_cut"]), False
