"""The grid-groove hand read — Python mirror of `core-geometry/GridOcclusion.kt`.

The board's own grid lines are the one witness of a hand that needs no model and no reference
frame: a hand ERASES the grooves beneath it, a shadow does not, and pieces cost scattered single
segments. The read is the alignment fit's band-wise groove search kept per segment instead of
collapsed into lines — 2 axes x 9 lines x 8 bands is one segment per cell edge, and a square
reads occluded at >= 2 missing edges.

Two rules are load-bearing, both measured 2026-08-09/10 (`docs/occluder-plates.md`):

- **Full resolution or nothing.** At detection scale the grooves are 1-2 px and the noise floor
  is 30-40 of 144 segments; at the crop warp's resolution a clean frame drops ~2.
- **A hand is an ADJACENT PAIR of flagged squares.** One standing flag is a piece leaning over
  its own grooves (c8 on VID_20260802_222741: flagged on 73 % of all frames, for minutes at a
  time); a count threshold fails the other way on the leaving hand's 2-flag tail (h3+h2 — always
  neighbours). Kotlin's `gridHandSquares` applies the same rule to the tracker's veto.

The Kotlin side is normative; `tests/test_grid_occlusion.py` pins this mirror to the same
synthetic-board behaviour as `GridOcclusionTest.kt`.
"""

from __future__ import annotations

import numpy as np

from .alignment import CENTROID_FRAC, OUTER_SEARCH_FRAC, SEARCH_FRAC, _notch_centre

BOARD_SIDE = 8

#: A square reads occluded at this many missing edge segments (of its four).
MIN_MISSING_EDGES = 2

#: `config.CROP_WARP_BORDER_CELLS` — the crop warp's minimum border, in cells.
CROP_WARP_BORDER_CELLS = 0.1


def crop_border_px(profile) -> int:
    """`cropBorderPx` — the pad the crop warp (and therefore this read) is cut with."""
    cell = profile.board_size / BOARD_SIDE
    return int(round(max(CROP_WARP_BORDER_CELLS, profile.crop.pad_side, profile.crop.pad_up) * cell))


def warp_padded(frame, corners, profile, pad: int):
    """The rectified board with `pad` px of surroundings — `warpFromCornersPadded`."""
    import cv2

    from .calibration import compute_homography

    bs = profile.board_size
    h = np.array(compute_homography(corners, bs, profile.margin), np.float64)
    t = np.array([[1.0, 0.0, pad], [0.0, 1.0, pad], [0.0, 0.0, 1.0]])
    return cv2.warpPerspective(frame, t @ h, (bs + 2 * pad, bs + 2 * pad))


def missing_edges(gray: np.ndarray, board_size: int, pad: int, *, white_pov: bool = True) -> dict[str, int]:
    """Per SQUARE NAME: how many of its four edge segments found no groove (only entries >= 1).

    Mirrors `GridOcclusion.gridSegments` + `squareBit`: bands are cell-sized, the outer lines are
    read only when the pad fits their search window — otherwise they are treated as FOUND, because
    here a missing line accuses rather than voids, and an unmeasurable one must not.
    """
    cell = board_size / BOARD_SIDE
    span = max(4, int(round(cell * SEARCH_FRAC)))
    outer_span = max(4, int(round(cell * OUTER_SEARCH_FRAC)))
    csp = max(2, int(round(cell * CENTROID_FRAC)))
    read_outer = pad >= outer_span
    found = np.ones((2, BOARD_SIDE + 1, BOARD_SIDE), dtype=bool)
    ks = range(0, BOARD_SIDE + 1) if read_outer else range(1, BOARD_SIDE)
    bh = board_size / BOARD_SIDE
    for axis in (0, 1):
        for b in range(BOARD_SIDE):
            s0, s1 = int(round(pad + b * bh)), int(round(pad + (b + 1) * bh))
            sub = gray[s0:s1, :] if axis == 0 else gray[:, s0:s1]
            if sub.size == 0:
                continue
            prof = np.median(sub, axis=axis).astype(np.float64)
            for k in ks:
                w = outer_span if k in (0, BOARD_SIDE) else span
                c = pad + k * cell
                lo, hi = max(0, int(round(c)) - w), min(len(prof), int(round(c)) + w + 1)
                win = prof[lo:hi]
                ok = False
                if win.size >= 7:
                    hit = _notch_centre(win, csp)
                    ok = hit is not None and abs(lo + hit[0] - c) <= w
                found[axis, k, b] = ok
    out: dict[str, int] = {}
    for col in range(BOARD_SIDE):
        for row in range(BOARD_SIDE):
            n = (
                int(not found[0, col, row])
                + int(not found[0, col + 1, row])
                + int(not found[1, row, col])
                + int(not found[1, row + 1, col])
            )
            if n:
                file_i = col if white_pov else BOARD_SIDE - 1 - col
                rank = BOARD_SIDE - row if white_pov else row + 1
                out[f"{chr(ord('a') + file_i)}{rank}"] = n
    return out


def hand_squares(edges: dict[str, int]) -> set[str]:
    """The flagged squares, but only when they are shaped like a HAND — an adjacent pair.

    `gridHandSquares`' rule: squares at >= MIN_MISSING_EDGES, kept only if at least two of them
    are orthogonal neighbours. A lone leaning piece (or one plus scattered noise) returns empty.
    """
    flagged = {sq for sq, n in edges.items() if n >= MIN_MISSING_EDGES}
    for sq in flagged:
        f, r = ord(sq[0]), int(sq[1])
        neighbours = {f"{chr(f + 1)}{r}", f"{chr(f - 1)}{r}", f"{sq[0]}{r + 1}", f"{sq[0]}{r - 1}"}
        if neighbours & flagged:
            return flagged
    return set()
