"""Where the board's squares really sit in a rectified frame, and how to pull them onto the grid.

The lattice is measured band-wise (a whole-axis collapse averages tilt away), out to the edge in
a padded warp, and fitted projectively; approaches that lost: `docs/data-pipeline.md` §12-13.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass

import numpy as np

_measurements: ContextVar[dict | None] = ContextVar("grid_measurements", default=None)


@contextmanager
def reuse_grid_measurements():
    """Reuse identical geometry reads within one frame; release all arrays on exit."""
    token = _measurements.set({})
    try:
        yield
    finally:
        _measurements.reset(token)

#: How far either side of an expected INTERIOR line to look for the real one, as a fraction of a
#: cell. A quarter cell: beyond that the search locks onto the NEIGHBOURING groove and reports a
#: small offset for a board that is off by a whole square.
SEARCH_FRAC = 0.25

#: The same for the two OUTER lines, deliberately tighter: the printed rank/file border runs about a
#: third of a cell further out, and a wider window locks onto it.
OUTER_SEARCH_FRAC = 0.15

#: A groove must be this many grey levels below its local background to count as found. Below it
#: the minimum is noise, and a noisy line would invent a cell boundary that is not there.
MIN_DEPTH = 6.0

#: Cap on the half-width the groove's centroid is taken over, as a fraction of a cell. Grooves are
#: ~5.5 px of a 100 px cell; wider lets a long shallow shadow drag the centre out of the notch.
CENTROID_FRAC = 0.08

#: Bands per axis. 8 lets a per-line Huber fit drop the bands a piece stands in and keep the line; 4
#: is within 0.2 px on clean frames but loses lines on cluttered ones.
BANDS = 8

#: Band samples a line needs before it counts as located, after robust reweighting. Three is the
#: fewest a robust fit can be run on and still have one to reject.
MIN_BAND_SAMPLES = 3

#: Huber weight at or above which a sample counts as KEPT rather than outvoted.
WEIGHT_KEPT = 0.5

#: Iterations of measure-and-refit. The first pass removes most of the error, and re-measuring in
#: the corrected warp puts the grooves back inside their search windows.
ITERS = 4

#: Surround `warp_for_grid` keeps so the OUTER lines are measured, not assumed. Must exceed
#: `OUTER_SEARCH_FRAC` and stay under the ~0.33 cell where the label border begins.
GRID_PAD_CELLS = 0.25


def grid_pad_px(profile) -> int:
    """The surround `warp_for_grid` needs, in rectified pixels — compare against `board_border`."""
    return int(round(GRID_PAD_CELLS * profile.board_size / 8.0))

#: Search half-width per refit iteration. A three-marker quad starts a third of a cell out, outside
#: `SEARCH_FRAC`; later passes narrow so they stop chasing the neighbour.
SEARCH_SCHEDULE = (0.45, 0.30, 0.22, 0.18)

#: Displacement (fraction of a cell) under which the OUTER lines are searched without the window
#: reaching the label border.
OUTER_LOCK_FRAC = 0.5 * OUTER_SEARCH_FRAC

#: The gate: a square edge this far off, as a fraction of a cell, fails the frame. Damaging corpora
#: sat at 3.2-6.5 %, repaired sessions at most 3.3 %, so 4 % sits at the seam
#: (`docs/data-pipeline.md` §12).
MAX_OFFSET_FRAC = 0.04


def _notch_centre(win: np.ndarray, csp: int):
    """Sub-pixel centre of the groove notch in `win`, as `(offset, depth)`, or None.

    A dark run still going at both window ends is a piece leaning over the line, not a groove:
    unread. Centroid over a baseline-removed notch, not the `|Sobel|` peak, which flips sides
    with the light."""
    n = len(win)
    if n < 7:
        return None
    win = np.asarray(win, dtype=np.float64)
    t = np.arange(n, dtype=np.float64)
    k = max(2, n // 4)
    # Symmetric shoulders: the line fit is solved analytically instead of via a Vandermonde per
    # groove.
    centre = (n - 1) / 2.0
    left = t[:k] - centre
    slope = float(left @ (win[:k] - win[-k:][::-1])) / (2.0 * float(left @ left))
    mean = float(win[:k].sum() + win[-k:].sum()) / (2 * k)
    resid = (slope * (t - centre) + mean) - win
    j = int(np.argmax(resid))
    depth = float(resid[j])
    if depth < MIN_DEPTH:
        return None
    above = resid > 0.5 * depth
    lo = hi = j
    while lo > max(0, j - csp) and above[lo - 1]:
        lo -= 1
    while hi < min(n - 1, j + csp) and above[hi + 1]:
        hi += 1
    if above[max(0, lo - 1)] and above[min(n - 1, hi + 1)]:
        return None                     # still dark at both ends: an object, not a groove
    seg = resid[lo:hi + 1] - 0.5 * depth
    total = float(seg.sum())
    if total <= 0.0 or len(seg) < 3:
        return None
    return lo + float((seg * np.arange(len(seg))).sum() / total), depth


def _huber_lstsq(m: np.ndarray, y: np.ndarray, iters: int) -> tuple[np.ndarray, np.ndarray]:
    """`(solution, weights)` of `m @ x ≈ y`, Huber-reweighted from the MAD of the residual."""
    w = np.ones(len(y))
    sol = None
    for _ in range(iters):
        sw = np.sqrt(np.clip(w, 1e-6, None))
        sol, *_ = np.linalg.lstsq(m * sw[:, None], y * sw, rcond=None)
        r = np.abs(m @ sol - y)
        s = max(0.4, 1.4826 * float(np.median(r)))
        w = np.minimum(1.0, 1.5 * s / np.maximum(r, 1e-9))
    return sol, w


def _fit_axis(ks: np.ndarray, lever: np.ndarray, pos: np.ndarray, present: list[int],
              min_samples: int) -> dict[int, tuple[float, float]]:
    """One axis' nine lines from all band samples at once, as `{k: (slope, intercept)}`.

    The slope is POOLED over the axis (per-line fits are noisier than the tilt) and linear in
    `k`, so a residual homography's fanned-out pencil stays representable.
    """
    n = len(pos)
    cols = {k: 2 + i for i, k in enumerate(present)}
    m = np.zeros((n, 2 + len(present)))
    m[:, 0] = lever
    m[:, 1] = ks * lever
    m[np.arange(n), [cols[int(k)] for k in ks]] = 1.0
    sol, w = _huber_lstsq(m, pos, 5)
    out: dict[int, tuple[float, float]] = {}
    for k in present:
        # COUNTED at the Huber half-weight, not summed, as in `AxisFit.kt::WEIGHT_KEPT`: six samples
        # at 0.5 must not stand in for three clean ones.
        if int((w[ks == k] >= WEIGHT_KEPT).sum()) < min_samples:
            continue
        out[k] = (float(sol[0] + sol[1] * k), float(sol[cols[k]]))
    return out


def grid_lines(warped, board_size: int, *, pad: int = 0, bands: int = BANDS,
               search_frac: float = SEARCH_FRAC, outer: bool | None = None,
               outer_search_frac: float = OUTER_SEARCH_FRAC) -> list[list[tuple[float, float] | None]]:
    """The board's REAL 9 lines per axis as `[axis][k] = (slope, offset)`, or None where unfound.

    `axis` 0 is the vertical family; offsets are in `warped` coords, which carry `pad` px of
    surround, so index 0 and 8 land at `pad` and `pad + board_size`. Without pad the outer lines
    stay None."""
    samples = line_band_samples(warped, board_size, pad=pad, bands=bands, search_frac=search_frac,
                                outer=outer, outer_search_frac=outer_search_frac)
    return _fit_families(samples, board_size, pad)


def line_band_samples(warped, board_size: int, *, pad: int = 0, bands: int = BANDS,
                      search_frac: float = SEARCH_FRAC, outer: bool | None = None,
                      outer_search_frac: float = OUTER_SEARCH_FRAC):
    """Read bands once when the export asks twice about the same rectified frame."""
    cache = _measurements.get()
    key = ("samples", id(warped), board_size, pad, bands, search_frac, outer, outer_search_frac)
    if cache is not None and key in cache:
        return cache[key][1]
    result = _line_band_samples(warped, board_size, pad=pad, bands=bands,
                                search_frac=search_frac, outer=outer,
                                outer_search_frac=outer_search_frac)
    if cache is not None:
        cache[key] = (warped, result)
    return result


def _line_band_samples(warped, board_size: int, *, pad: int = 0, bands: int = BANDS,
                       search_frac: float = SEARCH_FRAC, outer: bool | None = None,
                       outer_search_frac: float = OUTER_SEARCH_FRAC):
    """The raw band measurements `[axis][k] = [(mid, pos), ...]` that `grid_lines` fits over."""
    import cv2

    if outer is None:
        outer = pad > 0
    g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    cell = board_size / 8.0
    csp = max(2, int(round(cell * CENTROID_FRAC)))
    n_side = g.shape[0]
    bh = board_size / bands
    ks = range(0, 9) if outer else range(1, 8)
    samples: list[list[list[tuple[float, float]]]] = [[[] for _ in range(9)] for _ in range(2)]
    for axis in (0, 1):
        for bi in range(bands):
            s0 = int(round(pad + bi * bh))
            s1 = int(round(pad + (bi + 1) * bh))
            sub = g[s0:s1, :] if axis == 0 else g[:, s0:s1]
            if sub.size == 0:
                continue
            # MEDIAN down the band, not mean: a piece in part of the band would otherwise leak into
            # the profile.
            prof = np.median(sub, axis=axis).astype(np.float64)
            mid = (s0 + s1) / 2.0
            for k in ks:
                frac = outer_search_frac if k in (0, 8) else search_frac
                span = max(4, int(round(cell * frac)))
                c = pad + k * cell
                lo, hi = max(0, int(round(c)) - span), min(n_side, int(round(c)) + span + 1)
                win = prof[lo:hi]
                if win.size < 7:
                    continue
                found = _notch_centre(win, csp)
                if found is None:
                    continue
                p = lo + found[0]
                if abs(p - c) <= span:
                    samples[axis][k].append((mid, p))
    return samples


def _fit_families(samples, board_size: int, pad: int) -> list[list[tuple[float, float] | None]]:
    centre = pad + board_size / 2.0
    out: list[list[tuple[float, float] | None]] = [[None] * 9 for _ in range(2)]
    for axis in (0, 1):
        present = [k for k in range(9) if len(samples[axis][k]) >= MIN_BAND_SAMPLES]
        if not present:
            continue
        ks = np.array([k for k in present for _ in samples[axis][k]], np.float64)
        lev = np.array([v[0] for k in present for v in samples[axis][k]]) - centre
        pos = np.array([v[1] for k in present for v in samples[axis][k]])
        for k, fit in _fit_axis(ks, lev, pos, present, MIN_BAND_SAMPLES).items():
            out[axis][k] = fit
    return out


#: Band samples a line needs before its curvature is fitted: two coefficients from a robust fit
#: want a couple of degrees of freedom, or the "bow" is a piece's shadow.
MIN_CURV_SAMPLES = 5


def _quad_coeffs(u: np.ndarray, r: np.ndarray) -> tuple[float, float]:
    """Huber-refit `(d, c)` of `r ≈ d + c·u²` — the parabola the linear fit left in its residual."""
    sol, _ = _huber_lstsq(np.stack([np.ones_like(u), u * u], 1), r, 3)
    return float(sol[0]), float(sol[1])


def grid_lines_with_curvature(warped, board_size: int, *, pad: int = 0, **kw):
    """`(lines, curls)` — `grid_lines`' answer plus per line `(d, c)` in warped px, or None.

    `pos(u) = offset + d + slope·u·bs + c·u²`: `c` is the bow the pooled linear fit cannot carry.
    """
    samples = line_band_samples(warped, board_size, pad=pad, **kw)
    lines = _fit_families(samples, board_size, pad)
    centre = pad + board_size / 2.0
    curls: list[list[tuple[float, float] | None]] = [[None] * 9 for _ in range(2)]
    for axis in (0, 1):
        for k in range(9):
            line, pts = lines[axis][k], samples[axis][k]
            if line is None or len(pts) < MIN_CURV_SAMPLES:
                continue
            mid = np.array([m for m, _ in pts])
            u = (mid - centre) / board_size
            r = np.array([p for _, p in pts]) - (line[0] * (mid - centre) + line[1])
            curls[axis][k] = _quad_coeffs(u, r)
    return lines, curls


def warp_for_grid(frame, profile, quad, lens=None):
    """`(warped, pad)` — the rectified board plus `GRID_PAD_CELLS` of what surrounds it.

    NOT `warp_board_for_crops`' border, which is narrower (12 against 29 px at 928), so the board
    store cannot feed this. `lens`: measure through the optics the store is warped with.
    """
    from .calibration import warp_padded

    pad = grid_pad_px(profile)
    cache = _measurements.get()
    key = ("warp", id(frame), id(profile), tuple(float(v) for p in quad for v in p), id(lens))
    if cache is not None and key in cache:
        return cache[key]
    result = warp_padded(frame, profile, quad, pad, lens=lens), pad
    if cache is not None:
        cache[key] = result
    return result


def square_offsets(warped, board_size: int, pad: int = 0,
                   **kw) -> tuple[dict[str, float], int]:
    """`{square: offset px}` for every square whose four edges were measurable, plus the unread
    count.

    Each edge is evaluated where it passes that square, using its slope, so a rotated grid cannot
    read as aligned. `unread` counts out of 18 with pad, 14 without."""
    lines = grid_lines(warped, board_size, pad=pad, **kw)
    cell = board_size / 8.0
    centre = pad + board_size / 2.0
    unread = sum(1 for ax in lines for f in ax if f is None)

    def at(axis: int, k: int, coord: float) -> float:
        """Where line `k` of `axis` crosses `coord`, in playing-field coordinates (pad removed)."""
        line = lines[axis][k]
        return float("nan") if line is None else line[0] * (coord - centre) + line[1] - pad

    off: dict[str, float] = {}
    for f in range(8):
        for r in range(8):
            # Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
            cy, cx = pad + (7.5 - r) * cell, pad + (f + 0.5) * cell
            edges = (at(0, f, cy), at(0, f + 1, cy), at(1, 7 - r, cx), at(1, 8 - r, cx))
            want = (f * cell, (f + 1) * cell, (7 - r) * cell, (8 - r) * cell)
            if any(np.isnan(e) for e in edges):
                continue
            off[f"{chr(97 + f)}{r + 1}"] = max(abs(e - w) for e, w in zip(edges, want, strict=True))
    return off, unread


def frame_offsets(frame, quad, profile) -> tuple[dict[str, float], int]:
    """`square_offsets` for a RAW frame and its corner quad, measured out to the board's edge."""
    warped, pad = warp_for_grid(frame, profile, quad)
    return square_offsets(warped, profile.board_size, pad)


def worst_offset(frame, quad, profile) -> float:
    """The largest square offset in this frame, or NaN when nothing was measurable."""
    off, _ = frame_offsets(frame, quad, profile)
    return max(off.values()) if off else float("nan")


@dataclass(frozen=True)
class Alignment:
    """The verdict on one quad: `ok` to branch on, `worst` and `unread` to report.

    `unread` is part of the verdict: a frame whose outer lines were not found was not measured
    there.
    """

    ok: bool
    worst: float
    unread: int
    limit: float
    reason: str

    def __str__(self) -> str:
        return (f"{'OK' if self.ok else 'FAIL'} worst {self.worst:.2f} px / limit "
                f"{self.limit:.2f}, {self.unread} line(s) unread — {self.reason}")


def alignment_of(frame, quad, profile, *, max_frac: float = MAX_OFFSET_FRAC) -> Alignment:
    """Measure `quad` against the board's own grid and say pass or fail.

    Absolute, never against other frames: quad spread against the median of the same quads scored
    a consistently wrong quad as precise.
    """
    limit = max_frac * profile.board_size / 8.0
    off, unread = frame_offsets(frame, quad, profile)
    if not off:
        return Alignment(False, float("nan"), unread, limit,
                         "no square could be measured — is the board in the warp at all?")
    worst = max(off.values())
    if unread:
        return Alignment(False, worst, unread, limit,
                         f"{unread} of 18 grid lines could not be located; the frame is not "
                         f"measured where they are missing")
    if worst > limit:
        bad = sum(1 for v in off.values() if v > limit)
        return Alignment(False, worst, unread, limit,
                         f"{bad} of 64 squares are cut off their grid, worst {worst:.1f} px of a "
                         f"{profile.board_size / 8:.0f} px cell")
    return Alignment(True, worst, unread, limit, "every square edge is on its groove")


def _fit_projective(src, dst):
    """Huber-robust homography fit `src -> dst`, as a 3x3 matrix, or None.

    Projective, because a three-marker quad is an affine parallelogram and its error projective.
    IRLS, not RANSAC: `cv2.findHomography(..., RANSAC)` draws from a shared RNG and is not
    deterministic."""
    n = len(src)
    if n < 8:
        return None
    src = np.asarray(src, np.float64)
    dst = np.asarray(dst, np.float64)
    # Hartley normalisation: the lattice lives at 0..board_size, so the raw DLT matrix has columns
    # differing by six orders of magnitude and its smallest singular vector is numerical noise.
    ns, ts = _normalise(src)
    nd, td = _normalise(dst)
    w = np.ones(n)
    h = None
    for _ in range(5):
        a = np.zeros((2 * n, 9))
        x, y = ns[:, 0], ns[:, 1]
        u, v = nd[:, 0], nd[:, 1]
        sw = np.repeat(np.sqrt(np.clip(w, 1e-6, None)), 2)
        a[0::2, 0:3] = np.stack([x, y, np.ones(n)], 1)
        a[0::2, 6:9] = np.stack([-u * x, -u * y, -u], 1)
        a[1::2, 3:6] = np.stack([x, y, np.ones(n)], 1)
        a[1::2, 6:9] = np.stack([-v * x, -v * y, -v], 1)
        _u, _s, vt = np.linalg.svd(a * sw[:, None], full_matrices=False)
        h = vt[-1].reshape(3, 3)
        if abs(h[2, 2]) < 1e-12:
            return None
        p = h @ np.vstack([ns.T, np.ones(n)])
        if np.any(np.abs(p[2]) < 1e-9):
            return None
        r = np.linalg.norm((p[:2] / p[2]).T - nd, axis=1)
        s = max(1e-6, 1.4826 * float(np.median(r)))
        w = np.minimum(1.0, 1.5 * s / np.maximum(r, 1e-12))
    m = np.linalg.inv(td) @ h @ ts
    return m / m[2, 2] if abs(m[2, 2]) > 1e-12 else None


def _normalise(p):
    """Hartley normalisation: centroid at the origin, mean distance sqrt(2)."""
    c = p.mean(axis=0)
    d = float(np.mean(np.linalg.norm(p - c, axis=1)))
    s = np.sqrt(2.0) / d if d > 1e-9 else 1.0
    t = np.array([[s, 0.0, -s * c[0]], [0.0, s, -s * c[1]], [0.0, 0.0, 1.0]])
    return (p - c) * s, t


def _lattice(lines, board_size: int, pad: int):
    """`(src, dst)` — the measured line intersections and where the nominal grid puts them.

    Real 2D correspondences: one-coordinate band samples cannot constrain a homography.
    """
    cell = board_size / 8.0
    centre = pad + board_size / 2.0
    src, dst = [], []
    for i in range(9):
        lv = lines[0][i]
        if lv is None:
            continue
        ai, bi = lv
        for j in range(9):
            lh = lines[1][j]
            if lh is None:
                continue
            aj, bj = lh
            den = 1.0 - ai * aj
            if abs(den) < 1e-9:
                continue
            x = (ai * (bj - centre - aj * centre) + bi) / den
            y = aj * (x - centre) + bj
            src.append([x - pad, y - pad])
            dst.append([i * cell, j * cell])
    return np.array(src, np.float64).reshape(-1, 2), np.array(dst, np.float64).reshape(-1, 2)


def correct_quad(frame, quad, profile, iters: int = ITERS):
    """A corrected corner quad, or None when the frame gives too little to fit one.

        new = H_old^-1 . H_fix^-1 . H_old . old
    Iterated coarse to fine along `SEARCH_SCHEDULE`, outer lines last; only worth it out of
    tolerance."""
    import cv2

    from .calibration import compute_homography

    bs = profile.board_size
    cell = bs / 8.0
    pad = int(round(GRID_PAD_CELLS * cell))
    t = np.array([[1.0, 0.0, pad], [0.0, 1.0, pad], [0.0, 0.0, 1.0]])
    cur = [list(map(float, p)) for p in quad]
    outer = False
    for i in range(max(1, iters)):
        h_old = np.array(compute_homography(cur, bs, profile.margin), np.float64)
        warped = cv2.warpPerspective(frame, t @ h_old, (bs + 2 * pad, bs + 2 * pad))
        lines = grid_lines(warped, bs, pad=pad,
                           search_frac=SEARCH_SCHEDULE[min(i, len(SEARCH_SCHEDULE) - 1)],
                           outer=outer)
        src, dst = _lattice(lines, bs, pad)
        h_fix = _fit_projective(src, dst)
        if h_fix is None:
            return None
        outer = bool(len(src)) and float(np.abs(src - dst).max()) < OUTER_LOCK_FRAC * cell
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


def refine_quad(frame, quad, profile):
    """`(best quad, verdict)` — the coarse-to-fine staging in one call.

    `quad` may be tens of px off; it only has to bring the grooves into the first search window.
    A failed fit keeps the coarse quad, and the verdict describes the quad that comes back.
    """
    fixed = correct_quad(frame, quad, profile)
    best = quad if fixed is None else fixed
    return best, alignment_of(frame, best, profile)


def improve_quad(frame, quad, profile) -> tuple[list | None, float, float]:
    """`(corrected quad or None, offset before, offset after)`; None also when the fit did not
    improve.
    """
    before = worst_offset(frame, quad, profile)
    fixed = correct_quad(frame, quad, profile)
    if fixed is None:
        return None, before, float("nan")
    after = worst_offset(frame, fixed, profile)
    if not np.isfinite(after) or not np.isfinite(before) or after >= before:
        return None, before, after
    return fixed, before, after
