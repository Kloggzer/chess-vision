# 00 — Delete the wizard

> Owns `ui/calibration/CalibrationViewModel.kt`, `OrientationConfirm.kt`, `ManualCornerPicker.kt`,
> `ui/camera/CameraMode.kt`, the nudge helpers in `core-geometry/Homography.kt`, and their tests.
> Must land before phase 01.

## Why

Every control listed below asks the user to influence a quad that `LiveAlign` overwrites every third
frame (`entry.md`). None of them can survive contact with a game, and two of them could not be
operated even in principle: the corner sliders are a port of a web control whose inputs are **numeric
fields at 1 rectified pixel per step**, turned on Android into sliders spanning ±40–80 px across a
250 dp track. A fingertip cannot aim that.

The orientation switch is a separate case and worth stating precisely, because deleting a screen
that calls itself a safety gate deserves an argument rather than a shrug:

- The ambiguity is **one bit**. `computeHomography` (`Homography.kt:30-55`) and `warpFromCorners`
  (`Warp.kt:47-72`) take `geom` and never read `geom.whitePov`; `resolveBoardCorners`
  (`Homography.kt:78`) selects by marker **ID**, never spatially; `squareToColRow`
  (`Corners.kt:92-96`) is `(7-col, 7-row)`. There is no mirror and no transpose to catch.
- The marker IDs already anchor a8, the profile defaults to `true`, and the Python side exposes no
  control for this anywhere — it is hand-edited YAML. The Android switch is an invention, not a port.
  On a correctly marked board, flipping it is what *creates* the bug the screen exists to prevent.
- The gate is not a gate. `orientationSeen` is set at the moment the step changes
  (`CalibrationViewModel.kt:229-237`), **before** the warp bitmap is fetched, so `canSave` is
  satisfied by opening the screen. `CalibrationViewModelTest.saveIsBlockedUntilOrientationIsConfirmed`
  asserts exactly that. What is being removed is "pressed Check, then pressed Save".
- The bit keeps a home: `AppSettings.orientation` (`AppSettingsWiring.kt:61`,
  `TrackerService.kt:305`) is an existing, separate user-facing control for the same value. **One
  bit, one control** — two was already the defect.

## Steps

Each step is a commit.

1. **`delete: the corner nudges`** — remove `CornerNudges`, `NudgeAxis`, `CORNER_NAMES`,
   `NUDGE_SPAN_DIVISOR`, `NUDGE_LABEL`, `NUDGE_VALUE`, `replacing` from `OrientationConfirm.kt`;
   `applyNudge`, `zeroNudge`, `toPointList`, `CalibrationState.baseCorners`, `.nudge`, `.boardSize`,
   `.refining` from the view model; `nudgeInRectified` and its private `canvasCorners` from
   `Homography.kt`. Grep first: `canvasCorners` has exactly one caller.
2. **`delete: the marker outsets`** — `MarkerOutsets`, `MARGIN_STEP`, `setMargin`, `marginTouched`,
   `MARGIN_MIN`, `MARGIN_MAX`, and `CalibrationState.margin`. The stored `BoardGeometry.margin`
   stays and keeps its measured default; only the UI goes.
3. **`delete: the orientation switch`** — the `Switch` row, `setWhitePov`, `whitePovTouched`,
   `CalibrationState.whitePov`, `.orientationSeen`, `.warped`, `canSave`, `refreshWarp`, and the
   whole of `OrientationConfirm.kt`. Update `CalibrationViewModelTest` accordingly — do not leave a
   test asserting a field that no longer exists.
4. **`delete: the four-tap fallback`** — `ManualCornerPicker.kt` entire (`ManualCornerPicker` and
   `TapMarkers` already have zero call sites), plus `CORNER_PROMPTS`, `mapTapToSource`,
   `tapsToCorners`, `TapPoint`, `CalibrationState.taps`, and `CornerMappingTest`. It is the only
   non-ArUco way to reach a board today and the user reports never having used it; markers stay
   (`entry.md`), so it goes with the rest.
5. **`delete: the step machine`** — `CalibrationStep`, `beginManual`, `toConfirm`, `back`,
   `detectOnce`, `autoFineTune`, `gridNote`, `CHECKING_GRID`, `QuadRefinement` import,
   `CalibrationState.step`. `CameraMode.kt` and `ModeStrip` go with it: with one mode there is no
   strip.
6. **`refactor: the state is what the detector saw`** — what remains of `CalibrationState` is
   `corners`, `markerIds`, `frameWidth`, `frameHeight`, `note`, `detecting`, `saved`, plus a `found`
   derivation. What remains of the view model is `autoDetect`, `save`, `detectNow`. `save` no longer
   passes `whitePovOverride` or `marginOverride`.
7. **`feat: one sentence, from the marker count`** — an internal `boardNote(ok, markers)` returning
   plain language. The detector's own `reason` is written for a log ("only 2 of 4 markers visible —
   quad reconstructed"): it tells a developer what happened and a user nothing about what to do.
   Every line must end in something the user can act on by moving the phone.

## Tests

- `boardNote` is a pure function of two arguments — table-test all four branches. It is the only new
  logic in this phase and the only thing worth a test that did not exist before.
- Every deletion is verified by the gate compiling, not by a new test.
- `CalibrationViewModelTest` keeps its detection tests (frame size stamped on a failed detection,
  `detecting` guard) and loses everything about steps, taps, margins, nudges and orientation.

## Acceptance

- `grep -rn "OrientationConfirm\|ManualCornerPicker\|CalibrationStep\|nudgeInRectified\|zeroNudge\|mapTapToSource" android/ | grep -v /bin/` returns nothing outside the deletion commits.
- The gate is green with `--rerun-tasks`.
- `CalibrationViewModel.kt` is under 140 lines. It was 385.

## Do NOT

- Do not delete `QuadOutline` or `CalibrationOverlay` — phase 01 draws the outline.
- Do not touch `BoardGeometry.margin`, `DEFAULT_MARKER_MARGIN`, or `improveQuad`/`refine`. The
  refinement stays; it is the automatic that made the sliders unnecessary, not the other way round.
- Do not remove `AppSettings.orientation`. It is where the one bit lives now.
- Do not add a replacement control "for advanced users". A disclosure does not make an unaimable
  slider aimable.
