"""Welche EXPORTIERTEN Frames eine Hand am Brett tragen — `data/reports/frame-hands.jsonl`, DERIVED
aus `scan.jsonl`: `classify` verliert die Hand-Aussage auf 97 % der `changed`-Frames.
"""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from . import config
from .hand_flags import write_flags
from .session_store.names import LOG_FILE, meta_path

FLAGS_FILE = "frame-hands.jsonl"


def session_hands(entries: list[dict], scan: list[dict], session_id: str) -> list[dict]:
    """Eine Zeile je exportiertem Frame, das der Gate fuer eine Hand haelt; `grid` benennt die
    FELDER.
    """
    from .framescan import occupied

    by_idx = {int(row["idx"]): row for row in scan}
    out = []
    for entry in entries:
        stem = Path(entry["frame"]).stem
        row = by_idx.get(int(stem))
        if row is None or not occupied(row):
            continue
        gate = row.get("gate")
        out.append({
            "session_id": session_id,
            "frame": stem,
            # Ein alter Scan hat kein `gate`; eine erfundene Zahl waere schlimmer als keine.
            "gate": None if gate is None else round(float(gate), 4),
            "grid": sorted(row.get("grid") or ()),
        })
    return out


def unscanned(entries: list[dict], scan: list[dict]) -> int:
    """Exportierte Frames OHNE Scan-Zeile: sonst liest sich ungemessen wie handfrei."""
    seen = {int(row["idx"]) for row in scan}
    return sum(1 for e in entries if int(Path(e["frame"]).stem) not in seen)


def frame_hands() -> dict:
    from .framescan import GATE_THR, SCAN_STRIDE, read_scan
    from .labeling import read_log, read_session_meta
    from .session_store.log import ExportInterrupted

    rows, per_session, scanned, without, interrupted = [], {}, [], [], []
    blind: dict[str, int] = {}
    for path in sorted(config.DATA.recordings.glob(f"*/{LOG_FILE}")):
        session_dir = path.parent
        if not meta_path(session_dir).is_file():
            continue
        session_id = read_session_meta(session_dir)["session_id"]
        scan = read_scan(session_dir.name)
        if not scan:
            without.append(session_dir.name)
            continue
        try:
            entries = read_log(session_dir)
        except ExportInterrupted:
            interrupted.append(session_dir.name)
            continue
        scanned.append(session_id)
        if (blind_here := unscanned(entries, scan)):
            blind[session_dir.name] = blind_here
        found = session_hands(entries, scan, session_id)
        rows.extend(found)
        if found:
            per_session[session_dir.name] = len(found)
    # `_sessions` traegt die GEMESSENEN: nur dort heisst eine fehlende Zeile "keine Hand".
    header = {"_gate_thr": GATE_THR, "_stride": SCAN_STRIDE, "_sessions": sorted(scanned),
              "_unscanned": dict(sorted(blind.items())), "_export_interrupted": interrupted,
              "_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": out, "frames": len(rows), "sessions": len(scanned),
            "per_session": per_session, "without_scan": without,
            "unscanned_frames": dict(sorted(blind.items())), "export_interrupted": interrupted}
