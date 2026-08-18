"""Measure every frame first, pick afterwards — the export used to pick first and measure after.

Picking first is what starved the corpus: `plan_rows` spread 8 frames over a window, the sensors
then flagged half of them, and the slot went empty instead of moving. Numbers: `docs/frame-scan.md`.
"""
from __future__ import annotations

from contextlib import closing
from pathlib import Path

import cv2
import numpy as np

#: Every third frame — 0.1 s at 30 fps. A hand needs longer than that to arrive or to leave, and
#: the picks come out of the scanned indices, so a finer stride only buys candidates nobody needs.
SCAN_STRIDE = 3
#: A hand on the board. Clean boards sit flat at 0.11–0.13, hands at 0.30–0.95; measured over 800
#: boards from 20 sessions. At 0.10 every clean board flags (`docs/frame-scan.md`).
PERSON_THR = 0.20
#: Grey levels a square mean may drift from the commit's reference before it counts as moved.
#: `labeling.SETTLE_LIMIT` is the same quantity over crop pixels.
CHANGE_THR = 12.0
#: A move changes two squares, a piece falling over three at most. More cells drifting at once is
#: the player leaning in: measured on 00-39-57, median 7 cells and all of them on rank 1 and 2.
MAX_CHANGED_CELLS = 4


def scan_path(name: str) -> Path:
    """Next to the candidate, not in the session: a corpus reset must not cost the scan."""
    from .realgames import game_dir

    return game_dir(name) / "scan.jsonl"


def read_scan(name: str) -> list[dict]:
    """The scan rows in frame order, empty when the recording was never scanned."""
    from .ioutil import read_jsonl

    path = scan_path(name)
    return sorted(read_jsonl(path), key=lambda r: r["idx"]) if path.exists() else []


def cell_means(padded, size: int, pad: int) -> list[float]:
    """The board as 64 grey means, one per square — enough to see a piece lying where it stood."""
    board = cv2.cvtColor(padded[pad:pad + size, pad:pad + size], cv2.COLOR_BGR2GRAY)
    return [round(float(v), 2) for v in cv2.resize(board, (8, 8), interpolation=cv2.INTER_AREA).flatten()]


def occupied(row: dict, person_thr: float = PERSON_THR) -> bool:
    """Any of the three witnesses seeing a hand. They fail differently, which is the point.

    The grooves are model-free, RT-DETR sees an arm that covers no line, and `skin_patch` catches
    the fingertips at the border that stay under the model's threshold (58 in this corpus).
    """
    return bool(row.get("grid")) or bool(row.get("skin")) or row.get("person", 0.0) >= person_thr


def scan_video(name: str, *, stride: int = SCAN_STRIDE, resume: bool = True,
               progress: bool = True) -> dict:
    """One forward decode of the recording, every `stride`-th frame through the cheap sensors.

    No quad fit and no board written — 45 ms a frame against the 218 ms those two cost. What the
    frames are worth is `classify`'s job, and it needs no pixels.
    """
    import json

    from . import matte
    from .calibration import load_profile
    from .grid_occlusion import crop_border_px, hand_squares, missing_edges, warp_padded
    from .imgops import skin_patch
    from .realgames import (
        EXPORT_PROFILE,
        PROGRESS_EVERY,
        detect_rotation,
        load_candidate,
        video_path,
    )
    from .recording import Recording

    path = scan_path(name)
    if resume and path.exists():
        return {"path": path, "frames": len(read_scan(name)), "resumed": True}
    candidate = load_candidate(name)
    profile = load_profile(EXPORT_PROFILE)
    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    video = video_path(name, candidate)
    rotate = detect_rotation(video, candidate,
                             {int(m["frame"]) for m in candidate.get("moves") or []})
    pad, size = crop_border_px(profile), profile.board_size
    total = int(candidate.get("frames") or 0)
    rows = []
    with closing(Recording(video).frames()) as stream:
        for idx, frame in stream:
            if idx % stride:
                continue
            if rotate is not None:
                frame = cv2.rotate(frame, rotate)
            padded = warp_padded(frame, corners, profile, pad)
            board = padded[pad:pad + size, pad:pad + size]
            rows.append({
                "idx": idx,
                "person": round(matte.person_score(padded), 3),
                "skin": bool(skin_patch(board, size / 8.0, profile.crop.pad_side)),
                "grid": sorted(hand_squares(missing_edges(
                    cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY), size, pad,
                    white_pov=profile.white_pov))),
                "cells": cell_means(padded, size, pad),
            })
            if progress and len(rows) % PROGRESS_EVERY == 0:
                print(f"  scan {idx}/{total} frames, {sum(occupied(r) for r in rows)} with a hand",
                      flush=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return {"path": path, "frames": len(rows), "stride": stride,
            "hands": sum(occupied(r) for r in rows), "resumed": False}


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
