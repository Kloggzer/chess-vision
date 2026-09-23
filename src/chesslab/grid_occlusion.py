"""The grid-groove hand read — Python mirror of the normative `core-geometry/GridOcclusion.kt`.

A hand ERASES the grooves beneath it, a shadow does not. Full resolution or nothing (at detection
scale the noise floor is 30-40 of 144 segments), and a hand is an ADJACENT PAIR of flagged
squares."""

from __future__ import annotations

import numpy as np

from .alignment import CENTROID_FRAC, OUTER_SEARCH_FRAC, SEARCH_FRAC, _notch_centre

BOARD_SIDE = 8

MIN_MISSING_EDGES = 2
def missing_edges(gray: np.ndarray, board_size: int, pad: int, *, white_pov: bool = True) -> dict[str, int]:
    """Per SQUARE NAME: how many of its four edge segments found no groove (only entries >= 1).

    Outer lines unreadable for lack of pad count as FOUND: a missing line accuses, an unmeasured
    one must not.
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
    """The flagged squares, only when shaped like a HAND (an orthogonally adjacent pair): one flag
    alone is a piece leaning over its own grooves.
    """
    flagged = {sq for sq, n in edges.items() if n >= MIN_MISSING_EDGES}
    for sq in flagged:
        f, r = ord(sq[0]), int(sq[1])
        neighbours = {f"{chr(f + 1)}{r}", f"{chr(f - 1)}{r}", f"{sq[0]}{r + 1}", f"{sq[0]}{r - 1}"}
        if neighbours & flagged:
            return flagged
    return set()
