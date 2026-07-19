# Phase 03 — Wire the engine into MoveTracker as a selectable geometry source

## Why

The engine (phases 01–02) produces the same `[a8,h8,h1,a1]|None` contract as
`board_corners_for_frame`. This phase makes `MoveTracker` able to use it — `markerless` or
`hybrid` — while keeping `aruco` the **byte-for-byte default** so nothing regresses. Config
and CLI expose the choice.

## Design (decided — do not redesign)

### 1. `MoveTracker.__init__` (`tracker.py:668-698`)

Add a keyword arg (place near `live_align`/`align_every`):
```python
geometry_source: str = "aruco",   # aruco | markerless | hybrid
```
After `self.marker_tracker` is built (grep `make_tracker` / `self.marker_tracker` in
`__init__`), construct the engine only when needed:
```python
self.geometry_source = geometry_source
self._geometry = None
if geometry_source in ("markerless", "hybrid"):
    from ..board_geometry import BoardGeometryTracker
    self._geometry = BoardGeometryTracker(
        self.profile, marker_tracker=self.marker_tracker,
        detectors=(("saddles", "lines", "aruco") if geometry_source == "hybrid"
                   else ("saddles", "lines")),
        redetect_every=..., track_min_inliers=...)   # from config.TRACK_DEFAULTS
```
`hybrid` includes `aruco` in the detector fallback chain (recovery + orientation anchor);
`markerless` omits it (no markers at all).

### 2. `_warp` (`tracker.py:916-931`) — route the corner call

Replace ONLY the corner-producing call (line 921-922) with a dispatch; leave the
`_align_i % align_every` hold, `_last_corners`, `warp_from_corners`, and the frozen fallback
untouched:
```python
if self._geometry is not None:
    corners = self._geometry.update(frame)          # markerless/hybrid engine
else:
    corners = board_corners_for_frame(frame, self.profile, self.marker_tracker,
                                      detect_scale=self.align_scale)   # unchanged aruco path
```
The engine already does its own detect/track cadence, so under markerless/hybrid the
`align_every` hold still applies on top (cheap: engine `update` is called every
`align_every`-th frame, held otherwise) — this is correct and keeps behavior identical in
shape. `_last_corners` hold on `None`, `_corners_jumped` re-anchor (`tracker.py:2096`), and
the CNN observer all keep working via the unchanged `_last_corners`.

### 3. Config — `TRACK_DEFAULTS` (`config.py`, next to `align_every`/`corner_jump_px`)

```python
"geometry_source": "aruco",     # aruco | markerless | hybrid — board geometry per frame
"geom_redetect_every": 30,      # markerless: force a full re-detect every N tracked frames (drift correction)
"geom_track_min_inliers": 12,   # markerless: min LK/RANSAC inlier lattice points to trust a tracked frame
```

### 4. CLI — `track_cmd` (`cli.py:541`)

Add (note `--geometry` is taken elsewhere for warp|box3d — use a distinct name):
```python
geometry_source: str = typer.Option(config.TRACK_DEFAULTS["geometry_source"], "--geometry-source",
    help="Board geometry: aruco (markers) | markerless (checkerboard detect+track) | hybrid (markerless + aruco fallback)."),
```
Thread it through the kwargs dict that `move_tracker/app.py:166` passes to
`MoveTracker(..., **kwargs)` (grep how `track_cmd` assembles kwargs / calls into
`move_tracker.app`). Pass `geom_redetect_every`/`geom_track_min_inliers` from config into the
engine (constructor already reads them via the tracker).

### 5. Status / debug card

`MoveTracker.status()` (grep `def status`): merge `self._geometry.status()` (the
`geom_state`/`geom_inliers`/`geom_conf`/`needs_orientation` keys) under `debug` when the
engine is active. Additive only.

## Steps

### 1. Engine wiring in tracker + config keys — commit `feat(tracker): selectable geometry_source (aruco|markerless|hybrid)`

`__init__` arg + engine construction, `_warp` dispatch, `status` merge, `TRACK_DEFAULTS`
keys.

### 2. CLI option — commit `feat(cli): track --geometry-source for markerless board detection`

### 3. Tests — commit `test(tracker): markerless geometry source routes through the engine`

## Tests (write, run once, targeted)

Extend `tests/test_move_tracker.py` (reuse the FakeCapture / `_headless_tracker` pattern,
grep `class FakeCapture` / `open_source`):
1. `test_geometry_source_aruco_unchanged` — default tracker has `self._geometry is None` and
   `_warp` calls `board_corners_for_frame` (monkeypatch it, assert called).
2. `test_geometry_source_markerless_uses_engine` — `geometry_source="markerless"` builds a
   `BoardGeometryTracker`; monkeypatch its `update` to a sentinel and assert `_warp` routes to
   it and NOT to `board_corners_for_frame`.
3. `test_status_merges_geometry` — engine active → `status()["debug"]` carries `geom_state`.

Run once:
`.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py tests/test_board_geometry.py -q`

## Acceptance criteria

- [ ] `grep -n "geometry_source" src/chesslab/move_tracker/tracker.py src/chesslab/config.py src/chesslab/cli.py` hits all three.
- [ ] Default path unchanged: `test_geometry_source_aruco_unchanged` proves `board_corners_for_frame`
      is still the aruco producer and `_geometry is None`.
- [ ] `_warp`'s hold/`_last_corners`/frozen-fallback lines are untouched (diff shows only the
      corner-call swapped behind the `if self._geometry` branch).
- [ ] New tests pass; existing `tests/test_move_tracker.py` green; scoped ruff clean.

## Do NOT / Out of scope

- Do NOT change the `align_every`/`detect_scale` hold logic or any diff/motion/CNN pipeline.
- Do NOT alter the aruco code path — it must remain the default and behave identically.
- Do NOT build orientation-confirm UI (surface `needs_orientation` only).
- Evaluation harness is phase 04.
