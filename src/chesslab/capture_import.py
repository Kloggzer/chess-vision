"""`chesslab capture import`: ein Erfassungs-Buendel wird zu Brettern, ohne Kandidat.

`export-session` verlangt eine bestaetigte Zugfolge, nur um je Frame das gueltige FEN zu finden —
bei einer gezielten Erfassung steht es im Buendel-Log (`plan/04-capture/01-import.md`).
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path
from typing import Any

from . import realgames
from .recording import Recording

#: Was eine Buendel-Zeile mitnimmt. `move_san` bleibt draussen: eine Erfassung hat keine Zuege.
CARRIED = ("ply", "fen", "corners", "ts")


def capture_steps(bundle: Path) -> dict[int, int]:
    """`{ply: video_frame}` aus `capture.json` — der Video-Index wird GELESEN, nie hergeleitet.

    Ohne die Datei ist nicht belegt, dass das Buendel eine Erfassung ist. Ohne `video_frame` truege
    ein Brett den Namen eines Frames, den es nicht zeigt, und alles danach saehe korrekt aus.
    """
    path = bundle / "capture.json"
    if not path.is_file():
        raise FileNotFoundError(
            f"{path} fehlt — ohne sie ist das Buendel keine Erfassung "
            f"(Form: docs/capture-session.schema.json)")
    steps = json.loads(path.read_text(encoding="utf-8")).get("steps") or []
    out: dict[int, int] = {}
    for i, step in enumerate(steps):
        if step.get("video_frame") is None or step.get("ply") is None:
            raise ValueError(f"{path}: Schritt {i} traegt kein `video_frame` — Abbruch statt "
                             f"Bretter unter geratenen Namen")
        out[int(step["ply"])] = int(step["video_frame"])
    if not out:
        raise ValueError(f"{path}: kein Schritt, also kein Frame zu holen")
    return out


def capture_rows(bundle: Path, steps: dict[int, int]) -> list[dict]:
    """Die Buendel-Zeilen unter ihrem VIDEO-Index, benannt wie der Export (`frames/{idx:06d}.png`)."""
    rows = []
    for src in realgames.stored_rows(bundle):
        idx = steps.get(int(src["ply"]))
        if idx is None:
            raise ValueError(f"{bundle}: Ply {src['ply']} steht im Log, aber in keinem Schritt")
        rows.append({"frame": f"frames/{idx:06d}.png",
                     **{k: src[k] for k in CARRIED if k in src}})
    rows.sort(key=lambda r: r["frame"])
    if len({r["frame"] for r in rows}) != len(rows):
        raise ValueError(f"{bundle}: zwei Zeilen teilen sich einen Video-Index")
    return rows


def video_frames(video: Path, rows: list[dict]) -> Iterator[tuple[dict, Any]]:
    """(Zeile, Bild) je Zeile — der Index kommt aus dem Strom, nie aus der Position darin."""
    wanted = {int(Path(r["frame"]).stem): r for r in rows}
    rec = Recording(video)
    with closing(rec.frames(rec.segment_base(min(wanted)), wanted=set(wanted))) as stream:
        for idx, frame in stream:
            yield wanted[idx], frame


def import_capture(name: str, profile: str = realgames.EXPORT_PROFILE) -> dict:
    """Ein Buendel mit `capture.json` wird zu Brettern und dem `log.jsonl`, das `slice` liest."""
    from .calibration import load_profile

    dirs = realgames.stored_session_dirs(name)
    if len(dirs) != 1:
        raise ValueError(f"{name}: genau ein Buendel erwartet, gefunden {[str(d) for d in dirs]}")
    bundle = dirs[0]
    rows = capture_rows(bundle, capture_steps(bundle))
    session_dir = realgames.game_dir(name)
    made = realgames.rewarp_boards(session_dir, rows, load_profile(profile),
                                   frames=video_frames(realgames.video_path(name), rows))
    # Eine Zeile ohne Brett benennt eine Datei, die nie geschrieben wurde — hinter dem Ende einer
    # abgeschnittenen Aufnahme gibt der Dekoder kein Bild mehr her.
    rows = [r for r in rows if r.get("board")]
    with (session_dir / "log.jsonl").open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"session_dir": session_dir, "bundle": bundle, "rows": rows, **made}
