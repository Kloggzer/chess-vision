# Spec 07 — Move-Tracker Performance (frame cost + decision latency)

> Status: PLANNED. Follow-up to the 2026-07-06 detection rework (9-step pipeline in
> `tracker._try_detect`, see `docs/move-tracker-flow.md`). Measured baseline on the dev
> machine (1080p phone stream, board warp 800², ROCm/cuda CNN):
> loop camera-bound at ~25–30 fps · quiet frame ~8 ms · evaluating frame ~28 ms ·
> CNN observation 65 ms (worker thread) · ArUco ~3 ms amortized (every 3rd frame, half-res).

## Goals

1. Make stable-frame evaluation cheap enough that frame cost is never the bottleneck
   (~28 ms → < 10 ms), without changing detection semantics.
2. Reduce **decision latency** (motion-hold + confirmer + verify window) — this, not fps,
   is the perceived slowness once frames are cheap.
3. Prepare the pixel layer for the on-device `TrackerEngine` (mobile direction): cheap
   deterministic pixel ops + one smart verifier.

## Non-goals

- No detection-quality regressions: every stage below must keep
  `uv run pytest -q` green and the realtime clip replays (`pytest -m clips`) at parity
  (compare committed move lists before/after, clips are pre-existing-red).
- No new detection mechanisms — pure cost/latency work.

## Invariants (hard-won, do not break)

- **One loop iteration = one fresh camera frame.** `LatestFrame.read()` blocks for a new
  frame (seq counter); any speedup that re-introduces duplicate frames silently disables
  the motion gate (stable_count rises while a hand waves).
- Wall-clock parameters (`motion_hold_s`, recency, latch expiry) mean clip replays MUST
  run `realtime=True`.
- Occluded/latched squares keep counting toward the `max_changed` gate.
- The reference census cache (`_ref_census_codes`) is invalidated by in-place cell patches.

## Stage A — cheap wins (pure refactors, no accuracy trade-off)

**A1. Vectorize per-square statistics.**
`per_square_diff`, `per_square_census_change`, `hsv_shadow_squares`,
`occlusion_color_squares` and `board_color_gamut` each loop over 64 Python slices.
Replace the inner loops with one 8×8 block reduction:
`img[:h8*8, :w8*8].reshape(8, cell, 8, cell).mean(axis=(1, 3))` (respecting `inset` via a
precomputed per-square mask or by shrinking the block slice once). `extend_up`/overhang
regions keep the sliced path (only used when `overhang > 0`).
Expected: 3–5× on every stable-frame op. Acceptance: identical outputs (unit test:
vectorized == sliced on random images, incl. white_pov=False).

**A2. Incremental buffer mean.**
`_mean_gray`/`_mean_bgr` recompute `np.mean(np.stack(buf))` per stable frame (~7 ms).
Maintain running `float32` sums updated on append/evict (deque of fixed maxlen → subtract
the evicted frame, add the new one), return `sum / len`. Invalidate on `clear()`.
Acceptance: bitwise-equal uint8 output vs. the naive mean (watch float drift — re-sync the
sum from scratch every N appends).

**A3. Census restricted to candidate bands.**
Census codes are only consumed for squares in `changed` (shadow veto). Compute
`census_transform` only on the row bands covering candidate squares (±1 px halo for the
3×3 neighborhood) for BOTH ref and cur instead of the full 800² board. The ref-side cache
then keys on (ref identity, band) or simply stays full-board but lazily per band.
Expected: 9.4 ms → ~2 ms typical. Acceptance: identical `cens[sq]` values for candidates.

**A4. Overlay JPEG on demand.**
`_encode_overlay` runs every 80 ms regardless of viewers. Track MJPEG client count in the
app (`/warped.mjpg` connections); skip encode when zero. Acceptance: UI unchanged when a
browser is open; encode cost gone headless (replay harness gets this for free).

## Stage B — resolution levers (need clip + live validation)

**B1. Detection warp at half resolution.**
Add `detect_board_size` (default `board_size // 2` = 400², 50 px/square): the DETECTION
path (gray, motion, diff, census, vetoes, grid gate) runs on the small warp; the overlay
and session recording keep the full warp (or upscale the small one when only the overlay
needs it). All thresholds are per-square means → scale-free by construction; census/grid
Canny need one re-check.
Expected: quarters every stable-frame cost (28 ms → ~8 ms with Stage A).
Acceptance: clip parity + one live session (watch `changed_vals` magnitudes, shadow veto
rate, grid coverage values).

**B2. 720p camera stream.**
Documentation + profile flag only: recommend 720p for tracking (markers proven at
half-res; everything scales). No code change beyond a note in the README/setup docs.

**B3. Faster CNN verify.**
- Run verify/recovery crops at a smaller inference resolution that WAS part of
  multi-resolution training (FixRes rule from the training memory) — never an unseen res.
- fp16 autocast on cuda/ROCm.
- Optional: occupancy-only head for verify questions (identity head skipped).
Expected: 65 ms → ~20 ms → shorter pending-verify windows.
Acceptance: verify decisions unchanged on a recorded session replayed through
`CnnRecovery.observe` at both resolutions (agreement deltas < 1 square).

## Stage C — decision latency (event-driven evaluation)

Today: motion-free `motion_hold_s` (0.3 s) + `settle_frames` + confirmer votes + verify
window ⇒ ~1–2 s from hand-leaves to commit. Target: CNN verdict, not frame counts, is the
confirmation:

- On the FIRST ready frame after motion, evaluate and (with CNN) hand the candidate to
  verify immediately (`confirm_frames` effectively 1 with CNN — already the default; audit
  remaining fixed waits).
- Let `_verify_tick` run at full worker cadence while pending (no cooldown between verify
  observations; cooldown applies to recovery/periodic only — audit `_last_cnn_ts` usage).
- Optional "fast commit, fast undo": UI shows the pending move immediately as provisional
  (grey), promoted on verify — no tracker-state change, presentation only.

Acceptance: measure hand-leaves→commit latency on a recorded live session before/after
(target < 1 s with CNN); ghost rate unchanged (undo/hard-negative count per session).

## Verification (all stages)

- `uv run pytest -q` green; `uv run ruff check src tests synth` clean.
- `pytest -m clips` (realtime) — committed move lists at parity with the pre-stage run
  (record them in the PR description; clips are pre-existing-red).
- Micro-benchmarks: extend the session bench script (ArUco/census/means measured 2026-07-06)
  and paste before/after numbers into the commit message.
- One live smoke session per stage B/C change (debug card: fps, diff_ms, hold_left_s,
  changed_vals plausibility).

## Order of execution

A1 → A2 → A3 → A4 (one afternoon, pure refactors) → benchmark → B1 (makes sense only
after A, else the small warp hides the win) → B3 → C. B2 is documentation, anytime.
