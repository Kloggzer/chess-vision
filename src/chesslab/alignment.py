"""Where the board's squares REALLY sit in a rectified frame, and how to pull them onto the grid.

A warp can be wrong without anything failing: `board_corners_for_frame` returns a quad, `slice`
produces 64 crops, and every count in the pipeline looks healthy while the grid sits a few degrees
off and every crop straddles two squares. That happened on 2026-07-31 — the `MarkerTracker`'s dead
zone and EMA lag differently per marker while the board rotates, so the quad came out sheared, and
only the calibration-pose frame rectified correctly. Nothing noticed.

On the RECTIFIED board the 7 interior grooves per axis must sit at multiples of `board_size / 8`.
Locating them gives the board's real line positions; reassembling those into the 64 cell rectangles
gives a per-square offset in the units the crops are cut in, and fitting the measured lattice onto
the nominal one gives a corrected quad.

Measuring inside the warp is deliberate. Measuring corner residuals on the raw frame instead drowns
in barrel distortion (6 px of baseline noise) and saturates at the corner-refinement window, so a
40 px corner error moves the number less than the noise does.

**The lattice is measured BAND-WISE.** Collapsing the whole board along an axis measures a line's
position with excellent precision and averages its TILT away completely, so a rotation or shear of
the grid inside the warp used to be invisible — and uncorrectable. Collapsing one band at a time
gives several samples per line instead of one, at sqrt(bands) worse noise each, which the fit
averages straight back out. The tilt survives. Measured on session 20260731-102458 against the 14
frames a human corrected by hand, that plus an affine, Huber-robust, iterated fit takes the
distance to the human's quad from 8.7 px to 5.1 px, and on quads perturbed by a known transform
from 7.5 px to 3.7 px. See `specs/30-sharper-alignment/STATUS.md` for what lost.
"""

from __future__ import annotations

import numpy as np

#: How far either side of an expected line to look for the real one, as a fraction of a cell.
#: A quarter cell: beyond that the search locks onto the NEIGHBOURING groove and reports a small
#: offset for a board that is off by a whole square.
SEARCH_FRAC = 0.25

#: A groove must be this many grey levels below its local background to count as found. Below it
#: the minimum is noise, and a noisy line would invent a cell boundary that is not there.
MIN_DEPTH = 6.0

#: Cap on the half-width the groove's centroid is taken over, as a fraction of a cell. The grooves
#: on the reference board are 2 mm ≈ 5.5 px of a 100 px cell, so ±8 px spans about one and a half
#: grooves: wide enough to hold the whole band, narrow enough that a long shallow shadow cannot
#: drag the centre of mass out of the notch.
CENTROID_FRAC = 0.08

#: How many bands per axis the lattice is measured in. 1 reproduces the old tilt-blind collapse;
#: 4 was measured as the point where the tilt is fully visible and the per-sample noise still
#: averages out (2 and 8 land within 0.1 px of it on every referee).
BANDS = 4

#: Iterations of measure-and-refit. The first pass removes most of the error, and re-measuring in
#: the corrected warp puts the grooves back inside their search windows; 3 is where it stops
#: moving. One pass alone leaves the result depending on how bad the input was (7.5 px from a
#: broken quad against 2.4 px from a good one); iterating removes that dependence.
ITERS = 3


def _notch_centre(win: np.ndarray, csp: int, min_depth: float = MIN_DEPTH):
    """Sub-pixel centre of the groove notch in `win`, as `(offset, depth)`, or None.

    **The centre of the groove, not the peak of its gradient.** A groove is a dark band with an
    edge on EACH side, so `|Sobel|` has two peaks and `argmax` picks whichever the current lighting
    makes stronger — left on one frame, right on the next. That flip is worth half a groove width,
    and it was the measurement's whole noise floor: 2.56 px median on this corpus against 1.32 px
    for a centroid, with the p90 falling from 3.70 to 1.74.

    **The background is removed as a straight line first.** The profile between two grooves is not
    flat — a light square on one side and a dark one on the other tilts it by tens of grey levels,
    and a centroid of `constant - profile` then drifts toward the dark side. Fitting a line through
    the window's shoulders and keeping only what falls below it leaves the notch itself, which is
    what the grid is supposed to sit on. The centroid then runs over the connected run above half
    depth, so the shoulders contribute nothing at all.

    Be honest about what that second part bought: **nothing measurable**. On this corpus it reads
    4.49 px where the old constant-baseline centroid reads 4.45, and every other estimator tried
    (plain centroid, 3-point parabola, half-depth parabola) lands inside the same 0.15 px. It is
    here because it is the one that does not depend on the neighbouring squares' brightness, not
    because it won anything. The win in this module is the BANDS, not the estimator.
    """
    n = len(win)
    if n < 7:
        return None
    t = np.arange(n, dtype=np.float64)
    k = max(2, n // 4)
    a, b = np.polyfit(np.r_[t[:k], t[-k:]], np.r_[win[:k], win[-k:]], 1)
    resid = (a * t + b) - win
    j = int(np.argmax(resid))
    depth = float(resid[j])
    if depth < min_depth:
        return None
    above = resid > 0.5 * depth
    lo = hi = j
    while lo > max(0, j - csp) and above[lo - 1]:
        lo -= 1
    while hi < min(n - 1, j + csp) and above[hi + 1]:
        hi += 1
    seg = resid[lo:hi + 1] - 0.5 * depth
    total = float(seg.sum())
    if total <= 0.0 or len(seg) < 3:
        return None
    return lo + float((seg * np.arange(len(seg))).sum() / total), depth


def _profile_lines(prof: np.ndarray, cell: float, span: int, csp: int):
    """The 7 interior groove positions in one collapsed profile, NaN where none was found."""
    pos = np.full(9, np.nan)
    for k in range(1, 8):
        c = int(round(k * cell))
        lo, hi = max(0, c - span), min(len(prof), c + span + 1)
        win = prof[lo:hi]
        if win.size < 7:
            continue
        found = _notch_centre(win, csp)
        if found is not None and abs(lo + found[0] - k * cell) <= span:
            pos[k] = lo + found[0]
    return pos


def line_positions(warped, board_size: int) -> tuple[np.ndarray, np.ndarray]:
    """The board's REAL 9 line positions per axis, as `(xs, ys)` in rectified pixels.

    Index 0 and 8 are the playing-field edges, which the warp fixes at 0 and `board_size` by
    construction — they are not measured and cannot drift. An interior groove that cannot be told
    from its neighbourhood comes back as NaN, so a caller can see which boundary is a guess: pieces
    sit ON the grooves and legitimately hide some.

    This is the whole-board collapse, which is the most PRECISE estimate of where a line crosses
    the middle of the board and says nothing about its tilt. `line_geometry` adds the tilt.
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
        # leaves a profile with one notch per groove.
        pos = _profile_lines(g.mean(axis=axis).astype(np.float64), cell, span, csp)
        pos[0], pos[8] = 0.0, float(board_size)
        out.append(pos)
    return out[0], out[1]


def board_lattice(warped, board_size: int, bands: int = BANDS):
    """Band-wise groove samples as `(src, dst, axis)`, `(N, 2)` / `(N, 2)` / `(N,)`.

    `src` is where a groove was measured, `dst` where the nominal grid puts it, and `axis` is 0 for
    a sample that pins a VERTICAL line's x and 1 for a horizontal line's y — the other coordinate
    of such a sample is the band's centre and carries no information. Each interior line
    contributes one sample per band instead of one for the whole board, which is what makes a tilt
    visible at all.
    """
    import cv2

    g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY).astype(np.float32)
    cell = board_size / 8.0
    span = int(round(cell * SEARCH_FRAC))
    csp = max(2, int(round(cell * CENTROID_FRAC)))
    bh = board_size / bands
    src, dst, ax = [], [], []
    for axis in (0, 1):
        for bi in range(bands):
            s0, s1 = int(round(bi * bh)), int(round((bi + 1) * bh))
            sub = g[s0:s1, :] if axis == 0 else g[:, s0:s1]
            mid = (s0 + s1) / 2.0
            pos = _profile_lines(sub.mean(axis=axis).astype(np.float64), cell, span, csp)
            for k in range(1, 8):
                if np.isnan(pos[k]):
                    continue
                p, nom = float(pos[k]), k * cell
                src.append([p, mid] if axis == 0 else [mid, p])
                dst.append([nom, mid] if axis == 0 else [mid, nom])
                ax.append(axis)
    return (np.array(src, np.float64).reshape(-1, 2), np.array(dst, np.float64).reshape(-1, 2),
            np.array(ax, np.int8))


def line_geometry(warped, board_size: int, bands: int = BANDS):
    """`(xs, ys, sx, sy)`: line positions at the board's middle, and the TILT of each axis.

    The position comes from the whole-board collapse — the lowest-noise estimate there is — and
    only the tilt comes from the bands, so adding tilt awareness costs nothing in precision where
    the old measurement was already right.

    **One slope per axis, not one per line.** The tilt worth measuring is a rotation or shear of
    the whole grid, which every line of an axis shares; a per-line slope would additionally chase
    the board's own warp, and that warp is 0.75 px peak to peak on the reference board — far below
    the noise a 4-sample per-line regression carries. Pooling all lines of an axis divides the
    slope's noise by sqrt(7) and loses nothing real: on already-fine frames it takes the reported
    offset's median from 5.7 px back to 5.3 px, while a 0.6 deg shear still reads 4 px louder.

    The tilt it reports is real, not slope noise. Estimated twice per frame from two disjoint
    halves of the bands, the two answers correlate at +0.91: 3.9 mrad of genuine tilt (1.6 px at
    the board edge) against 0.9 mrad of estimator noise (0.3 px).
    """
    xs, ys = line_positions(warped, board_size)
    src, dst, ax = board_lattice(warped, board_size, bands)
    half = board_size / 2.0
    base = (xs, ys)
    slopes = [0.0, 0.0]
    cell = board_size / 8.0
    for axis in (0, 1):
        sel = ax == axis
        if int(sel.sum()) < 4:
            continue
        k = np.rint(dst[sel, axis] / cell).astype(int)
        mid = base[axis][k]
        good = np.isfinite(mid)
        if int(good.sum()) < 4:
            continue
        lever = src[sel, 1 - axis][good] - half
        resid = src[sel, axis][good] - mid[good]
        denom = float((lever * lever).sum())
        if denom <= 0.0:
            continue
        slopes[axis] = float((lever * resid).sum() / denom)
    return xs, ys, np.full(9, slopes[0]), np.full(9, slopes[1])


def square_offsets(warped, board_size: int) -> tuple[dict[str, float], int]:
    """`{square: offset px}` for every square whose four boundaries were measurable, plus the count
    of interior lines that could not be located.

    The offset is the largest displacement of any of the square's four edges from where the grid
    says it should be — the quantity that decides whether the crop cut at that cell contains the
    square or a slice of its neighbour. Each edge is evaluated WHERE IT PASSES THAT SQUARE, using
    the line's measured slope, so a grid that is rotated inside the warp no longer reads as
    perfectly aligned because its lines happen to cross the middle in the right place.
    """
    xs, ys, sx, sy = line_geometry(warped, board_size)
    cell = board_size / 8.0
    half = board_size / 2.0
    unread = int(np.isnan(xs[1:8]).sum() + np.isnan(ys[1:8]).sum())
    off: dict[str, float] = {}
    for f in range(8):
        for r in range(8):
            # Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
            cy, cx = (7.5 - r) * cell, (f + 0.5) * cell
            edges = (xs[f] + sx[f] * (cy - half), xs[f + 1] + sx[f + 1] * (cy - half),
                     ys[7 - r] + sy[7 - r] * (cx - half), ys[8 - r] + sy[8 - r] * (cx - half))
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


def _fit_affine(src, dst):
    """Huber-robust weighted affine fit `src -> dst`, as a 3x3 matrix, or None.

    **Affine, not a homography.** The quad being corrected is already nearly right, so the leftover
    error has no meaningful perspective component — but a homography fit will happily spend its two
    perspective parameters on measurement noise, and it did: fitting a homography instead costs
    1.2 px of accuracy on a perturbed quad (5.3 px against 4.0) for nothing.

    **Huber, not least squares.** Pieces sit ON the grooves and hide parts of them, so a handful of
    samples are simply wrong. Plain least squares lets each of them pull the whole board.
    """
    n = len(src)
    if n < 8:
        return None
    src = np.asarray(src, np.float64)
    dst = np.asarray(dst, np.float64)
    x, y = src[:, 0], src[:, 1]
    one, zero = np.ones(n), np.zeros(n)
    a = np.empty((2 * n, 6))
    a[0::2] = np.stack([x, y, one, zero, zero, zero], 1)
    a[1::2] = np.stack([zero, zero, zero, x, y, one], 1)
    b = dst.reshape(-1)
    w = np.ones(n)
    m = None
    for _ in range(5):
        sw = np.sqrt(np.repeat(np.clip(w, 1e-6, None), 2))
        sol, *_ = np.linalg.lstsq(a * sw[:, None], b * sw, rcond=None)
        m = np.array([[sol[0], sol[1], sol[2]], [sol[3], sol[4], sol[5]], [0.0, 0.0, 1.0]])
        r = np.linalg.norm(src @ m[:2, :2].T + m[:2, 2] - dst, axis=1)
        s = max(0.4, 1.4826 * float(np.median(r)))
        w = np.minimum(1.0, 1.5 * s / np.maximum(r, 1e-9))
    return m


def correct_quad(frame, quad, profile, iters: int = ITERS):
    """A corrected corner quad, or None when the frame gives too little to fit one.

    The measurement already says where the board's lines REALLY are, so the correction is the map
    that puts them where they belong: fit the measured lattice onto the nominal one, chain it onto
    the existing corner homography, and read the new corners back out in frame pixels.

        H_old : frame -> rectified (from the current quad)
        H_fix : rectified(measured) -> rectified(nominal)
        new   = H_old^-1 . H_fix^-1 . H_old . old

    That runs `iters` times, re-measuring in the corrected warp each round. It matters more than
    anything else here: a single pass leaves the answer depending on how wrong the input was,
    because a badly placed grid puts every groove near the edge of its search window where the
    measurement is worst. Iterated, a quad 9 px out and a quad already correct converge to the same
    place (3.7 px and 3.3 px from the human's quad, against 7.5 px and 2.4 px for a single pass).

    It is still only worth applying to a frame that is out of tolerance — inside the noise band the
    fit chases measurement noise. Callers decide that; this function just computes.
    """
    from .calibration import compute_homography, warp_from_corners

    bs = profile.board_size
    cur = [list(map(float, p)) for p in quad]
    for _ in range(max(1, iters)):
        src, dst, _ax = board_lattice(warp_from_corners(frame, profile, cur), bs)
        h_fix = _fit_affine(src, dst)
        if h_fix is None:
            return None
        h_old = np.array(compute_homography(cur, bs, profile.margin), np.float64)
        try:
            m = np.linalg.inv(h_old) @ np.linalg.inv(h_fix) @ h_old
        except np.linalg.LinAlgError:
            return None
        pts = np.hstack([np.asarray(cur, np.float64), np.ones((4, 1))]).T
        out = m @ pts
        if np.any(np.abs(out[2]) < 1e-9) or not np.all(np.isfinite(out)):
            return None
        cur = (out[:2] / out[2]).T.tolist()
    return cur


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
