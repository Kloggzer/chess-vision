"""`chesslab capture import`: ein Erfassungs-Buendel wird zu Brettern, ohne Kandidat — das FEN steht
im Buendel-Log (`plan/04-capture/01-import.md`).
"""

from __future__ import annotations

import json
import math
from bisect import bisect_left
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path
from typing import Any

import cv2

from .ioutil import read_jsonl, write_rows
from .realgames import boards as rg_boards
from .recording import Recording
from .session_store import log as store_log
from .session_store import recording as store_rec
from .session_store.names import META_FILE, log_path, meta_path

#: Was eine Buendel-Zeile mitnimmt. `move_san` bleibt draussen: eine Erfassung hat keine Zuege.
CARRIED = ("ply", "fen", "corners", "ts")
NS_PER_S = 1_000_000_000
#: Darueber ist der Container-Wert kaputt, nicht schnell; `1e9 * fps` rundet an der Frame-Grenze mal
#: auf, mal ab, deshalb die Toleranz vor dem Aufrunden.
MAX_FPS, INDEX_EPS = 240.0, 1e-6


def container_fps(video: Path) -> float:
    """`CAP_PROP_FPS` des Containers — GELESEN, nie angenommen: die Aufnahmen laufen mit 28,63 und
    15, nicht 30, und ein geratener Wert verschiebt jeden Index lautlos.
    """
    cap = cv2.VideoCapture(str(video))
    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS))
    finally:
        cap.release()
    if not math.isfinite(fps) or not 0.0 < fps <= MAX_FPS:
        raise ValueError(f"{video}: unglaubwuerdige Bildrate {fps!r} — Abbruch statt 30,0 zu raten")
    return fps


def video_syncs(bundle: Path) -> list[tuple[int, int]]:
    """`(elapsedNs, durationNs)` je `video_sync`-Zeile — die Bruecke Geraeteuhr -> Videozeit."""
    path = bundle / "timeline.jsonl"
    if not path.is_file():
        raise FileNotFoundError(f"{path} fehlt — ohne sie ist `elapsed_ns` keine Videozeit")
    # Das Telefon STROEMT in `timeline.jsonl`; eine abgebrochene Aufnahme hinterlaesst eine halbe
    # letzte Zeile, die `read_jsonl` verwirft.
    out = [(int(row["elapsedNs"]), int(row["durationNs"])) for row in read_jsonl(path)
           if row.get("kind") == "video_sync" and row.get("durationNs") is not None]
    if not out:
        raise ValueError(f"{path}: keine `video_sync`-Zeile — die Geraeteuhr hat keinen Anker")
    return sorted(out)


def video_ns_at(elapsed_ns: int, syncs: list[tuple[int, int]]) -> float:
    """Naechster Anker plus verstrichene Systemzeit, Steigung 1 — `RecordedFrames.videoNsAt`.

    NICHT zwischen Ankern interpoliert: Callback-Jitter gab Steigung 2,36 und -8,5 s Vorlauf.
    """
    after = bisect_left([s[0] for s in syncs], elapsed_ns)
    if after >= len(syncs):
        anchor = syncs[-1]
    elif after == 0:
        anchor = syncs[0]
    else:
        anchor = min(syncs[after - 1], syncs[after], key=lambda s: abs(s[0] - elapsed_ns))
    return anchor[1] + float(elapsed_ns - anchor[0])


def capture_steps(bundle: Path) -> dict[int, tuple[int, int | None]]:
    """`{ply: (Beginn, Ende)}` der Geraeteuhr aus `capture.json`; fehlt ein Ende, gilt der naechste
    Beginn.
    """
    path = bundle / "capture.json"
    if not path.is_file():
        raise FileNotFoundError(
            f"{path} fehlt — ohne sie ist das Buendel keine Erfassung "
            f"(Form: docs/capture-session.schema.json)")
    steps = json.loads(path.read_text(encoding="utf-8")).get("steps") or []
    for i, step in enumerate(steps):
        if step.get("elapsed_ns") is None or step.get("ply") is None:
            raise ValueError(f"{path}: Schritt {i} traegt kein `elapsed_ns` — Abbruch statt "
                             f"Bretter unter geratenen Namen")
    ordered = sorted(steps, key=lambda s: int(s["elapsed_ns"]))
    if not ordered:
        raise ValueError(f"{path}: kein Schritt, also kein Frame zu holen")
    out: dict[int, tuple[int, int | None]] = {}
    for i, step in enumerate(ordered):
        end = step.get("elapsed_ns_end")
        nxt = int(ordered[i + 1]["elapsed_ns"]) if i + 1 < len(ordered) else None
        out[int(step["ply"])] = (int(step["elapsed_ns"]), int(end) if end is not None else nxt)
    return out


def frame_range(window: tuple[int, int | None], syncs, fps: float) -> range:
    """Die Frames in `[Beginn, Ende)`, mindestens einer — ein Drehschritt steht still."""
    def index_at(elapsed_ns: int) -> int:
        return max(0, math.ceil(video_ns_at(elapsed_ns, syncs) * fps / NS_PER_S - INDEX_EPS))

    start, end = window
    lo = index_at(start)
    hi = lo + 1 if end is None else index_at(end)
    return range(lo, max(lo + 1, hi))


def capture_rows(bundle: Path, steps, syncs, fps: float) -> list[dict]:
    """Je Frame im Fenster eines Schritts eine Zeile, benannt nach dem GERECHNETEN Video-Index."""
    rows = []
    for src in store_rec.stored_rows(bundle):
        window = steps.get(int(src["ply"]))
        if window is None:
            raise ValueError(f"{bundle}: Ply {src['ply']} steht im Log, aber in keinem Schritt")
        rows += [{"frame": f"frames/{idx:06d}.png",
                  **{k: src[k] for k in CARRIED if k in src}}
                 for idx in frame_range(window, syncs, fps)]
    rows.sort(key=lambda r: r["frame"])
    if len({r["frame"] for r in rows}) != len(rows):
        raise ValueError(f"{bundle}: zwei Schritte teilen sich einen Video-Index")
    return rows


def video_frames(video: Path, rows: list[dict]) -> Iterator[tuple[dict, Any]]:
    """(Zeile, Bild) je Zeile — der Index kommt aus dem Strom, nie aus der Position darin."""
    wanted = {int(Path(r["frame"]).stem): r for r in rows}
    rec = Recording(video)
    with closing(rec.frames(rec.segment_base(min(wanted)), wanted=set(wanted))) as stream:
        for idx, frame in stream:
            yield wanted[idx], frame


def write_capture_meta(session_dir: Path, bundle: Path, name: str, profile: str, prof) -> Path:
    """`session.yaml` neben dem Log. Ohne sie ueberspringen `position_flags`/`frame_hands` das
    Verzeichnis WORTLOS.
    """
    import yaml

    src = bundle / META_FILE
    carried = yaml.safe_load(src.read_text(encoding="utf-8")) if src.is_file() else None
    meta = {**(carried or {}),
            "session_id": f"rg-{session_dir.name}",
            "profile": profile,
            "mode": "capture",
            "frame_size": [int(v) for v in prof.frame_size],
            "notes": f"imported from data/recordings/{name}/{bundle.name} (plan/04-capture)"}
    session_dir.mkdir(parents=True, exist_ok=True)
    with meta_path(session_dir).open("w", encoding="utf-8") as fh:
        yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)
    return meta_path(session_dir)


def write_log(session_dir: Path, rows: list[dict]) -> Path:
    path = log_path(session_dir)
    write_rows(path, rows)
    return path


def import_capture(name: str, profile: str = store_log.EXPORT_PROFILE) -> dict:
    """Ein Buendel mit `capture.json` wird zu Brettern und dem `log.jsonl`, das `slice` liest."""
    from .calibration import load_profile

    dirs = store_rec.stored_session_dirs(name)
    if len(dirs) != 1:
        raise ValueError(f"{name}: genau ein Buendel erwartet, gefunden {[str(d) for d in dirs]}")
    bundle = dirs[0]
    video = store_rec.video_path(name)
    fps = container_fps(video)
    rows = capture_rows(bundle, capture_steps(bundle), video_syncs(bundle), fps)
    session_dir = store_rec.game_dir(name)
    prof = load_profile(profile)
    # Das ArUco-Quad des Telefons ist grob, und ohne die `grid_lines` des Fits findet
    # `meshes_for_boards` nichts.
    fit = rg_boards.fit_rows_to_grid(rows, prof, frames=video_frames(video, rows))
    rows = fit["arrived"]
    made = rg_boards.rewarp_boards(session_dir, rows, prof, frames=video_frames(video, rows))
    # Hinter dem Ende einer abgeschnittenen Aufnahme gibt der Dekoder kein Bild mehr her.
    rows = [r for r in rows if r.get("board")]
    write_capture_meta(session_dir, bundle, name, profile, prof)
    # Im Log koennen handgesetzte Quads und Urteile stehen; ein Re-Import ueberschreibt sie nie ohne
    # Kopie.
    from .session_store.log import backup_log

    if log_path(session_dir).is_file():
        backup_log(log_path(session_dir))
    write_log(session_dir, rows)
    return {"session_dir": session_dir, "bundle": bundle, "rows": rows,
            "fps": fps, "fit": fit, **made}
