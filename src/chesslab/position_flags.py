"""Zellen, deren Bild von der Stellung abweicht, fuer die ihr Intervall buergt —
`data/reports/position-flags.jsonl`. DERIVED, jeder Lauf schreibt sie ganz neu.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from . import config
from .hand_flags import write_flags
from .ioutil import read_jsonl
from .labeling import (
    MATTE_DIRTY,
    SETTLE_LIMIT,
    SETTLE_SEEN_MIN,
    all_squares,
    read_matte,
    read_session_meta,
)
from .session_store.log import ExportInterrupted, read_log_rows
from .session_store.names import INTERVAL_FILE, LOG_FILE, interval_path, matte_path, meta_path
from .state import GameState

FLAGS_FILE = "position-flags.jsonl"
INTERVAL_REPORT = INTERVAL_FILE

#: Frames je Seite einer Ply-Grenze mit ungesichertem Zug-Zeitpunkt; grosszuegiger flutet die Lane.
TIMING_WINDOW = 3


def frame_flags(entry: dict, coverage: dict[str, float] | None, session_id: str) -> list[dict]:
    """Die strittigen Zellen EINES Frames: die, die das Intervall als verlassen gemeldet hat
    (`settle_left`).
    """
    dev, seen = entry.get("settle_dev") or (), entry.get("settle_seen") or ()
    left = [sq for sq in (entry.get("settle_left") or ()) if sq not in (
        set(entry.get("unknown_squares") or ()) | set(entry.get("ambiguous_squares") or ()))]
    if not left or entry.get("unusable"):
        return []
    index = {sq: i for i, sq in enumerate(all_squares())}
    labels = GameState(entry["fen"])
    stem = Path(entry["frame"]).stem
    out = []
    for square in left:
        cov = coverage.get(square) if coverage is not None else None
        # Verdeckt heisst kein Kaertchen; ein Re-Matten kann Zellen ueber die Schwelle heben. `None`
        # ist UNGEMESSEN und bleibt eine Karte.
        if cov is not None and float(cov) > MATTE_DIRTY:
            continue
        i = index[square]
        short = i < len(seen) and seen[i] < SETTLE_SEEN_MIN
        out.append({"session_id": session_id, "frame": stem, "square": square,
                    "fen_label": labels.label_for(square), "ply": entry.get("ply"),
                    "dev": round(float(dev[i]), 2) if i < len(dev) else None,
                    "matte_cov": round(float(cov), 4) if cov is not None else None,
                    "seen": round(float(seen[i]), 3) if i < len(seen) else None,
                    "reason": "unreadable" if short else "changed"})
    return out


def timing_flags(entries: list[dict], intervals: list[dict],
                 matte: dict[str, dict[str, float]], session_id: str,
                 window: int = TIMING_WINDOW) -> list[dict]:
    """Die BEWEGTEN Felder rund um jede Ply-Grenze: einen Frame zu frueh oder zu spaet
    festgeschrieben, tragen genau die zwei bis vier Felder des Zuges das falsche FEN.
    """
    frames_of: dict[int, list[dict]] = {}
    for entry in entries:
        if not entry.get("unusable"):
            frames_of.setdefault(int(entry.get("ply") or 0), []).append(entry)
    for rows in frames_of.values():
        rows.sort(key=lambda e: Path(str(e["frame"])).stem)

    out = []
    for row in intervals:
        moved = [str(sq) for sq in (row.get("moved") or ())]
        if not moved:
            continue
        ply = int(row["ply"])
        dev = float(row.get("dev") or 0.0)
        near = frames_of.get(ply - 1, [])[-window:] + frames_of.get(ply, [])[:window]
        for entry in near:
            stem = Path(str(entry["frame"])).stem
            labels = GameState(entry["fen"])
            for square in moved:
                # Was die Coverage maskiert, lernt der Klassenkopf nicht. `None` heisst UNGEMESSEN,
                # nicht "frei".
                seen_cov = matte.get(stem, {}).get(square)
                if seen_cov is not None and float(seen_cov) > MATTE_DIRTY:
                    continue
                out.append({"session_id": session_id, "frame": stem, "square": square,
                            "fen_label": labels.label_for(square), "ply": entry.get("ply"),
                            "dev": round(dev, 2),
                            "matte_cov": None if seen_cov is None else round(float(seen_cov), 4),
                            "seen": bool(row.get("seen")),
                            "reason": "timing"})
    return out


def position_flags() -> dict:
    from .temporal_flags import load_flags

    rows, per_session, stale_temporal, unmeasured, interrupted = [], {}, [], [], []
    for path in sorted(config.DATA.recordings.glob(f"*/{LOG_FILE}")):
        session_dir = path.parent
        if not meta_path(session_dir).is_file():
            continue
        session_id = read_session_meta(session_dir)["session_id"]
        matte = read_matte(session_dir)
        try:
            entries = read_log_rows(session_dir)
        except ExportInterrupted:
            interrupted.append(session_id)
            continue
        # Ohne `settle_dev` saehen null Flags aus wie "nichts strittig" statt "`settle-scan` lief
        # nie".
        if not any("settle_dev" in entry for entry in entries):
            unmeasured.append(session_id)
        found = [flag for entry in entries
                 for flag in frame_flags(entry, matte.get(Path(entry["frame"]).stem), session_id)
                 ] if matte_path(session_dir).is_file() else []
        intervals = read_jsonl(interval_path(session_dir))
        timing = timing_flags(entries, intervals, matte, session_id)
        temporal, stale = load_flags(session_dir, session_id, entries, matte)
        if stale:
            stale_temporal.append(session_id)
        temporal_keys = {(flag["frame"], flag["square"]) for flag in temporal}
        found = [flag for flag in found if flag["matte_cov"] is not None
                 or (flag["frame"], flag["square"]) in temporal_keys]
        # Eine Karte je Zelle, schwaechste Diagnose zuerst (`timing` < `temporal` < `changed`); der
        # Anomaliewert ueberlebt.
        combined: dict[tuple[str, str], dict] = {}
        for flag in [*timing, *temporal, *found]:
            key = (flag["frame"], flag["square"])
            earlier = combined.get(key, {})
            combined[key] = {**earlier, **flag}
            if flag.get("dev") is None and earlier.get("dev") is not None:
                combined[key]["dev"] = earlier["dev"]
        found = list(combined.values())
        rows.extend(found)
        if found:
            per_session[session_dir.name] = len(found)
    header = {"_settle_limit": SETTLE_LIMIT, "_seen_min": SETTLE_SEEN_MIN,
              "_visible_max": MATTE_DIRTY, "_unmeasured": unmeasured,
              "_export_interrupted": interrupted,
              "_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": out, "flags": len(rows),
            "frames": len({(r["session_id"], r["frame"]) for r in rows}),
            "per_session": per_session, "stale_temporal": stale_temporal,
            "unmeasured": unmeasured, "export_interrupted": interrupted}


def interval_flags() -> dict:
    """Die Ply-Prüfungen aller Sessions in einem Report — je Ply: war der Zug überhaupt zu sehen?"""
    rows = []
    for path in sorted(config.DATA.recordings.glob(f"*/{INTERVAL_FILE}")):
        session_id = read_session_meta(path.parent)["session_id"]
        rows += [{"session_id": session_id, **r} for r in read_jsonl(path)]
    header = {"_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / INTERVAL_REPORT, rows, header)
    return {"path": out, "plies": len(rows), "unseen": sum(1 for r in rows if not r["seen"])}
