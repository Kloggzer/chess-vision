"""Wie viel liegt schon falsch auf der Platte? Zaehlt, repariert NICHTS, ruehrt `data/` nicht an.

    uv run python scripts/audit_disk_damage.py
"""
from __future__ import annotations

import json
from pathlib import Path

from chesslab import config

#: Kaputte Zeilen, die KEINE halbe letzte sind — je Datei. Der Schadensbericht liest sie selbst.
BROKEN_LINES: dict[str, int] = {}

#: Aufnahmen, deren Stichprobe KEINE einzige Zeile pruefen konnte — nicht sauber, sondern blind.
UNMEASURED: dict[str, str] = {}


def _rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    # Nur die halbe LETZTE Zeile ist erwartbar; eine kaputte MITTENDRIN ist der Schaden, den das
    # hier zaehlt.
    out, broken = [], 0
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    open_tail = bool(text) and not text.endswith("\n")
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            if not (open_tail and i == len(lines) - 1):
                broken += 1
    if broken:
        BROKEN_LINES[str(path)] = broken
    return out


def close_seams_half_applied() -> list[dict]:
    """Uebrige `.tmp.webp` — nur VORWAERTS gueltig: die gibt es erst seit dem Fix."""
    out = []
    for session in sorted(config.DATA.recordings.glob("*/")):
        leftovers = list((session / "mattes").glob("*.tmp.webp")) if (session / "mattes").is_dir() else []
        if leftovers:
            out.append({"session": session.name, "stale_temps": len(leftovers)})
    return out


def coverage_disagrees_with_its_alpha(sample: int = 12) -> list[dict]:
    """Der ECHTE Nachweis: die `coverage` aus dem Alpha neu rechnen — ein halb angewendeter
    `close_seams` hinterliess keine andere Spur. Teuer, also je Aufnahme nur `sample` Zeilen.
    """
    import cv2
    import numpy as np

    from chesslab.calibration import load_profile
    from chesslab.labeling import read_session_meta, usable_board
    from chesslab.matte import coverage_of
    from chesslab.session_store.log import read_log_rows

    out = []
    for session in sorted(config.DATA.recordings.glob("*/")):
        # Die JUENGSTE Zeile je Frame: das Alpha auf der Platte gehoert nur zu ihr. SAMs Absage
        # faellt raus.
        latest: dict[str, dict] = {}
        for r in _rows(session / "matte.jsonl"):
            latest.pop(r.get("frame"), None)
            if r.get("coverage") is not None:
                latest[r.get("frame")] = r
        rows = [r for r in latest.values() if r.get("alpha") != "fixed"]
        if not rows:
            continue
        try:
            profile = load_profile(read_session_meta(session)["profile"])
        except (KeyError, FileNotFoundError, ValueError):
            continue
        entries = {Path(e["board"]).stem: e for e in read_log_rows(session) if e.get("board")}
        off = checked = up = down = 0
        for row in rows[:: max(1, len(rows) // sample)][:sample]:
            alpha_path = session / "mattes" / f"{row['frame']}.webp"
            entry = entries.get(row["frame"])
            if entry is None or not alpha_path.is_file() or not usable_board(entry, profile):
                continue
            image = cv2.imread(str(alpha_path), cv2.IMREAD_GRAYSCALE)
            if image is None:
                continue
            checked += 1
            fresh = coverage_of(image.astype(np.float32) / 255.0, entry, profile)
            stored = row["coverage"]
            deltas = [fresh.get(sq, 0.0) - v for sq, v in stored.items()
                      if abs(fresh.get(sq, 0.0) - v) > 0.01]
            if deltas:
                off += 1
                # RICHTUNG ist der Beweis: geschlossene Naehte ADDIEREN weisse Pixel. Gemischte
                # Vorzeichen sind Geometrie-Drift.
                up += sum(d > 0 for d in deltas)
                down += sum(d < 0 for d in deltas)
        if not checked:
            # 0 von 0 ist kein Befund.
            UNMEASURED[session.name] = f"0 von {len(rows)} Zeilen pruefbar"
        elif off:
            out.append({"session": session.name, "rows_checked": checked, "disagree": off,
                        "cells_up": up, "cells_down": down})
    return out


def black_frames_in_plates() -> list[dict]:
    """Platten, in deren Median ein SCHWARZES Bild gelandet sein kann: Aufnahmen mit Platte UND
    einem unlesbaren Frame.
    """
    out = []
    for session in sorted(config.DATA.recordings.glob("*/")):
        plate = session / "plate.webp"
        if not plate.is_file():
            continue
        rows = _rows(session / "log.jsonl")
        missing = sum(1 for r in rows if r.get("board") and not (session / r["board"]).is_file())
        if missing:
            out.append({"session": session.name, "boards_missing": missing, "rows": len(rows)})
    return out


def log_rows_without_their_file() -> list[dict]:
    """Log-Zeilen auf eine Datei, die nie geschrieben wurde (`imwrite` gibt False zurueck, statt zu
    werfen).
    """
    out = []
    for session in sorted(config.DATA.recordings.glob("*/")):
        rows = _rows(session / "log.jsonl")
        ghosts = [r for r in rows if r.get("board") and not (session / r["board"]).is_file()]
        if ghosts:
            out.append({"session": session.name, "ghost_rows": len(ghosts), "rows": len(rows),
                        "first": ghosts[0].get("frame")})
    return out


def main() -> None:
    checks = [
        ("close_seams halb angewendet (uebrige .tmp.webp, nur vorwaerts)", close_seams_half_applied()),
        ("gespeicherte coverage passt nicht zum Alpha (Stichprobe)", coverage_disagrees_with_its_alpha()),
        ("Platte mit fehlenden Brettern (schwarzes Bild im Median moeglich)", black_frames_in_plates()),
        ("Log-Zeilen ohne ihre Brett-Datei", log_rows_without_their_file()),
    ]
    for title, found in checks:
        print(f"\n== {title} ==")
        if not found:
            print("  nichts gefunden")
            continue
        for row in found:
            print("  " + ", ".join(f"{k}={v}" for k, v in row.items()))
        print(f"  -> {len(found)} Aufnahmen betroffen")
    print("\n== Aufnahmen ohne eine einzige pruefbare Coverage-Zeile (blind, nicht sauber) ==")
    for name, why in sorted(UNMEASURED.items()):
        print(f"  {name}: {why}")
    print(f"  -> {len(UNMEASURED)} Aufnahmen nicht gemessen")
    print("\n== kaputte JSONL-Zeilen, die nicht die letzte waren ==")
    for path, n in sorted(BROKEN_LINES.items()):
        print(f"  {path}: {n}")
    print(f"  -> {sum(BROKEN_LINES.values())} Zeilen in {len(BROKEN_LINES)} Dateien")


if __name__ == "__main__":
    main()
