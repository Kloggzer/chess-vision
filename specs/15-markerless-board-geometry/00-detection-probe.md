# Phase 00 — Markerless saddle/SB detector + visual probe (risk gate)

## Why

The whole pack rests on being able to detect the board **cold** on a real frame often
enough that tracking can carry the rest. Pure geometry is known-fragile under
occlusion/angle. Before building the engine, implement the strongest cheap detector
(`findChessboardCornersSB`, which explicitly supports partially visible/populated boards
via `CALIB_CB_MARKER|CALIB_CB_LARGER`) plus a saddle-point fallback, and **measure the
hit-rate** against the existing line detector and ArUco on real frames. The measured
numbers decide the detector priority the engine (phase 01) uses.

## Design (decided — do not redesign)

New module `src/chesslab/board_geometry.py`. This phase adds ONLY the cold detectors +
a probe script; the engine class comes in phase 01 (same file).

### 1. `board_corners_from_saddles(frame, prior=None) -> list[list[float]] | None`

```python
def board_corners_from_saddles(frame, prior=None):
    """Markerless 4-corner detection via the checkerboard's inner-corner lattice.
    `prior`: optional [a8,h8,h1,a1] from the previous frame to disambiguate/guide (unused
    by SB, used by the saddle-RANSAC fallback). Returns [a8,h8,h1,a1] in FRAME px or None.
    Orientation is NOT resolved here (geometric order only) — phase 02 owns a8 mapping."""
```

Primary path — `cv2.findChessboardCornersSB`:
- grayscale; `flags = cv2.CALIB_CB_NORMALIZE_IMAGE | cv2.CALIB_CB_MARKER | cv2.CALIB_CB_LARGER`
  (MARKER|LARGER = tolerate partial boards / extra border, the populated-board case).
- pattern size `(7, 7)` — the **inner** corners of an 8×8 board.
- On success returns 49 inner corners (7×7). Reshape to a `(7,7,2)` grid ordered by SB, then
  **extrapolate the 4 OUTER corners** of the 9×9 lattice: for each board edge, linearly
  extend the inner-corner spacing by one cell outward (corner = `2*inner_edge - inner_next`),
  i.e. `outer_TL = grid[0,0] + (grid[0,0]-grid[1,1])`. Compute all four 9×9 outer corners,
  order them as a convex quad (reuse the angle-around-centroid ordering already in
  `_quad_from_lines`, `calibration.py:734-736` — factor a tiny `_order_quad(pts)` helper if
  cleaner, or inline).

Fallback path — raw saddle points + lattice RANSAC (only when SB returns nothing):
- Compute the chessboard **X-corner (saddle) response**: on blurred gray, second derivatives
  `Ixx, Iyy, Ixy` (Sobel), saddle response `R = Ixx*Iyy - Ixy^2` (Hessian determinant);
  saddle points are strong **negative** minima of `R` (checkerboard corners are saddles).
  `cv2.goodFeaturesToTrack`-style non-max suppression to get candidate points, refine with
  `cv2.cornerSubPix`.
- If `prior` is given, fit the 9×9 lattice by mapping candidates through `prior`'s inverse
  homography (`compute_homography(prior, board_size)` then invert) into board space, snapping
  to integer cell coords, and `cv2.findHomography(board_pts, img_pts, cv2.RANSAC)`; corners =
  the 4 board-space corners mapped forward. Without a prior, this fallback returns None
  (cold saddle-only grid assignment is out of scope for P0 — SB covers the cold case).

Robustness detail: SB can return a valid but **rotated/mirrored** 7×7 (issue opencv#15712);
that is fine here — geometric order only; phase 02 fixes a8.

### 2. Probe script `scripts/probe_board_detect.py`

Not committed as production code — a diagnostic that runs all three detectors on given
frames and writes an overlay montage (per the "always deliver a probe" convention).

```
uv run python scripts/probe_board_detect.py --frames <glob-or-dir> [--profile phone]
```
For each input frame, draw the detected quad + 8×8 grid (reuse `draw_calibration_overlay`
or `warp_from_corners` round-trip) for: saddles, lines (`board_corners_from_lines`), ArUco
(`detect_board_corners_aruco`). Tile side-by-side, label each with hit/miss, write a single
`board_detect_montage.png` to a temp/gitignored dir. Print a summary table: per detector,
`hits/total`.

Frames to use: whatever real board frames exist — search
`grep -rn "frames" ` / look under `data/**/frames/*.jpg`, `scans/**`, or the phone feed
(memory: phone-test-feed). If none are checked in, the script accepts a `--source` camera
index/URL to grab N live frames instead. STATUS.md records where frames came from.

## Steps

### 1. `src/chesslab/board_geometry.py` (new) — commit `feat(geometry): markerless saddle/SB board-corner detector`

Module docstring stating the producer contract + convention. `board_corners_from_saddles`
(SB primary + saddle-RANSAC fallback), the `_order_quad` helper if factored.

### 2. `scripts/probe_board_detect.py` (new) — commit `feat(geometry): board-detector comparison probe (saddles vs lines vs aruco)`

### 3. Record the decision in STATUS.md (no commit) — the detector priority for phase 01.

## Tests (write, run once, targeted)

`tests/test_board_geometry.py` (new):
1. `test_saddles_on_synthetic_empty_board` — render/compose a synthetic warped 8×8 board
   (reuse the synthetic-frame construction in
   `tests/test_calibration.py::test_board_corners_for_frame_and_warp_from_corners`, grep it),
   assert `board_corners_from_saddles` returns 4 corners within a few px of the known outer
   corners (order-agnostic: compare as sets / min over rotations).
2. `test_saddles_returns_none_on_blank` — uniform gray frame → None (no crash).

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_board_geometry.py -q`

## Acceptance criteria

- [ ] `grep -n "def board_corners_from_saddles" src/chesslab/board_geometry.py` hits.
- [ ] Detector returns the `[a8,h8,h1,a1]`-shaped 4×2 list or None — same shape as
      `board_corners_for_frame` (verify by asserting `len(res)==4 and len(res[0])==2`).
- [ ] Probe script runs and writes a montage; STATUS.md carries the per-detector hit-rate
      table and the **chosen detector priority** for phase 01.
- [ ] New tests pass; scoped ruff clean.

## Do NOT / Out of scope

- Do NOT resolve a8 orientation here (phase 02) — geometric quad order only.
- Do NOT wire anything into the tracker or add config/CLI (phases 01/03).
- Do NOT commit montage images or add production deps.
- Do NOT build the optical-flow engine yet (phase 01).
