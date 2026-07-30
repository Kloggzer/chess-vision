# Phase 01 — Set the zoom once, then calibrate

**Blocked by 00, and only runs if 00 recorded BUILD with a target factor.**

## Why

`OpticsLock` pins `setZoomRatio(1.0f)` and its comment explains that this is not an arbitrary
default: *"1.0 IS the calibrated state by definition, since the profile's marker quad was measured
at whatever zoom was in force."* The zoom is therefore not a free knob — it is part of the
geometry the profile describes, and changing it after calibration makes the profile describe a
board that is not there.

That is also the whole design constraint: the zoom must be chosen **before** the calibration it
will be used with, and frozen afterwards.

## Design (decided — do not redesign)

### The sequence, fixed

1. Camera bound, zoom at 1.0, `OpticsLock` in its usual settle.
2. Detect the marker quad. If fewer than four markers are visible, **do not zoom** — a factor
   computed from a partial quad is a guess, and specs/23 measured a reconstructed corner at 78 px
   error on a 234 px square.
3. Compute the factor (below), clamp it, set it.
4. **Re-detect** and calibrate at the new zoom. The profile written is the one that will be used.
5. Freeze, exactly as today.

This runs at calibration, not per frame. A live regulator would hunt, and every correction would
invalidate the profile it was measured against.

### The factor

```
fill        = max(quad width, quad height) / min(frame width, frame height)
want        = TARGET_FILL / fill                     // TARGET_FILL = 0.85, see below
sensorLimit = sensor width / delivered frame width   // beyond this, zoom only upscales
factor      = clamp(min(want, sensorLimit, camera max), 1.0, …)
```

- **`TARGET_FILL = 0.85`, not 1.0.** A board that touches the frame edge loses its markers on the
  first bump, and losing markers stops the tracker. The 15% is the margin that keeps a knocked
  table recoverable.
- **`sensorLimit`** is what makes this honest: digital zoom crops the sensor, so it delivers real
  pixels only while the crop is larger than the output. Past that it is interpolation with extra
  steps. Get the sensor's active array size from `Camera2CameraControl`/`CameraCharacteristics`;
  if it cannot be read, **do not guess — fall back to 1.0 and say so in the log.**
- Never below 1.0. Zooming out to fit a board that already fits is not this phase's business.

### The way back

If the markers are lost after zooming — board moved, phone bumped — the tracker must return to
1.0 to reacquire, and then it is **uncalibrated** until the sequence runs again. Do not silently
keep a profile that was measured at a zoom no longer in force. Surface it the way a lost camera
is already surfaced (`CameraHealth`, `TrackerStatus.note`).

### What must not change

- The freeze itself: focus, exposure and white balance still lock as they do now.
- `measuredBoardSize`'s clamp (320…1280) stays. It is a separate question whether a better
  framing should raise it; **that belongs to a later pack, not this one** — raising it changes the
  warp for every existing profile.

## Steps

### 1. `camera/OpticsLock.kt` — commit `feat(android): the zoom is computed from the marker quad, not pinned to 1.0`

### 2. the calibration path — commit `feat(android): calibrate at the zoom that will be used`

Find it via `grep -rn "measuredBoardSize\|calibrate(" android/app/src/main/kotlin`; specs/23
phase 01 identified `TrackerService` as the owner of the live geometry.

### 3. tests — commit `test(android): the zoom factor respects fill, sensor limit and marker loss`

## Tests (write, run once, targeted)

1. **The factor is capped by the sensor, not just by fill** — a framing that would want 3× on a
   sensor that only supports 2× real crop yields 2×.
2. **A partial quad yields 1.0** — three markers must not produce a zoom.
3. **`TARGET_FILL` leaves margin** — a board already at 85% yields ~1.0, not 1.0-and-a-bit that
   pushes it to the edge.
4. **Calibration happens after the zoom is set**, asserted on the call order, because that is the
   invariant the whole phase exists to protect.

```
gradlew.bat :app:testDebugUnitTest --tests '*Optics*' --tests '*Zoom*'
```

Run **once**. Do NOT run `assembleDebug` or the full task.

## Acceptance criteria

- `grep -n "setZoomRatio(1.0f)" android/app/src/main/kotlin/com/chesslab/tracker/camera/OpticsLock.kt`
  no longer hits as the only call — the value is computed.
- A profile written after zooming records the frame size and quad measured **at that zoom**
  (check `sourceWidth`/`sourceHeight` in the written profile against the delivered frame).
- The debug panel states the active zoom factor, so a live session is attributable.
- Targeted tests green; `:app:ktlintCheck :app:detekt` clean.

## Do NOT / out of scope

- No live/continuous zoom control. One shot at calibration.
- Do not touch the lens calibration path. `data/lens/calib.npz` was solved at one zoom; the phone
  path does not undistort at all, and nothing here may start applying a calibration across zoom
  levels.
- Do not change `measuredBoardSize`, its clamp, `padSide`, or the warp.
- Do not change `resolutionMode` — that is phase 02.
