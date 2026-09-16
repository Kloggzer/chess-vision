"""Wie viel liegt schon falsch auf der Platte? Zaehlt, repariert NICHTS.

Drei Funde vom 2026-09-16 aendern nur KUENFTIGE Laeufe. Was unter der alten Regel entstand, bleibt
— dieses Skript sagt, wie viel das ist, damit die Neuberechnung eine Entscheidung wird und keine
Vermutung. Nur-lesend, ruehrt `data/` nicht an.

    uv run python scripts/audit_disk_damage.py
"""
from __future__ import annotations

import json
from pathlib import Path

from chesslab import config


def _rows(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    out = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.strip():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
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
    """Der ECHTE Nachweis: rechnet die `coverage` aus dem Alpha auf der Platte neu.

    Ein halb angewendeter `close_seams` hinterliess geschlossene Pixel bei ALTER `coverage` und
    keinerlei Spur — erkennbar ist er nur daran, dass die gespeicherte Zahl nicht zu den Pixeln
    passt. Teuer, deshalb je Aufnahme nur `sample` Zeilen.
    """
    import cv2
    import numpy as np

    from chesslab.calibration import load_profile
    from chesslab.labeling import read_log, read_session_meta, usable_board
    from chesslab.matte import coverage_of

    out = []
    for session in sorted(config.DATA.recordings.glob("*/")):
        # `is not None`: eine geleerte Matte ist gemessen, SAMs Absage nicht.
        rows = [r for r in _rows(session / "matte.jsonl")
                if r.get("coverage") is not None and r.get("alpha") != "fixed"]
        if not rows:
            continue
        try:
            profile = load_profile(read_session_meta(session)["profile"])
        except (KeyError, FileNotFoundError, ValueError):
            continue
        entries = {Path(e["board"]).stem: e for e in read_log(session) if e.get("board")}
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
                # RICHTUNG ist der Beweis: geschlossene Naehte ADDIEREN weisse Pixel, die frische
                # Coverage muesste also hoeher liegen. Gemischte Vorzeichen sind Geometrie-Drift
                # (ein Re-Export mit neuen Ecken), nicht der halb angewendete Lauf.
                up += sum(d > 0 for d in deltas)
                down += sum(d < 0 for d in deltas)
        if off:
            out.append({"session": session.name, "rows_checked": checked, "disagree": off,
                        "cells_up": up, "cells_down": down})
    return out


def black_frames_in_plates() -> list[dict]:
    """Platten, in deren Median ein SCHWARZES Bild gelandet sein kann (`occluders.py:81`).

    Die Zeilen sagen es nicht direkt; was zaehlbar ist, sind Aufnahmen mit einer Platte UND
    mindestens einem Frame, den der Dekoder nicht lesen konnte.
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
    """`session_writer` verwarf den `imwrite`-Rueckgabewert — eine Log-Zeile auf eine Datei,
    die nie geschrieben wurde. Genau das ist hier zaehlbar."""
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


if __name__ == "__main__":
    main()
