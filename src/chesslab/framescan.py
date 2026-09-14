"""Measure every frame first, pick afterwards — the export used to pick first and measure after.

Picking first is what starved the corpus: `plan_rows` spread 8 frames over a window, the sensors
then flagged half of them, and the slot went empty instead of moving. Numbers: `docs/frame-scan.md`.
"""
from __future__ import annotations

from contextlib import closing
from pathlib import Path

import cv2
import numpy as np

from . import config
from .work_audit import measure, span

#: Every third frame — 0.1 s at 30 fps. A hand needs longer than that to arrive or to leave, and
#: the picks come out of the scanned indices, so a finer stride only buys candidates nobody needs.
SCAN_STRIDE = 3
#: A stop for the stride `range` handed to the decoder as `wanted`. `range.__contains__` is O(1),
#: so this only has to lie past the end of any recording — it is a bound, not a count.
BEYOND_ANY_RECORDING = 1 << 31
#: A hand on the board. Clean boards sit flat at 0.11–0.13, hands at 0.30–0.95; measured over 800
#: boards from 20 sessions. At 0.10 every clean board flags (`docs/frame-scan.md`). Only read on
#: scans that predate the gate — nothing writes it any more.
PERSON_THR = 0.20
#: Ab hier nennt der destillierte Kopf ein Brett besetzt. Gemessen 2026-08-22 auf vier
#: zurückgehaltenen Sessions (1 783 Bretter): bei 0,50 fängt er ALLE 865 Hände und verwirft 10 von
#: 918 sauberen. RT-DETR daneben rettet keinen Frame mehr, den nicht schon diese Schwelle mitnimmt.
GATE_THR = 0.5
#: Bretter je Vorwärtslauf. Der Scan dekodiert seriell, also puffert er, statt einzeln zu fragen.
GATE_BATCH = 16
#: Grey levels a square mean may drift from the commit's reference before it counts as moved.
#: `labeling.SETTLE_LIMIT` is the same quantity over crop pixels.
CHANGE_THR = 12.0
#: A move changes two squares, a piece falling over three at most. More cells drifting at once is
#: the player leaning in: measured on 00-39-57, median 7 cells and all of them on rank 1 and 2.
MAX_CHANGED_CELLS = 4
#: Darunter zeigt das Brett keine Figur mehr. RELATIV, weil der absolute Median zwischen
#: Aufnahmen um Faktor 28 schwankt (49 bis 1388) — fest sortierte nach Licht statt nach Fokus.
#: Die Verteilung ist zweigipflig, zwischen 40 und 50 % liegen 43 von 11 888 Brettern.
SHARP_MIN_FRACTION = 0.45
#: Mehr dunkle Zellen als das, und das Brett geht ganz. Die Verteilung springt: 57 % der Bretter
#: haben KEINE, danach ein flaches Plateau bis 23 — die Ecke ist stationaer, also trifft die Regel
#: ganze Aufnahmen und nicht einzelne Bretter (Nutzer, 2026-09-09).
DARK_CELLS_MAX = 4
#: `None` ist bei `detect_rotation` eine ANTWORT ("keine Drehung noetig"), also kann es nicht
#: zugleich "nicht gefragt" heissen — sonst laeuft der Probe-Decode doppelt.
UNSET = object()


class Wanted:
    """Das Dreier-Raster plus einzelne Extra-Indizes, mit O(1)-Mitgliedschaft.

    Der Decoder fragt `index in wanted` JE FRAME (`recording.py:64-72`); eine Liste machte daraus
    einen linearen Durchlauf. `range` und `frozenset` antworten beide in konstanter Zeit.
    """

    def __init__(self, stride: int, extra=()) -> None:
        self.rng = range(0, BEYOND_ANY_RECORDING, stride)
        self.extra = frozenset(int(i) for i in extra)

    def __contains__(self, index: int) -> bool:
        return index in self.rng or index in self.extra


def cell_sharpness(board_gray, size: int, hands=(), *, white_pov: bool = True) -> float:
    """Laplace-Varianz je Feld, Median ueber die UNVERDECKTEN — die Schaerfe des Bretts.

    Ueber das ganze Bild misst sie die Hand mit: Haut ist texturarm und zieht die Varianz wie
    Unschaerfe (ein scharfes Brett mit nacktem Arm landete bei 17 statt 500). `hands` traegt NAMEN,
    die an der Seite des Profils haengen — hartkodiert mass sie unter Schwarz auf der Hand."""
    lap = cv2.Laplacian(board_gray, cv2.CV_64F)
    step = size // 8
    cells = []
    for c in range(64):
        ri, ci = divmod(c, 8)
        cells.append(float(lap[ri * step:(ri + 1) * step, ci * step:(ci + 1) * step].var()))
    vals = [v for c, v in enumerate(cells) if cell_square(c, white_pov) not in hands]
    return round(float(np.median(vals)), 1) if len(vals) >= 16 else -1.0


def dark_indices(scan: list[dict], limit: int = DARK_CELLS_MAX) -> set[int]:
    """Die Frame-Indizes mit mehr als `limit` zu dunklen Zellen — `cells` traegt sie schon."""
    from .training.occlusion import CELL_DARK_MIN

    return {r["idx"] for r in scan
            if sum(1 for v in (r.get("cells") or ()) if v < CELL_DARK_MIN) > limit}


def blurred_indices(scan: list[dict], fraction: float = SHARP_MIN_FRACTION) -> set[int]:
    """Die Frame-Indizes, deren Brett unter `fraction` des Aufnahme-Medians liegt.

    Ein Scan ohne `sharp` liefert die leere Menge — er hat nie gemessen, und Raten waere hier
    schlimmer als Nichtstun.
    """
    vals = [r["sharp"] for r in scan if r.get("sharp", -1) >= 0]
    if len(vals) < 8:
        return set()
    floor = float(np.median(vals)) * fraction
    return {r["idx"] for r in scan if 0 <= r.get("sharp", -1) < floor}


def scan_path(name: str) -> Path:
    """Next to the candidate, not in the session: a corpus reset must not cost the scan."""
    from .realgames import game_dir

    return game_dir(name) / "scan.jsonl"


def scan_meta_path(name: str) -> Path:
    """Die Herkunft neben dem Scan, nicht darin: `read_scan` sortiert nach `idx`, eine Kopfzeile
    ohne `idx` braeche das."""
    return scan_path(name).with_name("scan.meta.json")


def scan_provenance(name: str, *, stride: int, extra=(), tag: str = "") -> dict:
    """Alles, was den Scan bestimmt — nicht nur das Video.

    Geometrie, Kalibrierprofil und Hand-Gate gehen genauso ein: derselbe Film mit anderen Ecken
    ergibt andere Zeilen. Eine reine Video-mtime wuerde das durchgehen lassen.
    """
    from .calibration import profile_path
    from .hand_gate import CARD_FILE, DEFAULT_GATE, GATE_DIR, WEIGHTS_FILE
    from .realgames import EXPORT_PROFILE, load_candidate, video_path

    def stamp(path: Path) -> list:
        st = path.stat() if path.exists() else None
        return [st.st_mtime_ns, st.st_size] if st else None

    gate_dir = config.DATA.models / f"{GATE_DIR}-{tag or DEFAULT_GATE}"
    candidate = load_candidate(name)
    return {
        "video": stamp(video_path(name)),
        "corners": [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]],
        "profile": [EXPORT_PROFILE, stamp(profile_path(EXPORT_PROFILE))],
        "gate": [tag or DEFAULT_GATE, stamp(gate_dir / CARD_FILE), stamp(gate_dir / WEIGHTS_FILE)],
        "stride": stride,
        "extra": sorted(int(i) for i in extra),
    }


def scan_is_stale(name: str, *, stride: int = SCAN_STRIDE, extra=(), tag: str = "") -> str | None:
    """Warum der Scan neu muss, oder `None` wenn er gilt. Der Grund ist die halbe Meldung."""
    import json as _json

    if not scan_path(name).exists():
        return "keine scan.jsonl"
    meta_path = scan_meta_path(name)
    if not meta_path.exists():
        return "keine scan.meta.json — Herkunft unbekannt"
    try:
        have = _json.loads(meta_path.read_text(encoding="utf-8"))
    except ValueError:
        return "scan.meta.json unlesbar"
    want = scan_provenance(name, stride=stride, extra=extra, tag=tag)
    # Die Extras duerfen WACHSEN, ohne den Scan zu entwerten: gemessen ist gemessen. Fehlt einer,
    # ist er nie gemessen worden, und genau dann taugt der Scan fuer diesen Lauf nicht.
    missing = set(want.pop("extra")) - set(have.get("extra") or ())
    if missing:
        return f"{len(missing)} korrigierte/gemeldete Frames nicht gemessen"
    have.pop("extra", None)
    differing = [k for k, v in want.items() if have.get(k) != v]
    if differing:
        return f"geaendert: {', '.join(differing)}"
    # Ein Scan von vor der Schaerfemessung kann nicht nach ihr auswaehlen.
    first = next(iter(read_scan(name)), None)
    return None if first is None or "sharp" in first else "ohne Schaerfemessung"


def read_scan(name: str) -> list[dict]:
    """The scan rows in frame order, empty when the recording was never scanned."""
    from .ioutil import read_jsonl

    path = scan_path(name)
    return sorted(read_jsonl(path), key=lambda r: r["idx"]) if path.exists() else []


def cell_means(padded, size: int, pad: int, *, gray=None, work_key=None) -> list[float]:
    """The board as 64 grey means, one per square — enough to see a piece lying where it stood."""
    if gray is None:
        source = padded[pad:pad + size, pad:pad + size]
        key = work_key if work_key is not None else ("array", id(padded), "gray")
        with measure("BGR to Gray conversions", key, processed_bytes=source.nbytes):
            board = cv2.cvtColor(source, cv2.COLOR_BGR2GRAY)
    else:
        board = gray[pad:pad + size, pad:pad + size]
    return [round(float(v), 2) for v in cv2.resize(board, (8, 8), interpolation=cv2.INTER_AREA).flatten()]


def occupied(row: dict, person_thr: float = PERSON_THR, gate_thr: float = GATE_THR) -> bool:
    """Sieht der Hand-Gate eine Hand? Die drei alten Sensoren nur noch auf alten Scans.

    Gegen SAM auf vier zurückgehaltenen Sessions: Gate 0,9988/0,9920, die drei zusammen
    0,9618/0,9509. Die Rillen bleiben im Scan, weil sie FELDER benennen, nicht als Stimme.
    """
    if "gate" in row:
        return row["gate"] >= gate_thr
    return bool(row.get("grid")) or bool(row.get("skin")) or row.get("person", 0.0) >= person_thr


def scan_video(name: str, *, stride: int = SCAN_STRIDE, resume: bool = True,
               progress: bool = True, tag: str = "", rotate=UNSET, extra=()) -> dict:
    """One forward decode of the recording, every `stride`-th frame past the hand gate.

    Kein Quad-Fit und kein Brett geschrieben — die kosten 218 ms. Seit 2026-08-22 kommt die Hand
    vom destillierten Gate (2,1 ms) statt von RT-DETR (24,6 ms); die Rillen benennen nur Felder.
    """
    import json

    from .calibration import load_profile
    from .grid_occlusion import crop_border_px, hand_squares, missing_edges, warp_padded
    from .hand_gate import load_gate, read_boards
    from .realgames import (
        EXPORT_PROFILE,
        PROGRESS_EVERY,
        detect_rotation,
        load_candidate,
        video_path,
    )
    from .recording import Recording

    path = scan_path(name)
    stale = scan_is_stale(name, stride=stride, extra=extra, tag=tag)
    if resume and stale is None:
        return {"path": path, "frames": len(read_scan(name)), "resumed": True, "stale": None}
    candidate = load_candidate(name)
    profile = load_profile(EXPORT_PROFILE)
    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    video = video_path(name)
    if rotate is UNSET:
        rotate = detect_rotation(video, candidate,
                                 {int(m["frame"]) for m in candidate.get("moves") or []})
    pad, size = crop_border_px(profile), profile.board_size
    total = int(candidate.get("frames") or 0)
    model, card, device = load_gate(tag)
    rows, pending = [], []

    def score():
        """Den Puffer durch den Kopf, das Veto an seine Zeilen — nichts sonst wandert in den Scan."""
        if not pending:
            return
        said = read_boards(model, device, [board for _, board in pending], card["size"])
        for (row, _board), got in zip(pending, said, strict=True):
            row["gate"] = round(float(got[0]), 4)
        pending.clear()

    # `Wanted` statt `take`: sein `in` ist O(1), der Decoder baut die zwei von drei Bildern gar
    # nicht erst — und die Obergrenze bleibt jenseits jeder Aufnahme. `candidate["frames"]` taugt
    # dafuer NICHT: es zaehlt nur den Fortschritt, und eine zu kleine Zahl kuerzte den Scan still.
    with closing(Recording(video).frames(0, wanted=Wanted(stride, extra), rotate=rotate)) as stream:
        for idx, frame in stream:
            with span("FramePipeline.onFrame"):
                padded = warp_padded(frame, corners, profile, pad)
                board = padded[pad:pad + size, pad:pad + size]
                gray_key = (str(video.resolve()), idx, rotate, "padded-gray")
                with measure("BGR to Gray conversions", gray_key,
                             processed_bytes=padded.nbytes):
                    padded_gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
                hands = sorted(hand_squares(missing_edges(
                    padded_gray, size, pad, white_pov=profile.white_pov)))
                row = {
                    "idx": idx,
                    "grid": hands,
                    "cells": cell_means(padded, size, pad, gray=padded_gray),
                    # Der Fokus, gemessen wie die Hand: erst messen, dann waehlen. Die Rillen
                    # liefern die Maske gleich mit, eine Matte gibt es hier noch nicht.
                    "sharp": cell_sharpness(padded_gray[pad:pad + size, pad:pad + size],
                                            size, hands, white_pov=profile.white_pov),
                }
                rows.append(row)
                pending.append((row, board))
                if len(pending) >= GATE_BATCH:
                    score()
            if progress and len(rows) % PROGRESS_EVERY == 0:
                print(f"  scan {idx}/{total} frames, {sum(occupied(r) for r in rows)} with a hand",
                      flush=True)
    score()
    # Erst nach dem letzten Batch, und ueber eine Nebendatei: ein Abbruch mittendrin liesse sonst
    # eine halbe Datei zurueck, die `resume` fuer vollstaendig haelt.
    _write_atomic(path, "".join(json.dumps(r) + "\n" for r in rows))
    _write_atomic(scan_meta_path(name),
                  json.dumps(scan_provenance(name, stride=stride, extra=extra, tag=tag), indent=2))
    return {"path": path, "frames": len(rows), "stride": stride, "gate": card["backbone"],
            "hands": sum(occupied(r) for r in rows), "resumed": False, "stale": stale}


def _write_atomic(path: Path, text: str) -> None:
    """Schreiben heisst hier: entweder ganz da oder gar nicht."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


#: Board files, for naming the square a deviating cell sits on.
_FILES = "abcdefgh"


def cell_square(i: int, white_pov: bool = True) -> str:
    """The square of flat cell `i` — `cell_means` reads the warped board row by row."""
    row, col = divmod(i, 8)
    return f"{_FILES[col]}{8 - row}" if white_pov else f"{_FILES[7 - col]}{row + 1}"


def _persistent(quiet: list[dict], ref, change_thr: float,
                cells: list[int]) -> tuple[int | None, set[int]]:
    """The first index from which `cells` never match the commit's board again, and which they are.

    Subtracting the median difference is what keeps lighting drift out: compared raw, it once
    flagged 877 k of 906 k pixels on a board nobody had touched (`docs/session-mattes.md`).
    """
    off = {}
    for row in quiet:
        diff = np.array(row["cells"], np.float32) - ref
        dev = np.abs(diff - np.median(diff))
        off[row["idx"]] = {c for c in cells if dev[c] >= change_thr}
    tail = [r["idx"] for r in quiet]
    hit = next((i for n, i in enumerate(tail) if all(off[j] for j in tail[n:])), None)
    return hit, ({c for i in tail[tail.index(hit):] for c in off[i]} if hit is not None else set())


def classify(segment: dict, scan: list[dict], *, person_thr: float = PERSON_THR,
             change_thr: float = CHANGE_THR, ref_frames: int = 3,
             white_pov: bool = True) -> dict[int, str]:
    """`frame index -> clean | occluded | stale | changed` for one ply interval.

    The witness is the BOARD, not the hand: a hand over an unchanged board keeps its FEN, which
    is a player reaching in rather than one who has already moved.
    """
    rows = [r for r in scan if segment["start"] <= r["idx"] < segment["end"]]
    quiet = [r for r in rows if not occupied(r, person_thr) and r.get("cells")]
    stale_from = fall_from = None
    if len(quiet) > ref_frames:
        ref = np.median(np.array([r["cells"] for r in quiet[:ref_frames]], np.float32), axis=0)
        square = {cell_square(c, white_pov): c for c in range(64)}
        touched = [square[s] for s in (segment.get("next_touches") or ()) if s in square]
        stale_from = _persistent(quiet, ref, change_thr, touched)[0] if touched else None
        fall_from, cells = _persistent(quiet, ref, change_thr,
                                       [c for c in range(64) if c not in touched])
        if len(cells) > MAX_CHANGED_CELLS:
            fall_from = None
    out = {}
    for row in rows:
        idx = row["idx"]
        if stale_from is not None and idx >= stale_from:
            out[idx] = "stale"
        elif fall_from is not None and idx >= fall_from:
            out[idx] = "changed"
        elif occupied(row, person_thr):
            out[idx] = "occluded"
        else:
            out[idx] = "clean"
    return out


def select(reasons: dict[int, str], *, per_position: int = 8, dirty_per_position: int = 8,
           prefer=(), tol: int = 5) -> tuple[list[int], list[int]]:
    """The indices this interval contributes: the clean p8, and the dirty sample beside it.

    Dirty prefers `occluded` over `stale` because only the first has a FEN that still holds — a
    real hand over a KNOWN position is the only occlusion material whose labels are worth having.
    """
    from .realgames import pick_spread

    idxs = sorted(reasons)
    clean = pick_spread(idxs, lambda i: reasons[i] == "clean", per_position, prefer=prefer, tol=tol)
    dirty = pick_spread([i for i in idxs if reasons[i] == "occluded"], lambda i: True,
                        dirty_per_position)
    if len(dirty) < dirty_per_position:
        rest = [i for i in idxs if reasons[i] in ("stale", "changed")]
        dirty += pick_spread(rest, lambda i: True, dirty_per_position - len(dirty))
    return clean, sorted(dirty)
