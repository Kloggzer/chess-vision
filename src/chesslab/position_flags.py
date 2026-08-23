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


def position_flags() -> dict:
    """Über jede Session mit einer Matte. -> Zusammenfassung und Pfad."""
    rows, per_session = [], {}
    for path in sorted(config.DATA.recordings.glob("*/matte.jsonl")):
        session_dir = path.parent
        session_id = read_session_meta(session_dir)["session_id"]
        matte = read_matte(session_dir)
        found = [flag for entry in read_log(session_dir)
                 for flag in frame_flags(entry, matte.get(Path(entry["frame"]).stem, {}), session_id)]
        rows.extend(found)
        if found:
            per_session[session_dir.name] = len(found)
    header = {"_settle_limit": SETTLE_LIMIT, "_seen_min": SETTLE_SEEN_MIN,
              "_visible_max": MATTE_DIRTY, "_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": out, "flags": len(rows),
            "frames": len({(r["session_id"], r["frame"]) for r in rows}),
            "per_session": per_session}


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
