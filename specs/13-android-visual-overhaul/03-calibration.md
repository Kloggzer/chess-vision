# Phase 03 — Calibration restyle + real zoom loupe

## Why

Manual calibration (`ui/CalibrationScreen.kt`) asks the user to tap the four board
corners on the small `rawPreview`. The "loupe" that is supposed to help
(`drawLoupe`, `CalibrationScreen.kt:317-323`) only draws a translucent white circle
with a crosshair — it does **not magnify anything**, so landing a tap on the exact
corner pixel is impossible on a phone-sized preview. Wrong corners silently transpose
every label (the repo's classic pitfall). This phase makes the loupe a true pixel
magnifier and restyles the screen to the new system.

## Design (decided — do not redesign)

File: `ui/CalibrationScreen.kt` (the tap/ArUco/orientation logic is CORRECT — keep it;
restyle chrome + replace the loupe). Read phase-00 `BoardPalette` for tap/marker colors.

### Real zoom loupe

The screen already has everything needed: `rawPreview: Bitmap`, the current touch point
(`loupe: Offset?`, set on press at `CalibrationScreen.kt:158-162`), and the canvas size.
Replace `drawLoupe` with a magnified crop of the preview bitmap around the finger:

- On press, `loupe` holds the touch position in **canvas** coordinates. Map it to
  `rawPreview` pixel space using the same `ContentScale.Fit` mapping the taps use
  (`cornersOf`, `CalibrationScreen.kt:285-294` — reuse that scale math).
- Draw a circular magnifier (~104 dp) offset from the finger (default top-left of the
  board box, flip to top-right if the finger is on the left) so the finger never covers
  it. Inside: `drawImage` of `rawPreview` with a source rect = a small window
  (e.g. 40×40 px) centered on the mapped point, scaled up ~2.6× into the circle
  (`DrawScope.drawImage(image, srcOffset, srcSize, dstOffset, dstSize)` clipped to a
  `clipPath(Path().addOval(...))`).
- Crosshair + a small ring at the loupe center in `BoardPalette.ArucoDot`/accent so the
  user sees the exact pixel the tap will commit. A `2.6×` mono label in a corner.
- Keep the live-assist ArUco dots (`CalibrationScreen.kt:199-205`) and tapped-corner
  magenta dots/lines — restyle to `BoardPalette`.

`rawPreview` is a `Bitmap`; convert once with `.asImageBitmap()` (already imported) and
`remember` it keyed on the bitmap so it is not re-created per draw.

### Chrome restyle (mockup: Calibration)

- Instruction line → themed `titleMedium`; the a8→h8→h1→a1 progress becomes a **step
  indicator** row (4 pills: done = accent outline, current = filled accent, pending =
  muted). Build from `taps.size` + `confirming` (states already computed at
  `CalibrationScreen.kt:130-135`).
- Buttons → `GhostButton`/`QuietButton`/`PrimaryButton` (Clear / Auto (ArUco) / Save)
  from phase 01. Keep exact onClick logic (`CalibrationScreen.kt:211-280`).
- Orientation help → themed card (keep the text `R.string.calib_orientation_help`).
- Wrap the preview in `BoardFrame(video = true)` (phase 01) so the loupe/overlays sit
  in a `Box`.

## Steps

1. `CalibrationScreen.kt` — replace `drawLoupe` with a real magnifier (bitmap crop → scaled circle + crosshair) — commit `feat(android-ui): real zoom loupe for corner calibration`
2. `CalibrationScreen.kt` — step indicator + component/palette restyle — commit `feat(android-ui): calibration screen restyle`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.Calibration*"`: unit-test the
  canvas→bitmap source-window mapping (pure math extracted to a testable function, e.g.
  `loupeSourceRect(touch, canvas, bmpW, bmpH, windowPx)`), asserting the window stays
  inside bitmap bounds near edges/corners.

## Acceptance criteria

- [ ] `grep -n "drawImage" android/app/src/main/kotlin/com/chesslab/tracker/ui/CalibrationScreen.kt` hits (the loupe magnifies real pixels).
- [ ] The magnifier source window is clamped to bitmap bounds (test passes) — no crash tapping a corner at the image edge.
- [ ] Tap order enforcement (a8→h8→h1→a1) + orientation confirm are unchanged (`grep -n "reorderForA8\|confirming"` still present).
- [ ] Loupe/tap/marker colors come from `BoardPalette`; no local `Color(0x…)` literals remain except inside `BoardPalette`.
- [ ] `:app:ktlintCheck :app:detekt` zero new findings.

## Do NOT

- Do not change the calibration coordinate math / save format (`cornersOf`, saved
  `sourceWidth/Height`) — the warp depends on it (`BoardWarper`, memory
  `android-single-camera-owner`).
- Do not add a second CameraX binding — the preview is the service-owned `rawPreview`
  (single-camera-owner invariant).
- Do not touch the ArUco detection logic, only its overlay styling.
