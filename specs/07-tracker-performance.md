# Spec 07 — Move-Tracker Performance (frame cost + decision latency)

> Status: PLANNED. Follow-up to the 2026-07-06 detection rework (9-step pipeline in
> `tracker._try_detect`, one commit gate `_dispatch`, flow in `docs/move-tracker-flow.md`).
>
> Measured baseline (dev machine, 1080p phone stream, board warp 800², cuda CNN):
> loop camera-bound ~25–30 fps · quiet frame ~8 ms · evaluating frame ~28 ms ·
> CNN observation 65 ms (worker thread) · ArUco ~3 ms amortized (every 3rd frame, half-res)
> · census 9.4 ms (ref cached) · HSV shadow 4.7 ms · occlusion NN 4.4 ms ·
> buffer means 2×3.5 ms · per_square_diff 0.5 ms · grid Canny 2 ms · JPEG 2.3 ms.

## How to work on this spec (read first)

- Implement **one stage item at a time**, in the order given. After each item:
  `uv run pytest -q` green, `uv run ruff check src tests synth` clean, then commit.
- Every Stage-A item is an **exact-output refactor**: the new code must produce
  bit-identical results to the old code. Each item lists the equality test to write
  FIRST. If outputs differ, the refactor is wrong — do not "fix" it by adjusting
  thresholds or tests.
- Do NOT change any default in `config.TRACK_DEFAULTS`, any threshold, or any detection
  semantics anywhere in this spec (Stage C explicitly lists its allowed changes).
- Benchmark before/after with the script in "Benchmark harness" below and record the
  numbers in the commit message.

## Invariants (hard-won — breaking any of these re-introduces fixed live bugs)

1. **One loop iteration = one fresh camera frame.** `web/camera.py::LatestFrame.read()`
   blocks (timeout 0.5 s) until a NEW frame (sequence counter). If any change makes the
   loop consume duplicate frames again, identical frames diff to zero and a waving hand
   counts as "board stable".
2. Wall-clock parameters (`motion_hold_s`, `motion_recency_s`, taint-latch expiry) mean
   clip replays MUST run `realtime=True` (`tests/test_clips.py` already does).
3. Occluded/latched squares must keep counting toward the `max_changed` gate
   (`blocked_n` in `_generate_hypothesis`).
4. `_ref_census_codes()` caches the census transform of `ref_gray` and is invalidated by
   `_maybe_patch_anomaly` (in-place cell patch, `self._ref_census_for = None`). Any new
   cache must have the same invalidation.
5. CNN recovery/pull-forward anchors the new reference on the frame the CNN **observed**
   (`obs_gray`/`obs_warped` in `_cnn_tick`), never on `self._last_cur`.
6. The per-square regions use `square_region(sq, board_size, white_pov, inset=…,
   extend_up=…)` — note the **inset** (default 0.16 shrinks each cell) and the
   **white_pov** mapping via `_square_to_col_row`. Vectorized code must reproduce these
   regions exactly; the safe way is to keep `square_region` as the single source of the
   rectangles (see A1).

## Goals / Non-goals

- Goal 1: stable-frame evaluation < 10 ms (from ~28 ms) with zero semantic change.
- Goal 2 (Stage C): reduce hand-leaves→commit latency to < 1 s with CNN.
- Non-goal: any detection-quality change. The realtime clip replays (`pytest -m clips`,
  pre-existing-red) must produce the **same committed move lists** before and after each
  stage; paste both lists into the PR/commit description.

---

## Stage A — exact-output refactors

### A1. Integral-image per-square statistics

**Problem:** `per_square_diff`, `per_square_census_change`, `hsv_shadow_squares`,
`occlusion_color_squares`, `board_color_gamut` (all in `move_tracker/tracker.py`) loop
over 64 Python slices and call `.mean()` per square.

**Do NOT** vectorize with an 8×8 `reshape(...).mean(axis=(1,3))`: the regions are
inset-shrunk (and optionally extended upward), so whole-cell block means would CHANGE the
values and silently shift every z-score.

**Prescribed approach — one integral image, 64 exact rectangle means:**

```python
def _region_means(img2d, boxes) -> dict[str, float]:
    """Exact mean of img2d over each (x0,y0,x1,y1) box via a single integral image.
    Identical to img2d[y0:y1, x0:x1].mean() for every box (empty boxes -> 0.0)."""
    ii = cv2.integral(img2d)          # (H+1, W+1) float64/int
    out = {}
    for sq, (x0, y0, x1, y1) in boxes.items():
        n = (y1 - y0) * (x1 - x0)
        out[sq] = 0.0 if n <= 0 else float(
            (ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]) / n)
    return out
```

- Precompute the box dict ONCE per (board_size, white_pov, inset, extend_up) combination
  with the existing `square_region` (e.g. `functools.lru_cache` on a helper
  `_square_boxes(board_size, white_pov, inset, extend_up)`); the boxes are the ground
  truth, so region semantics cannot drift.
- `per_square_diff`: `d = cv2.absdiff(a, b)` → `_region_means(d, boxes)`.
- `per_square_census_change`: ham image → `_region_means(ham, boxes)` (then `*255/8`).
- `hsv_shadow_squares`: the per-square value is the FRACTION of pixels satisfying the
  shadow condition, plus a `Vc.mean() < Vr.mean()` check. Build the boolean `shadow_px`
  mask for the WHOLE image once (it is already computed full-image), convert to uint8,
  and take `_region_means(mask, boxes)` for the fraction; take `_region_means(Vc, boxes)`
  and `_region_means(Vr, boxes)` for the brightness check. Only candidates are consulted
  from the dicts — computing all 64 sums costs the same as 10.
- `occlusion_color_squares` / `board_color_gamut`: per-square means of Lab a*, Lab b*,
  HSV S → three `_region_means` calls (or one loop over the 3 planes). The NN-Mahalanobis
  part stays unchanged.
- Caveat float dtype: `cv2.integral` on float32 input returns float64 — fine. On uint8 it
  returns int32 — also exact.

**Test first** (add to `tests/test_move_tracker.py`): for random uint8/float32 images,
`per_square_diff`/census/hsv/occlusion outputs of the new implementation equal the old
sliced implementation to `pytest.approx(..., abs=1e-4)` for BOTH `white_pov` values and
for `extend_up` in (0.0, 0.35). Keep a private `_per_square_diff_sliced` copy in the test
file as the oracle (copy the old loop body into the test, don't keep dead code in prod).

**Expected:** diff 0.5→0.2 ms, census region part ~2→0.3 ms, HSV 4.7→~1.5 ms (the two
cvtColor calls remain), occlusion 4.4→~1.5 ms.

### A2. Incremental buffer means

**Problem:** `_mean_gray`/`_mean_bgr` recompute `np.mean(np.stack(list(buf)))` on every
stable frame (2 × 3.5 ms).

**Prescribed approach:** replace the raw `deque` usage with a tiny helper class in
`tracker.py`:

```python
class _RunningMean:
    """Fixed-window running mean over frames. Exact: recomputes the float64 sum from
    scratch every 64 appends to kill drift; otherwise sum += new - evicted."""
    def __init__(self, maxlen: int): ...
    def append(self, frame) -> None: ...   # updates deque + float64 sum
    def clear(self) -> None: ...
    def __len__(self) -> int: ...
    def mean_uint8(self):                  # None when empty
        return None if not self._buf else (self._sum / len(self._buf)).astype(np.uint8)
```

- Replace `self._gray_buf` / `self._bgr_buf` (`deque(maxlen=…)`) with `_RunningMean`.
  Grep ALL usages first: `append`, `clear`, `len(...)`; `_bgr_buf` may be empty when
  `_mean_bgr` returns None — preserve that.
- Drift control: count appends; every 64th append recompute `self._sum` from the buffer.
- **Test first:** after arbitrary interleaved append/clear sequences of random frames,
  `mean_uint8()` equals `np.mean(np.stack(buf), axis=0).astype(np.uint8)` exactly
  (use `np.array_equal`). Include a >64-append sequence (drift resync path).

**Expected:** 7 ms → <1 ms per stable frame.

### A3. Census transform only on candidate bands

**Problem:** `census_transform(cur)` runs over the full 800² image (~7 ms) although the
codes are only consumed inside candidate squares' boxes (shadow veto).

**Prescribed approach:** keep the FULL-board cached codes for the reference
(`_ref_census_codes`, unchanged — computed once per reference). For the CURRENT frame,
in `_apply_vetoes`, compute the transform only on the union of row bands that cover the
candidate boxes:

1. From the candidate boxes take `y_lo = min(y0) - 1`, `y_hi = max(y1) + 1` (clamped);
   with few candidates optionally split into disjoint bands, but a single min–max band is
   acceptable and simpler.
2. `band_codes = census_transform(cur[y_lo:y_hi])` — the 3×3 census needs a ±1 px halo,
   hence the −1/+1; `census_transform` already REPLICATE-pads its input edges, and the
   1-px halo makes the interior codes identical to the full-image transform.
3. `ham_band = _POPCOUNT8[ref_codes[y_lo:y_hi] ^ band_codes]`; evaluate the per-square
   means with A1's `_region_means` on the band using y-shifted boxes
   (`(x0, y0 - y_lo, x1, y1 - y_lo)`).

Restructure `per_square_census_change` accordingly (add a `rows=(y_lo, y_hi)` fast path)
or inline the band logic in `_apply_vetoes` — either way the public function must keep
working full-board for the tests and other callers.

- **Test first:** band result equals full-image `per_square_census_change` for the
  candidate squares (random images, candidates spread over distant ranks, both pov).
  Pay attention to the halo: without the ±1 px the edge rows of the band get REPLICATE
  padding from the wrong pixels and the test will fail — that is the point of the test.

**Expected:** 9.4 ms → ~2 ms typical (1-2 candidate ranks).

### A4. Overlay JPEG only with viewers

**Problem:** `_encode_overlay` runs every 80 ms even headless (replay!) or with no
browser open.

**Prescribed approach:**
- `tracker.py`: add `self.viewers = 0` (plain int, GIL-atomic inc/dec is fine). In
  `_loop`, wrap the encode: `if self.viewers > 0 and now - self._last_encode_ts >= 0.08`.
- `move_tracker/app.py`: find the `/warped.mjpg` streaming endpoint (generator that
  yields `tracker.overlay_jpeg()`); increment `tracker.viewers` before the loop,
  decrement in a `finally:`. Same for any second overlay stream if present.
- Keep `overlay_jpeg()` returning the LAST encoded frame (may be stale/None when no
  viewer was connected — the first stream iteration will simply wait one encode cycle).
- **Test:** unit-test the gate (set `viewers = 0`, run the encode branch condition —
  simplest is to extract a `_should_encode(now) -> bool` helper and test it); plus one
  app test with `TestClient` streaming a few frames asserting `viewers` returns to 0
  after the client disconnects.

**Expected:** headless replay and idle tracking lose the 2.3 ms × 12/s entirely
(clip tests get faster for free).

---

### Stage A status (2026-07-06): DONE (commit ac8a808)

Accepted deviation: `hsv_shadow_squares`/`occlusion_color_squares` keep the per-candidate
slice loop — their cost is dominated by the two full-image `cvtColor` calls and they only
touch <=10 squares; converting the loop to integral images would save <0.5 ms. Revisit only
if B1 makes the cvtColor cheap enough that the loop starts to matter.

## Stage B — resolution levers (validation required per item)

> Only start after Stage A is merged and benchmarked — B1's win is only measurable then.

### B1. Detection warp at half resolution

- Add `detect_scale: float = 0.5` to `TRACK_DEFAULTS` + `MoveTracker.__init__` + CLI
  (`--detect-scale`, help: "detection runs on a downscaled board warp; 1.0 = off").
- In `_loop`, after `warped = self._warp(frame)`: when `detect_scale < 1.0`, derive
  `warped_det = cv2.resize(warped, None, fx=s, fy=s, INTER_AREA)`; the DETECTION path
  (gray/motion/means/diff/census/vetoes/grid gate/`_set_ref`) uses `warped_det` and a
  `det_board_size = int(board_size * s)`; the OVERLAY and `_record_decision` images keep
  full `warped`.
- All per-square code takes `board_size` as a parameter already — thread
  `det_board_size` through consistently (`square_region` boxes, `_grid_line_coverage`,
  `board_color_gamut`, patcher regions). Grep for `self.profile.board_size` inside
  `tracker.py` and replace with `self._det_size` in the detection path ONLY.
- Thresholds are per-square MEANS → scale-free. Two things to re-check by eye/clip:
  census values (structure at 50 px/square) and `_grid_line_coverage` band width.
- **Acceptance:** realtime clip replays produce the same move lists; one live session
  (debug card: `changed_vals` magnitudes comparable, shadow-veto rate similar,
  `grid_coverage` still ~1.0 on a clear board). If census values shift visibly, keep
  census on the full-res warp (it has its own images anyway) and take the win on the
  rest — do not retune `census_thr`.

### B2. 720p camera stream (docs only)

Add a note to `README.md` + `docs/setup` (phone/IP-cam section): 720p is sufficient for
tracking (markers detect at half-res anyway) and roughly halves warp/motion cost.
No code change.

### B3. Faster CNN verify

- In `cnn_recovery.py` (`CnnRecovery.observe`): run inference under
  `torch.autocast(device_type="cuda", dtype=torch.float16)` when on cuda; guard with a
  try/except fallback to fp32.
- Inference input resolution: only use a resolution that was part of multi-scale
  training (FixRes rule — check the run's `config.json` for the trained scales; if the
  run was single-scale, SKIP this sub-item).
- **Acceptance:** replay one recorded session's frames through `observe()` at fp32 vs
  fp16: per-square agreement deltas < 1 square on every frame; verify decisions on the
  realtime clips unchanged.

---

## Stage C — decision latency (the only stage allowed to change behavior)

Target: hand-leaves→commit < 1 s with CNN. Current chain: `motion_hold_s` 0.2 s +
`settle_frames` + confirmer + verify window, and `_verify_tick` observations are
throttled by the shared worker cadence.

- C1. Audit `_last_cnn_ts` / `cnn_cooldown_s`: the cooldown exists for RECOVERY and the
  periodic check; a PENDING verify should be allowed to observe on every worker cycle.
  Verify this is already the case (`_verify_tick` path does not consult the cooldown) —
  if it does, exempt it.
- C2. With CNN active, `confirm_frames` defaults to 1 already; audit for other fixed
  frame-waits between "candidate formed" and "pending set" (there should be none).
- C3. Provisional-move UI: when `_pending` is set, the web UI may show the pending move
  greyed in the moves list (data already in `status().debug.pending_move`). Presentation
  only — no tracker change.
- **Acceptance:** measure with a recorded live session (timestamps of motion-end vs
  commit note in the events); ghost rate unchanged (count of undos / hard negatives).

---

## Benchmark harness

Create `scripts/bench_tracker_ops.py` (standalone, no camera): loads one real session
frame (`data/sessions/*/frames/0001.png` via `np.fromfile` + `cv2.imdecode` — plain
`cv2.imread` fails on some Windows paths), builds an 800² warp-sized pair, and times:
aruco full/half-res, warpPerspective, gray+blur, motion_score, buffer mean,
per_square_diff, census (full + band), hsv_shadow, occlusion NN, grid Canny, JPEG.
Print a markdown table (op, ms). Run before and after every stage item; paste tables
into commit messages. (Numbers in the header of this spec are the 2026-07-06 baseline.)

## Verification checklist (every commit)

1. `uv run pytest -q` green (346+ tests).
2. `uv run ruff check src tests synth` clean.
3. `pytest -m clips` (realtime, ~2.5 min): committed move lists identical to the
   previous run — clips are pre-existing-red, ONLY the found-list parity matters.
4. Bench table before/after in the commit message.
5. Stage B/C additionally: one live smoke session (debug card: fps, diff_ms,
   hold_left_s, changed_vals plausibility, occlusion boxes still appear on a hand).
