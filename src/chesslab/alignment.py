"""Where the board's squares REALLY sit in a rectified frame, and how to pull them onto the grid.

A warp can be wrong without anything failing: `board_corners_for_frame` returns a quad, `slice`
produces 64 crops, and every count in the pipeline looks healthy while the grid sits a few degrees
off and every crop straddles two squares. That happened on 2026-07-31 — the `MarkerTracker`'s dead
zone and EMA lag differently per marker while the board rotates, so the quad came out sheared, and
only the calibration-pose frame rectified correctly. Nothing noticed.

On the RECTIFIED board the 7 interior grooves per axis must sit at multiples of `board_size / 8`.
Locating them from the gradient profile gives the board's real line positions; reassembling those
into the 64 cell rectangles gives a per-square offset in the units the crops are cut in, and
fitting the measured lattice onto the nominal one gives a corrected quad.

Measuring inside the warp is deliberate. Measuring corner residuals on the raw frame instead drowns
in barrel distortion (6 px of baseline noise) and saturates at the corner-refinement window, so a
40 px corner error moves the number less than the noise does.
"""

from __future__ import annotations

import numpy as np

#: How far either side of an expected line to look for the real one, as a fraction of a cell.
#: A quarter cell: beyond that the search locks onto the NEIGHBOURING groove and reports a small
#: offset for a board that is off by a whole square.
SEARCH_FRAC = 0.25

#: A groove must be this many grey levels darker than its surroundings to count as found. Below it
#: the minimum is noise, and a noisy line would invent a cell boundary that is not there.
MIN_DEPTH = 6.0

#: Half-width of the window the groove's centroid is taken over, as a fraction of a cell. The
#: grooves on the reference board are 2 mm ≈ 5.5 px of a 100 px cell, so ±8 px spans about one and
#: a half grooves: wide enough to hold the whole band and its shoulders, narrow enough that the
#: neighbouring square's texture cannot pull the centre of mass.
CENTROID_FRAC = 0.08


def _groove_centre(win: np.ndarray, span: int) -> float | None:
    """Sub-pixel centre of the dark band in `win`, or None when there is no band.

    **The centre of the groove, not the peak of its gradient.** A groove is a dark band with an
    edge on EACH side, so `|Sobel|` has two peaks and `argmax` picks whichever the current lighting
    makes stronger — left on one frame, right on the next. That flip is worth half a groove width,
    and it was the measurement's whole noise floor: 2.56 px median on this corpus against 1.32 px
    for the centroid, with the p90 falling from 3.70 to 1.74.

    The centroid is symmetric by construction, so it does not care which edge is better lit, and it
    uses every pixel of the band instead of one sample of a derivative.
    """
    base = float(np.percentile(win, 90))
    if base - float(win.min()) < MIN_DEPTH:
        return None
    j = int(np.argmin(win))
    lo, hi = max(0, j - span), min(len(win), j + span + 1)
    weight = np.clip(base - win[lo:hi], 0.0, None)
    total = float(weight.sum())
    if total <= 0.0:
        return None
    return lo + float((weight * np.arange(len(weight))).sum() / total)


def line_positions(warped, board_size: int) -> tuple[np.ndarray, np.ndarray]:
    """The board's REAL 9 line positions per axis, as `(xs, ys)` in rectified pixels.

    Index 0 and 8 are the playing-field edges, which the warp fixes at 0 and `board_size` by
    construction — they are not measured and cannot drift. An interior groove that cannot be told
    from its neighbourhood comes back as NaN, so a caller can see which boundary is a guess: pieces
    sit ON the grooves and legitimately hide some.
    """
    import cv2

    g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY).astype(np.float32)
    cell = board_size / 8.0
    span = int(round(cell * SEARCH_FRAC))
    csp = max(2, int(round(cell * CENTROID_FRAC)))
    out = []
    for axis in (0, 1):
        # INTENSITY collapsed along the lines of this axis, not its gradient: a groove is a dark
        # band, and its centre is what the grid is supposed to sit on. Averaging down the columns
        # leaves a flat profile with one dip per groove.
        prof = g.mean(axis=axis)
        pos = np.full(9, np.nan)
        pos[0], pos[8] = 0.0, float(board_size)
        for k in range(1, 8):
            c = int(round(k * cell))
            lo, hi = max(0, c - span), min(len(prof), c + span + 1)
            win = prof[lo:hi]
            if win.size < 5:
                continue
            centre = _groove_centre(win, csp)
            if centre is not None:
                pos[k] = lo + centre
        out.append(pos)
    return out[0], out[1]


def square_offsets(warped, board_size: int) -> tuple[dict[str, float], int]:
    """`{square: offset px}` for every square whose four boundaries were measurable, plus the count
    of interior lines that could not be located.

    The offset is the largest displacement of any of the square's four edges from where the grid
    says it should be — the quantity that decides whether the crop cut at that cell contains the
    square or a slice of its neighbour.
    """
    xs, ys = line_positions(warped, board_size)
    cell = board_size / 8.0
    unread = int(np.isnan(xs[1:8]).sum() + np.isnan(ys[1:8]).sum())
    off: dict[str, float] = {}
    for f in range(8):
        for r in range(8):
            # Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
            edges = (xs[f], xs[f + 1], ys[7 - r], ys[8 - r])
            want = (f * cell, (f + 1) * cell, (7 - r) * cell, (8 - r) * cell)
            if any(np.isnan(e) for e in edges):
                continue
            off[f"{chr(97 + f)}{r + 1}"] = max(abs(e - w) for e, w in zip(edges, want, strict=True))
    return off, unread


def frame_offsets(frame, quad, profile) -> tuple[dict[str, float], int]:
    """`square_offsets` for a RAW frame and its corner quad."""
    from .calibration import warp_from_corners

    return square_offsets(warp_from_corners(frame, profile, quad), profile.board_size)


def worst_offset(frame, quad, profile) -> float:
    """The largest square offset in this frame, or NaN when nothing was measurable."""
    off, _ = frame_offsets(frame, quad, profile)
    return max(off.values()) if off else float("nan")


def correct_quad(frame, quad, profile):
    """A corrected corner quad, or None when the frame gives too little to fit one.

    The measurement already says where the board's lines REALLY are, so the correction is the map
    that puts them where they belong: fit a homography from the measured lattice to the nominal
    one, chain it onto the existing corner homography, and read the new corners back out in frame
    pixels.

        H_old : frame -> rectified (from the current quad)
        H_fix : rectified(measured) -> rectified(nominal)
        new   = H_old^-1 . H_fix^-1 . H_old . old

    **What it can and cannot fix.** The lines are located from profiles collapsed along their own
    direction, which measures a line's POSITION but averages away its TILT. So this corrects
    translation, scale and per-axis perspective — the dominant error when marker centres sit a few
    pixels off — and cannot correct a rotation of the grid inside the warp. A sheared quad has to be
    re-detected, not nudged.

    It is also only worth applying to a frame that is ALREADY out of tolerance: inside the noise
    band the fit chases measurement noise and makes things worse. Callers decide that; this
    function just computes.
    """
    import cv2

    from .calibration import compute_homography, warp_from_corners

    bs = profile.board_size
    cell = bs / 8.0
    xs, ys = line_positions(warp_from_corners(frame, profile, quad), bs)
    src, dst = [], []
    for i in range(9):
        for j in range(9):
            if np.isnan(xs[i]) or np.isnan(ys[j]):
                continue
            src.append([xs[i], ys[j]])
            dst.append([i * cell, j * cell])
    if len(src) < 8:
        return None
    h_fix, _ = cv2.findHomography(np.array(src, np.float64), np.array(dst, np.float64), 0)
    if h_fix is None:
        return None
    h_old = np.array(compute_homography(quad, bs, profile.margin), np.float64)
    try:
        m = np.linalg.inv(h_old) @ np.linalg.inv(h_fix) @ h_old
    except np.linalg.LinAlgError:
        return None
    pts = np.hstack([np.asarray(quad, np.float64), np.ones((4, 1))]).T
    out = m @ pts
    if np.any(np.abs(out[2]) < 1e-9):
        return None
    return (out[:2] / out[2]).T.tolist()


def improve_quad(frame, quad, profile) -> tuple[list | None, float, float]:
    """`(corrected quad or None, offset before, offset after)`.

    Returns None for the quad when the fit failed OR when it did not actually improve the frame,
    so a caller can write the result unconditionally and never make a frame worse.
    """
    before = worst_offset(frame, quad, profile)
    fixed = correct_quad(frame, quad, profile)
    if fixed is None:
        return None, before, float("nan")
    after = worst_offset(frame, fixed, profile)
    if not np.isfinite(after) or not np.isfinite(before) or after >= before:
        return None, before, after
    return fixed, before, after
