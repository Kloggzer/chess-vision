"""`chesslab capture import`: ein Erfassungs-Buendel wird zu Brettern, ohne Kandidat.

`export-session` verlangt eine bestaetigte Zugfolge, nur um je Frame das gueltige FEN zu finden —
bei einer gezielten Erfassung steht es im Buendel-Log (`plan/04-capture/01-import.md`).
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

from . import realgames
from .recording import Recording

#: Was eine Buendel-Zeile mitnimmt. `move_san` bleibt draussen: eine Erfassung hat keine Zuege.
CARRIED = ("ply", "fen", "corners", "ts")
NS_PER_S = 1_000_000_000
#: Darueber ist der Container-Wert kaputt, nicht schnell — und `1e9 * fps` rundet auf der
#: Frame-Grenze mal nach oben, mal nach unten, deshalb die Toleranz vor dem Aufrunden.
MAX_FPS, INDEX_EPS = 240.0, 1e-6


def container_fps(video: Path) -> float:
    """`CAP_PROP_FPS` des Containers — GELESEN, nie angenommen.

    `realgames.video_fps` faellt ohne Kandidaten auf 30,0 zurueck; die vorhandenen Aufnahmen laufen
    mit 28,63 und die Erfassung mit 15. Ein geratener Wert verschiebt jeden Index lautlos.
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
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        row = json.loads(line) if line.strip() else {}
        if row.get("kind") == "video_sync" and row.get("durationNs") is not None:
            out.append((int(row["elapsedNs"]), int(row["durationNs"])))
    if not out:
        raise ValueError(f"{path}: keine `video_sync`-Zeile — die Geraeteuhr hat keinen Anker")
    return sorted(out)


def video_ns_at(elapsed_ns: int, syncs: list[tuple[int, int]]) -> float:
    """Naechster Anker plus verstrichene Systemzeit, Steigung 1 — `RecordedFrames.videoNsAt`.

    NICHT zwischen den Ankern interpoliert: aus zwei benachbarten geschaetzt las die Steigung 2,36
    statt 1,0 (reiner Callback-Jitter) und der Vorlauf landete bei -8,5 s. Kotlin ist die Referenz.
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
    """`{ply: (Beginn, Ende)}` der Geraeteuhr aus `capture.json`; fehlt ein Ende, gilt der naechste.

    Ohne die Datei ist nicht belegt, dass das Buendel eine Erfassung ist. Ohne `elapsed_ns` gibt es
    keinen Weg ins Video, und die Bretter truegen die Namen fremder Frames.
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
    for src in realgames.stored_rows(bundle):
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
    """`session.yaml` neben dem Log, in der Form von `realgames.write_session`.

    Ohne sie ueberspringen `position_flags`/`frame_hands` das Verzeichnis WORTLOS, statt zu
    meckern — der importierte Mitschnitt erreicht das Training dann nie.
    """
    import yaml

    src = bundle / "session.yaml"
    carried = yaml.safe_load(src.read_text(encoding="utf-8")) if src.is_file() else None
    meta = {**(carried or {}),
            "session_id": f"rg-{session_dir.name}",
            "profile": profile,
            "mode": "capture",
            "frame_size": [int(v) for v in prof.frame_size],
            "notes": f"imported from data/recordings/{name}/{bundle.name} (plan/04-capture)"}
    session_dir.mkdir(parents=True, exist_ok=True)
    with (session_dir / "session.yaml").open("w", encoding="utf-8") as fh:
        yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)
    return session_dir / "session.yaml"


def import_capture(name: str, profile: str = realgames.EXPORT_PROFILE) -> dict:
    """Ein Buendel mit `capture.json` wird zu Brettern und dem `log.jsonl`, das `slice` liest."""
    from .calibration import load_profile

    dirs = realgames.stored_session_dirs(name)
    if len(dirs) != 1:
        raise ValueError(f"{name}: genau ein Buendel erwartet, gefunden {[str(d) for d in dirs]}")
    bundle = dirs[0]
    video = realgames.video_path(name)
    fps = container_fps(video)
    rows = capture_rows(bundle, capture_steps(bundle), video_syncs(bundle), fps)
    session_dir = realgames.game_dir(name)
    prof = load_profile(profile)
    # Das ArUco-Quad des Telefons ist grob (CLAUDE.md), und ohne die `grid_lines`, die erst der Fit
    # schreibt, findet `meshes_for_boards` nichts und jedes Brett bleibt gebogen.
    fit = realgames.fit_rows_to_grid(rows, prof, frames=video_frames(video, rows))
    rows = fit["arrived"]
    made = realgames.rewarp_boards(session_dir, rows, prof, frames=video_frames(video, rows))
    # Eine Zeile ohne Brett benennt eine Datei, die nie geschrieben wurde — hinter dem Ende einer
    # abgeschnittenen Aufnahme gibt der Dekoder kein Bild mehr her.
    rows = [r for r in rows if r.get("board")]
    write_capture_meta(session_dir, bundle, name, profile, prof)
    # Wie `realgames.write_session`: im Log koennen handgesetzte Quads und Urteile stehen, und
    # ein Re-Import darf sie nicht ohne Kopie ueberschreiben.
    from .sessions import backup_log

    if (session_dir / "log.jsonl").is_file():
        backup_log(session_dir / "log.jsonl")
    with (session_dir / "log.jsonl").open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"session_dir": session_dir, "bundle": bundle, "rows": rows,
            "fps": fps, "fit": fit, **made}
