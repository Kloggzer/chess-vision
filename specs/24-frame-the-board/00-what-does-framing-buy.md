# Phase 00 — What does framing actually buy on the device?

**Measurement only. Change no behaviour. Gates the whole pack, including the option to close it.**

## Why

The pack rests on a claim nobody has measured: that the Android app's own camera wastes most of
its pixels on the table. `AppSettings.resolutionMode`'s docstring asserts "the board fills roughly
a third of the frame's width — 630 px of 1920", which would make zooming worth 2.7× linear. But
**no session in this corpus was recorded through that camera**, and the ones we do have fill
61–69% of the frame, where zooming is worth only 1.24–1.4×.

Downstream the gain is capped twice over: `measuredBoardSize` clamps the warp to 1280 px (160
px/square), and at `infer_size = 80` the crop box at that clamp is 192 px — more than twice what
the network can represent. So it is entirely possible that the correct outcome of this phase is
**"the framing is fine, close the pack"**, and that outcome must be as easy to report as any
other.

## Design (decided — do not redesign)

Three measurements, in this order. Stop at the first that settles the question.

### 1. What does the app's own camera actually see? (no code change)

The debug screen already renders the board and the app already computes the corner quad every
frame. Read the fill fraction off a running app rather than building a tool: with the tracker
calibrated on the real board from the position the user actually uses, record

- the frame size the camera delivers,
- the corner quad's longest edge,
- fill = `max(quad width, quad height) / min(frame width, frame height)`,
- the resulting px/square = `edge / 8`, and the crop box after `measuredBoardSize`'s clamp.

If the debug panel does not already show enough to compute this, add the numbers to it — that is
the only code this phase may write, and it is read-only instrumentation.

**Decision:** if fill ≥ 60% AND the crop box is ≥ 2× the model's `infer_size`, record **STOP**
with the numbers. Zoom cannot help a network that already gets more pixels than it can use.

### 2. The zoom curve, if step 1 says there is room

On the device, with the board in place: for `zoomRatio` in 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, measure

- the corner quad's edge in pixels (i.e. px/square) — does it grow linearly with the ratio, or
  does it flatten where the sensor crop reaches the output resolution?
- whether all four markers are still detected. **The largest usable factor is the one where
  detection is still reliable, not where the board just fits.**

The flattening point is the answer to "how much is real": beyond it, zoom is upscaling. Report
the curve, not just the maximum.

### 3. Does more px/square change the occupancy result at all?

Only if 1 and 2 leave room. The corpus already answers a version of this: specs/23 phase 00
swept warp resolution 800/1200/1600 against input size and found **±10 misses of 1715 with no
consistent direction**. If a 2× warp change did nothing there, a 1.3× framing change needs a very
good argument before anyone builds it. State whether this phase found one.

## Steps

### 1. Instrumentation, if needed — commit `feat(android): the debug panel states the board's framing`

Fill fraction, px/square and the crop box after the clamp, next to the existing camera facts.
Skip this commit if the panel already shows enough.

### 2. `specs/24-frame-the-board/STATUS.md` — commit `docs(specs): phase 00 — what framing buys, measured`

The numbers, the verdict (`BUILD` or `STOP`), and — if BUILD — the zoom factor phase 01 should
target and the reason it is safe.

## Tests

None. Instrumentation and measurement.

## Acceptance criteria

- `STATUS.md` states the app's measured fill fraction, px/square, and crop box, from the real
  board at the user's real camera position.
- It names `BUILD` or `STOP` and the numbers that decide it.
- If BUILD: the zoom curve is in `STATUS.md` with the flattening point identified, and the
  largest factor at which all four markers were still detected.
- `git diff --stat -- android/app/src/main/kotlin/com/chesslab/tracker/camera` is **empty** — this
  phase does not touch the camera.

## Do NOT / out of scope

- Do not set a zoom ratio. Measuring is not setting; `OpticsLock` stays as it is.
- Do not re-calibrate as part of the measurement, and do not write a profile.
- Do not touch `data/`, retrain, or export.
- **Do not talk yourself into BUILD.** The entry file states why STOP is the likely outcome. If
  the numbers say the framing is already adequate, that is the finding, and it saves two phases.
