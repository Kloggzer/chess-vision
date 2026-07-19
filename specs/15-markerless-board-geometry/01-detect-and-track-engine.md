# Phase 01 — `BoardGeometryTracker`: detect-and-track engine

## Why

Cold detection alone is too fragile under motion+occlusion. The rigid board, however, moves
only a little between consecutive frames, so once locked it can be **tracked** by optical
flow far more reliably than re-detected — and occlusion only removes a subset of the tracked
points, which RANSAC homography tolerates. This phase builds the stateful engine that
produces the `[a8,h8,h1,a1]` corner list every frame using track-first, detect-on-loss.

## Design (decided — do not redesign)

Add to `src/chesslab/board_geometry.py`. Detectors from phase 00 stay module-level.

### 1. Engine class

```python
class BoardGeometryTracker:
    """Per-stream markerless board geometry via detect-and-track. Same producer contract as
    calibration.board_corners_for_frame: update(frame) -> [a8,h8,h1,a1] in FRAME px | None.

    FSM: DETECTING -> (lock) -> TRACKING -> (loss) -> DETECTING. Track via LK optical flow on
    the board lattice + RANSAC homography update; re-detect on low inliers or every
    redetect_every frames. Orientation (a8) resolution is injected in phase 02."""

    def __init__(self, profile, *, redetect_every=30, track_min_inliers=12,
                 lattice_n=9, detectors=("saddles", "lines", "aruco"),
                 marker_tracker=None):
        ...
    def update(self, frame) -> list[list[float]] | None: ...
    def status(self) -> dict: ...     # {"geom_state","geom_inliers","geom_conf","geom_age"}
```

State: `self._state` (`"detecting"|"tracking"`), `self._corners` (last good `[a8,h8,h1,a1]`),
`self._prev_gray`, `self._track_img` (Nx1x2 float32 image points), `self._track_board`
(Nx2 board-space coords for those points), `self._age` (frames since last full detect),
`self._smoother` (a `MarkerTracker`, reuse from `calibration.py:459`, keyed 0..3 on the four
corners — pass in or build via `make_tracker(profile)`).

### 2. `update(frame)` flow

```
gray = cvtColor(frame, GRAY)  # optionally blurred; keep for LK
if state == TRACKING and prev_gray is not None and track_img is not None:
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev_gray, gray, track_img, None, **LK)
    good = st.flatten()==1
    if good.sum() >= track_min_inliers:
        H, mask = cv2.findHomography(track_board[good], nxt[good], cv2.RANSAC, 3.0)
        inliers = int(mask.sum()) if mask is not None else 0
        if H is not None and inliers >= track_min_inliers:
            corners = _corners_from_homography(H, board_size)   # map 4 board corners fwd
            corners = self._smooth(corners)                     # MarkerTracker EMA/hold
            self._reseed_tracks(gray, H, board_size)            # fresh lattice pts for next frame
            self._prev_gray, self._corners, self._age = gray, corners, self._age+1
            if self._age % redetect_every == 0:                 # periodic drift correction
                self._try_detect(frame, gray, prior=corners)    # refine, keep if better
            return corners
    # tracking failed -> fall through to detect
self._try_detect(frame, gray, prior=self._corners)              # sets state/tracks on success
self._prev_gray = gray
return self._corners      # may be held (last good) or None if never locked
```

### 3. Helpers

- `_corners_from_homography(H, board_size)` → map board-space corners
  `[[0,0],[bs,0],[bs,bs],[0,bs]]` through `H` (`cv2.perspectiveTransform`) → `[a8,h8,h1,a1]`.
  (Board-space order matches `compute_homography`'s dst; corner labels are attached by phase 02.)
- `_reseed_tracks(gray, H, board_size)`: build the interior lattice board points
  (the `lattice_n×lattice_n` inner grid, skip the very edge), map through `H` to image points,
  refine with `cornerSubPix`, store as `track_img`/`track_board`. Re-seeding every frame keeps
  the point set fresh as the board moves and lets occluded points drop naturally.
- `_try_detect(frame, gray, prior)`: run detectors in the phase-00-decided priority order
  (`board_corners_from_saddles(frame, prior)` → `board_corners_from_lines(frame, profile)` →
  `detect_board_corners_aruco(frame)`). First non-None → set `self._corners`, seed tracks from
  it, `self._state="tracking"`, `self._age=0`. All None → keep `self._state="detecting"`,
  leave `self._corners` as last good (held) so the tracker downstream can hold via `_last_corners`.
- `_smooth(corners)`: feed the four corners (keyed 0..3) through the `MarkerTracker`
  (`update`/`points`) exactly as `board_corners_for_frame` does with markers, then
  `resolve_board_corners` if needed — but here corners are already 4, so `_smooth` just runs
  the per-corner EMA/hold/jump (reuse). If `MarkerTracker`'s API needs `{id:[x,y]}`, adapt with
  keys 0..3.

LK params: `winSize=(21,21), maxLevel=3, criteria=(EPS|COUNT,30,0.01)`. Downscale option:
respect a `detect_scale`-style factor passed from the tracker later (phase 03) — for now
operate at full frame res; phase 03 passes the working size.

### 4. Occlusion robustness

Points on occluded squares fail LK (`st==0`) or become RANSAC outliers and drop out — no
special-casing needed as long as `track_min_inliers` visible lattice points remain. Document
this in the class docstring. The engine does NOT itself gate on occlusion — the tracker's
`_grid_line_coverage`/motion gates (phase 03) still apply upstream.

## Steps

### 1. Engine + helpers — commit `feat(geometry): BoardGeometryTracker detect-and-track engine`

`BoardGeometryTracker`, `_corners_from_homography`, `_reseed_tracks`, `_try_detect`,
`_smooth`, `status`.

### 2. Tests — commit `test(geometry): tracking survives motion and partial occlusion`

## Tests (write, run once, targeted)

Extend `tests/test_board_geometry.py`. Build synthetic sequences by warping ONE synthetic
board image through a **known time-varying homography** (compose with the frame construction
from `test_calibration.py`); ground-truth corners = the known warp applied to the board
corners.

1. `test_engine_tracks_moving_board` — feed ~10 frames of a slowly translating/rotating warp;
   after the first lock, assert `update` returns corners within a small cell-fraction RMSE of
   ground truth for every subsequent frame.
2. `test_engine_survives_occlusion` — same sequence but black out ~15 random squares each
   frame; assert it still tracks (corners within tolerance) as long as ≥`track_min_inliers`
   remain.
3. `test_engine_redetects_on_loss` — feed a hard cut (unrelated frame) mid-sequence; assert
   `geom_state` flips to `detecting`, then re-locks on a clean frame.
4. `test_update_contract` — output is 4×2 or None.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_board_geometry.py -q`

## Acceptance criteria

- [ ] `grep -n "class BoardGeometryTracker" src/chesslab/board_geometry.py` hits.
- [ ] `update` returns `[a8,h8,h1,a1]|None` (4×2), verified by tests 1–4.
- [ ] Uses `cv2.calcOpticalFlowPyrLK` + `cv2.findHomography(..., cv2.RANSAC)`
      (`grep -n "calcOpticalFlowPyrLK\|findHomography" src/chesslab/board_geometry.py`).
- [ ] Reuses `MarkerTracker`, `board_corners_from_lines`, `detect_board_corners_aruco`
      (imports from `.calibration`) — not reimplemented.
- [ ] New tests pass; scoped ruff clean.

## Do NOT / Out of scope

- Do NOT resolve a8 orientation yet — corners carry geometric order; phase 02 injects the
  a8 mapping into `_try_detect`'s output.
- Do NOT edit `tracker.py`/`config.py`/`cli.py` (phase 03).
- Do NOT add config knobs to `TRACK_DEFAULTS` yet — constructor defaults only.
- Do NOT run under any lock (engine is called from the tracker loop thread already).
