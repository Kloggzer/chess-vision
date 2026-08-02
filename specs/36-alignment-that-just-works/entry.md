# 36 — Alignment leaves the user interface

> **Status:** `todo`. Three phases, in order. Phase 02 is independent of 00/01 and may run in
> parallel; 00 must land before 01.

## The premise, and the fact that decides it

The brief was *less is more — ideally nothing manual, the alignment should just work*. The first
draft of this pack answered it with a measured quality meter, a verdict enum, four thresholds and
six new capabilities: a smaller face on a larger machine. That draft is gone. What replaced it is
one fact, and everything follows from it.

**The saved corners are a seed.** `TrackerStack.kt:107` writes `pipeline.corners = seed.corners`
once at construction, and from then on `LiveAlign` (`TrackerCoordinator.kt:147-165`) re-detects the
markers every `alignEvery = 3` frames and overwrites them for the whole session. A quad the user
spends a minute nudging is gone a few hundred milliseconds into the game. `CLAUDE.md` says the same
thing from the other side, and has for a long time:

> **Calibration profiles** are geometry config (board size, orientation, crop params), not stored
> positions — corners are detected per frame from ArUco.

So there was never anything here for a human to improve. The wizard asked the user to judge, and
then to hand-tune, a quantity the app re-derives twice a second and measures better than an eye can.
Twelve sliders were the end state of taking that question seriously.

Two consequences, and they are the whole design:

1. **The alignment UI goes.** All of it — the rectified preview, the orientation switch, the four
   marker-outset steppers, the eight corner sliders, the four-tap fallback, the four-step machine.
   What remains on the camera screen is the outline of the board the app can see, one sentence, and
   one button. Phases 00 and 01.
2. **The one thing that genuinely persists must stop lying.** `LiveAlign.correction` is fitted once
   and carried for the rest of the session, so a phone that gets nudged keeps applying a rectified
   -space correction measured at a pose that no longer exists — silently, with no expiry and no
   test. That is the only place where wobble does real damage today, and it is now the point of the
   pack rather than an appendix. Phase 02.

## What is NOT in this pack

- **No verdict, no meter, no thresholds.** The first draft banded `worstCells` at ≤4 % / ≤6 % and
  gated the save button on it. `specs/30-sharper-alignment/STATUS.md:74` measures this exact metric
  at **5.27 median / 5.96 p90** on 267 real frames that were *already fine*, falling to 3.59 / 3.99
  only **after** correction. The bands sat inside the metric's own noise and were to be applied to a
  pre-refinement reading, so a correctly aligned board would routinely have been refused the only
  button on the screen. No Android number for this metric exists in the repo at all. Do not
  reintroduce a gate without measuring on-device first.
- **No automatic orientation.** `whitePov` is one bit (`Corners.kt:92-96` is a 180° rotation;
  `computeHomography` and `warpFromCorners` never read it), the marker IDs already anchor a8, and
  the shipped default model is **2-class** (`assets/cnn_model/shipped/config.json` →
  `["empty","occupied"]`), so a colour vote cannot decide anything on a default install. The bit
  keeps its existing home in Settings (`AppSettings.orientation`).
- **No markerless detection.** ArUco stays. Recorded elsewhere, deliberately out of this pack.
- **No `measuredMargin`.** `DEFAULT_MARKER_MARGIN = 0.045` is a measured constant
  (`config.py:70-77`: optimum 0.040–0.050 on four independent recordings) and the whole Python side
  runs on it with no UI. A second estimator would fight `improveQuad`, which already absorbs an
  outset error by moving the quad.

## Ownership

Disjoint by file. Nothing outside a phase's list may be edited by that phase.

| Phase | Owns |
|---|---|
| **00** | `ui/calibration/CalibrationViewModel.kt`, `ui/calibration/OrientationConfirm.kt` (deleted), `ui/calibration/ManualCornerPicker.kt` (deleted), `ui/camera/CameraMode.kt` (deleted), `core-geometry/Homography.kt` (nudge helpers only), the tests of all of these |
| **01** | `ui/camera/BoardMode.kt`, `ui/camera/CameraRoute.kt`, `ui/camera/CameraChrome.kt`, `ui/calibration/CalibrationHost.kt`, `ui/ChesslabNavHost.kt`, `ui/TrackerServiceBinding.kt`, `service/CameraSwitch.kt` |
| **02** | `service/TrackerCoordinator.kt` (`LiveAlign` only), `core-geometry/GridCorrection.kt`, their tests |

## Protocol

- `android/**/bin/` holds a stale gitignored copy of the source tree. Exclude it from every grep;
  never edit a file under it.
- Gate: `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
  :core-geometry:test --rerun-tasks`. Gradle reports green on stale tasks — `--rerun-tasks` is not
  optional for a final gate.
- Resolve a detekt or ktlint trip by restructuring. Never with `@Suppress` and never with a baseline
  entry.
- Grep for callers before every deletion, and paste the grep into the commit message.
