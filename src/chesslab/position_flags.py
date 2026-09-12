"""Zellen, deren Bild von der Stellung abweicht, für die ihr Intervall bürgt —
`data/reports/position-flags.jsonl`. DERIVED, jeder Lauf schreibt sie ganz neu.

Der Mensch benennt dort die Figur, die wirklich dasteht. Zahlen: `realgames.settle_for_ply`.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from . import config
from .hand_flags import write_flags
from .labeling import (
    MATTE_DIRTY,
    SETTLE_LIMIT,
    SETTLE_SEEN_MIN,
    all_squares,
    read_log,
    read_matte,
    read_session_meta,
)
from .realgames import INTERVAL_FILE
from .state import GameState

FLAGS_FILE = "position-flags.jsonl"
INTERVAL_REPORT = "interval-check.jsonl"

#: Frames je Seite einer Ply-Grenze, auf denen der Zug-Zeitpunkt nicht gesichert ist. Drei, weil
#: der Commit hoechstens um wenige Frames wandert; grosszuegiger flutet es die Lane.
TIMING_WINDOW = 3


def frame_flags(entry: dict, coverage: dict[str, float], session_id: str) -> list[dict]:
    """Die strittigen Zellen EINES Frames — die, die das Intervall als verlassen gemeldet hat.

    Kein eigenes Urteil: `settle_left` steht schon in der Zeile, samt Zeitachse. Diese Datei
    entscheidet nur noch, WIE die Karte heißt.
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
        i = index[square]
        short = i < len(seen) and seen[i] < SETTLE_SEEN_MIN
        out.append({"session_id": session_id, "frame": stem, "square": square,
                    "fen_label": labels.label_for(square), "ply": entry.get("ply"),
                    "dev": round(float(dev[i]), 2) if i < len(dev) else None,
                    "cov": round(float(coverage.get(square, 0.0)), 4),
                    "seen": round(float(seen[i]), 3) if i < len(seen) else None,
                    "reason": "unreadable" if short else "changed"})
    return out


def timing_flags(entries: list[dict], intervals: list[dict],
                 matte: dict[str, dict[str, float]], session_id: str,
                 window: int = TIMING_WINDOW) -> list[dict]:
    """Die BEWEGTEN Felder rund um jede Ply-Grenze — dort entscheidet der Zeitpunkt das Label.

    Ein Handframe hat 50+ einwandfreie Felder, die sind kein Verdacht. Verdacht sind die zwei bis
    vier Felder des Zuges: einen Frame zu frueh oder zu spaet festgeschrieben, tragen genau die
    das falsche FEN."""
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
                # Was die Coverage ohnehin maskiert, lernt der Klassenkopf nicht - kein Kaertchen.
                cov = float(matte.get(stem, {}).get(square, 0.0))
                if cov > MATTE_DIRTY:
                    continue
                out.append({"session_id": session_id, "frame": stem, "square": square,
                            "fen_label": labels.label_for(square), "ply": entry.get("ply"),
                            "dev": round(dev, 2), "cov": round(cov, 4),
                            "seen": bool(row.get("seen")), "moved_ply": ply,
                            "reason": "timing"})
    return out


def position_flags() -> dict:
    """Über jede Session mit einer Matte. -> Zusammenfassung und Pfad."""
    from .temporal_flags import load_flags

    rows, per_session, stale_temporal = [], {}, []
    for path in sorted(config.DATA.recordings.glob("*/log.jsonl")):
        session_dir = path.parent
        if not (session_dir / "session.yaml").is_file():
            continue
        session_id = read_session_meta(session_dir)["session_id"]
        matte = read_matte(session_dir)
        entries = read_log(session_dir)
        # Settle cards need a matte: without one `cov` 0.0 would claim a clear cell.
        found = [flag for entry in entries
                 for flag in frame_flags(entry, matte.get(Path(entry["frame"]).stem, {}), session_id)
                 ] if (session_dir / "matte.jsonl").is_file() else []
        intervals = [json.loads(line) for line in
                     (session_dir / INTERVAL_FILE).read_text(encoding="utf-8").splitlines()
                     if line.strip()] if (session_dir / INTERVAL_FILE).is_file() else []
        timing = timing_flags(entries, intervals, matte, session_id)
        temporal, stale = load_flags(session_dir, session_id, entries, matte)
        if stale:
            stale_temporal.append(session_id)
        # Eine Karte je Zelle, schwaechste Diagnose zuerst: `timing` vermutet nur, `temporal` hat
        # gemessen, `changed` hat gegen das gesetzte Brett gemessen. Der Anomaliewert ueberlebt,
        # auch wenn die staerkere Quelle die Karte benennt.
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
              "_visible_max": MATTE_DIRTY, "_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": out, "flags": len(rows),
            "frames": len({(r["session_id"], r["frame"]) for r in rows}),
            "per_session": per_session, "stale_temporal": stale_temporal}


def interval_flags() -> dict:
    """Die Ply-Prüfungen aller Sessions in einem Report — je Ply: war der Zug überhaupt zu sehen?"""
    rows = []
    for path in sorted(config.DATA.recordings.glob(f"*/{INTERVAL_FILE}")):
        session_id = read_session_meta(path.parent)["session_id"]
        rows += [{"session_id": session_id, **json.loads(line)}
                 for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    header = {"_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / INTERVAL_REPORT, rows, header)
    return {"path": out, "plies": len(rows), "unseen": sum(1 for r in rows if not r["seen"])}
