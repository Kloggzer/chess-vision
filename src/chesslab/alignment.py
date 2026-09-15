"""Where the board's squares REALLY sit in a rectified frame, and how to pull them onto the grid.

A warp can be wrong without anything failing: `board_corners_for_frame` returns a quad, `slice`
produces 64 crops, and every count in the pipeline looks healthy while the grid sits a few degrees
off and every crop straddles two squares. That happened on 2026-07-31 — the `MarkerTracker`'s dead
zone and EMA lag differently per marker while the board rotates, so the quad came out sheared, and
only the calibration-pose frame rectified correctly. Nothing noticed.

On the RECTIFIED board the 9 lines per axis must sit at multiples of `board_size / 8`. Locating
them gives the board's real grid; intersecting them gives 81 measured lattice points whose nominal
positions are known exactly; fitting those onto the nominal ones gives a corrected quad.

Measuring inside the warp is deliberate. Measuring corner residuals on the raw frame instead drowns
in barrel distortion (6 px of baseline noise) and saturates at the corner-refinement window, so a
40 px corner error moves the number less than the noise does.

**The lattice is measured BAND-WISE.** Collapsing the whole board along an axis measures a line's
position with excellent precision and averages its TILT away completely, so a rotation or shear of
the grid inside the warp used to be invisible — and uncorrectable. Collapsing one band at a time
gives several samples per line instead of one, at sqrt(bands) worse noise each, which the fit
averages straight back out. The tilt survives. Measured on session 20260731-102458 against the 14
frames a human corrected by hand, that plus a Huber-robust iterated fit takes the distance to the
human's quad from 8.7 px to 5.1 px. `docs/data-pipeline.md` §13 lists every approach that lost, with its number.

**The lines are measured OUT TO THE EDGE, in a padded warp.** Until 2026-08-03 index 0 and 8 were
pinned at 0 and `board_size` — the values the warp puts there by construction — which made a
uniform SCALE error read 25 % short and, worse, made the metric partly a statement about its own
assumption. `warp_for_grid` keeps `GRID_PAD_CELLS` of surrounding board, so the playing-field
boundary is measured like every other line, and a line that cannot be found is reported as unread
rather than assumed. The pinned ruler's numbers are not comparable — `docs/data-pipeline.md` §12.

**The fit is PROJECTIVE.** That is the single change that made a three-marker quad usable: such a
quad is `cv2.getAffineTransform`'s parallelogram standing in for a perspective view of a plane, so
its error is projective by construction and no affine correction can remove it. Measured
2026-08-03 on `VID_20260802_222741.mp4`, six frames, worst square offset in rectified px: input
17.1-29.5, affine correction 6.8-17.8, projective correction **1.6-3.1**.
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

#: The same for the two OUTER lines, and it is deliberately tighter. The reference board carries a
#: printed rank/file border outside the playing field whose own boundary runs about a third of a
#: cell further out (measured on `VID_20260802_222741.mp4` frame 0: playing-field edge and label
#: edge 33 px apart on a 100 px cell). A window that reaches it locks onto the wrong line and
#: reports a small offset for a board scaled wrong by half a square.
OUTER_SEARCH_FRAC = 0.15

#: A groove must be this many grey levels below its local background to count as found. Below it
#: the minimum is noise, and a noisy line would invent a cell boundary that is not there.
MIN_DEPTH = 6.0

#: Cap on the half-width the groove's centroid is taken over, as a fraction of a cell. The grooves
#: on the reference board are 2 mm ≈ 5.5 px of a 100 px cell, so ±8 px spans about one and a half
#: grooves: wide enough to hold the whole band, narrow enough that a long shallow shadow cannot
#: drag the centre of mass out of the notch.
CENTROID_FRAC = 0.08

#: How many bands per axis the lattice is measured in. 1 reproduces the old tilt-blind collapse.
#: 8 gives each of the 18 lines eight samples, which is what lets a per-line Huber fit throw away
#: the bands a piece is standing in and still have a line left; 4 was the previous value and is
#: measured within 0.2 px of it on clean frames but loses lines on cluttered ones.
BANDS = 8

#: Band samples a line needs before it counts as located, after robust reweighting. Three is the
#: fewest a robust fit can be run on and still have one to reject.
MIN_BAND_SAMPLES = 3

#: Huber weight at or above which a sample counts as KEPT rather than outvoted.
WEIGHT_KEPT = 0.5

#: Iterations of measure-and-refit. The first pass removes most of the error, and re-measuring in
#: the corrected warp puts the grooves back inside their search windows.
ITERS = 4

#: Cells of surrounding board `warp_for_grid` keeps beyond the playing field, so the two OUTER
#: lines per axis are measured rather than assumed. It has to exceed `OUTER_SEARCH_FRAC` (the
#: window must fit) and stay under the ~0.33 cell at which the reference board's label border
#: begins.
GRID_PAD_CELLS = 0.25


def grid_pad_px(profile) -> int:
    """The surround `warp_for_grid` needs, in rectified pixels — compare against `board_border`."""
    return int(round(GRID_PAD_CELLS * profile.board_size / 8.0))

#: Search half-width per refit iteration, as a fraction of a cell. A three-marker quad starts a
#: third of a cell out, which is outside `SEARCH_FRAC` at the worst squares — the first pass has
#: to be able to reach the groove at all, and later passes have to stop chasing the neighbour.
SEARCH_SCHEDULE = (0.45, 0.30, 0.22, 0.18)

#: Below this measured displacement (fraction of a cell) the quad is close enough that the OUTER
#: lines can be searched without the window reaching the label border. Half of `OUTER_SEARCH_FRAC`,
#: so the line is still comfortably inside its window when it is looked for.
OUTER_LOCK_FRAC = 0.5 * OUTER_SEARCH_FRAC

#: The gate. A square edge this far from where the quad says it is, as a fraction of a cell,
#: fails the frame.
#:
#: Argued from `docs/data-pipeline.md` §12 and not invented. The corpus that cost this project 5.5x
#: its empty-crop margin sat at 3.2-6.5 px median square-edge offset on a 100 px cell, i.e. 3.2-6.5
#: %; re-fitting it brought every session to 2.0-3.3 % median, max 4.3 %, and moved the champion
#: from 1 phantom / margin 0.316 to 0 / 0.050. So 3.2 % is the lowest error measured as damaging
#: and 3.3 % is the highest a repaired session carries — the two bands touch, and a gate has to sit
#: at the seam. 4 % is just above both, expressed as a FRACTION of a cell so it means the same
#: thing on the rig (cell 100) and on Android (cell up to 200).
MAX_OFFSET_FRAC = 0.04


def _notch_centre(win: np.ndarray, csp: int):
    """Sub-pixel centre of the groove notch in `win`, as `(offset, depth)`, or None.

    **A groove is NARROW, and that is what tells it from a piece.** The dark run above half depth
    has to end inside the centroid window; when it is still going at both ends the window is sitting
    on something wide and dark — the silhouette of a piece leaning over the line, which is what a
    3D piece does to the groove behind it. Accepting those cost 16.3 px on frame 900 of
    `VID_20260802_222741.mp4`, where ranks 7 and 8 are a solid row of black pieces and every band
    of the line between them reported the pieces instead: the fitted line came out tilted by
    36 mrad and the metric failed a quad that was in fact correct. Reporting the line as UNREAD is
    the honest answer; a caller can see it and refuse the frame.

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

    That local baseline is also the whole answer to this board's illumination gradient: the h-file
    side reads ~6x the a-file side in the same frame (per-square mean luma 25 to 168, measured
    2026-08-03), and a global threshold cannot serve both. A window a third of a cell wide sees
    none of that spread, so CLAHE in front of it changes the located lines by less than the noise —
    measured, and rejected for that reason rather than on principle.
    """
    n = len(win)
    if n < 7:
        return None
    win = np.asarray(win, dtype=np.float64)
    t = np.arange(n, dtype=np.float64)
    k = max(2, n // 4)
    # The shoulders are symmetric around the window centre. Solve the same linear
    # least squares analytically instead of constructing and factoring a Vandermonde
    # matrix for every groove. Centring also avoids subtracting a large intercept.
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


def _fit_axis(ks: np.ndarray, lever: np.ndarray, pos: np.ndarray, present: list[int],
              min_samples: int) -> dict[int, tuple[float, float]]:
    """One axis' nine lines from all its band samples at once, as `{k: (slope, intercept)}`.

    **The slope is POOLED over the axis, the intercept is per line.** A per-line regression over
    eight bands carries more noise than the tilt it is measuring — the board's own warp is 0.75 px
    peak to peak on the reference board — and a line whose bands are half hidden by a row of pieces
    comes back tilted by tens of milliradians. Pooling divides that noise by sqrt(9) and loses
    nothing real.

    The pooled slope is `a + b * k`, LINEAR in the line index, not one constant. A residual
    homography maps a family of parallel lines to a pencil, so their directions fan out across the
    board; a single constant cannot represent that and would leave the projective component of the
    error unmeasurable — which is the component a three-marker quad's error consists of. Two
    parameters over ~70 samples is still an order of magnitude more constrained than nine.
    """
    n = len(pos)
    cols = {k: 2 + i for i, k in enumerate(present)}
    m = np.zeros((n, 2 + len(present)))
    m[:, 0] = lever
    m[:, 1] = ks * lever
    m[np.arange(n), [cols[int(k)] for k in ks]] = 1.0
    w = np.ones(n)
    sol = None
    for _ in range(5):
        sw = np.sqrt(np.clip(w, 1e-6, None))
        sol, *_ = np.linalg.lstsq(m * sw[:, None], pos * sw, rcond=None)
        r = np.abs(m @ sol - pos)
        s = max(0.4, 1.4826 * float(np.median(r)))
        w = np.minimum(1.0, 1.5 * s / np.maximum(r, 1e-9))
    out: dict[int, tuple[float, float]] = {}
    for k in present:
        # A line whose samples were all downweighted has not been measured, it has been outvoted.
        # COUNTED at the Huber half-weight, not summed: the Kotlin port does the same
        # (`AxisFit.kt::WEIGHT_KEPT`), and summing fractional weights would let six samples at 0.5
        # stand in for three clean ones.
        if int((w[ks == k] >= WEIGHT_KEPT).sum()) < min_samples:
            continue
        out[k] = (float(sol[0] + sol[1] * k), float(sol[cols[k]]))
    return out


def grid_lines(warped, board_size: int, *, pad: int = 0, bands: int = BANDS,
               search_frac: float = SEARCH_FRAC, outer: bool | None = None,
               outer_search_frac: float = OUTER_SEARCH_FRAC) -> list[list[tuple[float, float] | None]]:
    """The board's REAL 9 lines per axis as `[axis][k] = (slope, offset)`, or None where unfound.

    `axis` 0 is the family of VERTICAL lines (each pins an x), 1 the horizontal ones. `offset` is
    the line's position at the board's centre and `slope` its tilt there, both in the coordinates
    of `warped` — which carries `pad` pixels of surrounding board on every side, so index 0 and 8
    land at `pad` and `pad + board_size`.

    A line that cannot be told from its neighbourhood comes back as None, so a caller can see which
    boundary is a guess: pieces sit ON the grooves and legitimately hide some. **Nothing here is
    assumed.** The previous version pinned index 0 and 8 to the values the warp puts there by
    construction, which is why a uniform scale error read 25 % short.

    `outer` defaults to `pad > 0`: without surrounding board there is no window to search the
    outermost lines in, and inventing them is exactly the habit this function was rewritten to
    drop.
    """
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
            # MEDIAN down the band, not mean: a piece occupying part of the band contributes an
            # outlier to every column it covers, and a mean carries it into the profile the notch
            # is looked for in. Measured within 0.1 px of the mean on clean frames and worth a
            # line or two on cluttered ones.
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
        # Three samples is the fewest a robust fit can be run on and still have one to reject;
        # below it the "line" is a pair of points through a piece's shadow.
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
    m = np.stack([np.ones_like(u), u * u], 1)
    w = np.ones(len(u))
    sol = None
    for _ in range(3):
        sw = np.sqrt(np.clip(w, 1e-6, None))
        sol, *_ = np.linalg.lstsq(m * sw[:, None], r * sw, rcond=None)
        e = np.abs(m @ sol - r)
        s = max(0.4, 1.4826 * float(np.median(e)))
        w = np.minimum(1.0, 1.5 * s / np.maximum(e, 1e-9))
    return float(sol[0]), float(sol[1])


def grid_lines_with_curvature(warped, board_size: int, *, pad: int = 0, **kw):
    """`(lines, curls)` — `grid_lines`' answer plus per line `(d, c)` in warped px, or None.

    `pos(u) = offset + d + slope·u·bs + c·u²` with `u` the run along the line as a fraction about
    the centre: `c` is the bow the pooled LINEAR fit cannot carry, `d` re-centres the offset for
    it. Same samples, same robust weighting — no second measurement pass.
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

    The pad is what makes the two outer lines per axis measurable instead of assumed, and it is
    NOT `warp_board_for_crops`' border: that one is sized for the crop pads and is NARROWER (12 px
    against this 29 at board_size=928), which is why the board store cannot feed this measurement.

    `lens`: measure THROUGH the optics the store will be warped with, or the mesh describes a board
    that no longer exists.
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
    """`{square: offset px}` for every square whose four boundaries were measurable, plus the count
    of grid lines that could not be located.

    The offset is the largest displacement of any of the square's four edges from where the grid
    says it should be — the quantity that decides whether the crop cut at that cell contains the
    square or a slice of its neighbour. Each edge is evaluated WHERE IT PASSES THAT SQUARE, using
    the line's measured slope, so a grid that is rotated inside the warp no longer reads as
    perfectly aligned because its lines happen to cross the middle in the right place.

    `unread` counts out of 18 when `pad > 0` and out of 14 when it is 0 — without surrounding board
    the outer lines are not measurable, and they are reported missing rather than assumed perfect.
    """
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
    """The verdict on one quad, and the numbers behind it.

    A verdict and not a number, because every path that produces a quad has to be able to act on
    it: `ok` is what a caller branches on, `worst` and `unread` are what a caller reports. `unread`
    is part of the verdict, not a footnote — a frame whose outer lines could not be found has not
    been measured at its edges, and calling that a pass is how the pinned metric certified 302 bad
    frames in 2026-07.
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

    Absolute, never self-referential. Quad SPREAD (`quadSpreadPx` in `GeometryScan.kt`, and the
    deleted `label_real_game.quad_spread` before it) compares each frame's quad against the MEDIAN
    OF THE SAME QUADS, so a consistently wrong quad scores p90 0.93 rectified px and 99.9 %
    "detected" — precision reported as accuracy, and it hid a 27-33 px error for a day.
    Nothing here looks at any other frame.
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

    **Projective, not affine.** The module fitted an affine transform until 2026-08-03, on the
    reasoning that a quad already nearly right has no meaningful perspective error left. That is
    true of a four-marker quad and false of a three-marker one: `resolve_board_corners` degrades to
    `cv2.getAffineTransform` at three markers, a PARALLELOGRAM standing in for a perspective view
    of a plane, so the residual is projective by construction. Measured on the six frames of
    `VID_20260802_222741.mp4`, worst square offset after correction: affine 6.8-17.8 px,
    projective 1.6-3.1 px. On already-aligned real sessions the two land within 0.3 px of each
    other, so nothing was traded for it.

    **Huber, not least squares.** Pieces sit ON the grooves and hide parts of them, so a handful of
    samples are simply wrong. Plain least squares lets each of them pull the whole board.

    **IRLS, not RANSAC.** `cv2.findHomography(..., RANSAC)` draws from a shared RNG, so two runs
    over the same frame can return different quads; this project's determinism rule (one `--seed`,
    reproducible slicing) does not survive that, and the outlier rate here is low enough that
    reweighting reaches the same answer without it.
    """
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

    Two dimensions, not two collapsed profiles. The previous version fitted over samples that each
    pinned ONE coordinate and carried the band's centre in the other, which is enough to constrain
    an affine map and not enough to constrain a homography — a fit over those came out WORSE than
    its own input on one frame (31.7 px; `docs/data-pipeline.md` §13). Intersecting the fitted lines gives
    real 2D correspondences, up to 81 of them, and the perspective parameters then have something
    to be estimated from.
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

    The measurement already says where the board's lines REALLY are, so the correction is the map
    that puts them where they belong: fit the measured lattice onto the nominal one, chain it onto
    the existing corner homography, and read the new corners back out in frame pixels.

        H_old : frame -> rectified (from the current quad)
        H_fix : rectified(measured) -> rectified(nominal)
        new   = H_old^-1 . H_fix^-1 . H_old . old

    That runs `iters` times, re-measuring in the corrected warp each round. It matters more than
    anything else here: a single pass leaves the answer depending on how wrong the input was,
    because a badly placed grid puts every groove near the edge of its search window where the
    measurement is worst.

    **Coarse to fine, and the outer lines last.** The search window follows `SEARCH_SCHEDULE`,
    starting at 0.45 of a cell because a three-marker quad is a third of a cell out at its worst
    squares — outside `SEARCH_FRAC`, where the first pass would simply not find the groove — and
    narrowing to 0.18 so the last passes cannot drift onto a neighbour. The two OUTER lines join
    only once the measured displacement is under `OUTER_LOCK_FRAC` of a cell, because their window
    has to stay clear of the board's printed label border a third of a cell further out.

    It is still only worth applying to a frame that is out of tolerance — inside the noise band the
    fit chases measurement noise. Callers decide that; this function just computes.
    """
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
    """`(best quad, verdict)` — the COARSE-to-FINE staging, in one call.

    `quad` is whatever located the board at all: an ArUco quad from two, three or four markers, the
    previous frame's answer, or a stored profile. It is explicitly allowed to be tens of pixels
    wrong — the whole-video median for a three-marker quad is ~30 px of a 100 px cell — because
    all it has to do is bring the grooves inside the first search window. The grid fit supplies the
    accuracy, including the perspective the coarse stage could not have.

    The verdict describes the quad that comes BACK. A fit that failed leaves the coarse quad in
    place and says so through the verdict, so a caller never has to guess which stage answered.
    """
    fixed = correct_quad(frame, quad, profile)
    best = quad if fixed is None else fixed
    return best, alignment_of(frame, best, profile)


#: A pose has moved, and its grid correction expired, past this mean per-corner distance in CELLS.
#: The Android side acts on a quarter cell (`QuadDriftTest`); the Python side matches it so a clip
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
