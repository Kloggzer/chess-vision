# Phase 06a — calibration: ArUco auto-calibration, manual fallback, orientation confirmation

> Module `:app`, packages `com.chesslab.tracker.ui.calibration` and
> `com.chesslab.tracker.geometry`. Runs in parallel with 06b and 06c on strictly disjoint
> files. Read `entry.md` completely first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read
> `android-legacy/app/src/main/kotlin/com/chesslab/tracker/ui/CalibrationScreen.kt` (503 LOC)
> and `.../geometry/ArucoAutoCalibrator.kt` for OpenCV-Java ArUco and Compose/DataStore
> idioms ONLY — never for architecture or tracker logic.

## Why

Calibration is where two of this project's most expensive bugs live.

1. **The second camera owner.** MEMORY (`android-single-camera-owner`): the calibration
   screen created its own `ProcessCameraProvider` binding; switching to it and back **froze
   the tracker feed**. CameraX hands the device to the last binder. The fix — recorded and
   binding — is that the calibration screen renders frames the *service* already has.
2. **A wrong a8 assignment silently transposes every label** (CLAUDE.md known pitfall).
   Corner order is `[a8, h8, h1, a1]` everywhere (entry.md invariant 11). There is no
   runtime symptom: the board just reads mirrored and the tracker fabricates illegal moves.
   The only defence is making the user *see* the assignment before accepting it.

Python reference: `calibration.py:553 detect_board_corners_aruco`, `:186 profile_from_frame`,
`:222 ensure_profile` (docstring: geometry like `white_pov` is **carried over**, never
silently reset — "would reset a hand-set `white_pov: false` and transpose every label"),
`:72 CalibrationProfile`, `:329 _square_to_col_row`, `:347 square_to_crop_box`,
`:384 crop_border_px`.

## Design (decided — do not redesign)

### HARD RULE: no camera binding in this phase

The calibration screen contains **zero** CameraX types. It obtains frames from the service
(06c), whose API is pinned here and in 06c:

```kotlin
// TrackerService — owned by 06c, consumed by 06a. Signature is binding for both phases.
fun latestCalibrationFrame(): Mat?          // a CLONE; the caller releases it
val rawPreview: StateFlow<Bitmap?>          // downscaled (<=640px) analyzer frames, ~5 fps
```

The screen polls `latestCalibrationFrame()` when it needs pixels for detection, and renders
`rawPreview` for the live picture. Nothing else.

### Flow

```
[Aim]  live rawPreview + "point the camera at the whole board"
  |
  v  auto (default): ArUco every ~500 ms off the main thread
[Detected]  overlay: board quad, a8 marker highlighted, file letters a..h + rank 1..8
  |                   drawn in board space, plus the 4 detected marker ids
  |-- "Corners look wrong" --> [Manual]  tap 4 corners in the order a8, h8, h1, a1
  |                                       (the prompt names the NEXT corner explicitly)
  v
[Confirm orientation]  full-screen: the warped board with a8/h1 labelled and a
  |                    "White plays from the bottom?" toggle -> white_pov
  v
[Save]  CalibrationProfile -> DataStore; service is told to (re)build its warper
```

### Detection

- `ArucoCalibrator` (in `geometry/`) wraps `:core-geometry`'s `Aruco.kt` + `MarkerTracker.kt`
  (phase 02b). Dictionary `DICT_4X4_50`, ids `(0, 1, 2, 3)`, margin default `0.06`
  (`calibration.py:186-206`).
- It runs on `Dispatchers.Default`, **max one detection in flight** (commit `4a7609e`
  measured ArUco at 44-87 ms — never on a UI or frame thread).
- Output is `CalibrationResult(corners: FloatArray /*8, [a8,h8,h1,a1]*/, markerIds: List<Int>,
  frameWidth: Int, frameHeight: Int, ok: Boolean, reason: String?)`.
- **`frameWidth`/`frameHeight` come from the `Mat` that was actually detected on**, never
  from a requested resolution (`a7dab73`). They are stamped into the profile as
  `sourceWidth`/`sourceHeight`.
- Detection failure is explicit and shown: `"only 2 of 4 markers visible"`,
  `"markers found but the quad is degenerate"`. No silent fallback to the previous corners.

### Manual fallback

- Tap 4 points on the preview; the tap coordinate is mapped preview→source using the
  **rendered bitmap's** dimensions, not the requested camera size.
- Prompt text names the next expected corner (`"tap a8 (top-left from White's side)"`).
- Corners are ordered as tapped — no auto-sorting. Auto-sorting is what makes an a8 error
  invisible; the confirmation step is where it gets caught.
- Undo-last-tap and restart-tapping actions.

### Orientation confirmation (mandatory, not skippable)

Before save, show the **warped** board (via `:core-geometry` `warpFromCorners` on the
detected corners) with:
- the a8 square outlined and labelled `a8`, the h1 square outlined and labelled `h1`;
- file letters `a..h` along the bottom and rank digits `1..8` along the left, computed
  through `_square_to_col_row` semantics (`calibration.py:329-345`, 180°-rotated when
  `whitePov = false`);
- a `White plays from the bottom` switch bound to `whitePov`, which redraws the labels live.

`Save` is disabled until the user has seen this screen. Record the confirmation in
`STATUS.md` as the mitigation for the CLAUDE.md transposition pitfall.

### `CalibrationProfile` + persistence

Mirror `calibration.py:72-135`:

```kotlin
data class CalibrationProfile(
    val name: String,
    val boardSize: Int,          // config.DEFAULT_BOARD_SIZE = 1600
    val margin: Double,          // 0.06
    val markerDict: String,      // "DICT_4X4_50"
    val whitePov: Boolean,
    val sourceWidth: Int, val sourceHeight: Int,
    val corners: FloatArray,     // 8 floats, [a8,h8,h1,a1] in SOURCE pixels
    val crop: CropParams,        // out_size, pad_up, pad_side  (config.py CROP:40-65)
    val savedAtMs: Long,
)
```

- Persisted via **DataStore (Preferences)** under key `calibration_profile` as JSON
  (`kotlinx.serialization`). One active profile; the schema carries a `version` int and an
  unknown/older version is discarded with a visible note rather than migrated blindly.
- **Carry-over rule** (`ensure_profile:240-275`): re-running calibration keeps
  `whitePov`, `boardSize`, `margin`, `markerDict` and `crop` from the existing profile and
  replaces **only** the corners and the source size — unless the user explicitly changes
  them on the confirmation screen. A recalibration must never reset a hand-set `whitePov`.
- `sourceWidth/sourceHeight` are **informational for the guard** (05b `FrameSizeGuard`),
  not a rescale factor. There is no `forResolution()` on this type. `a7dab73` deleted the
  Android equivalent; do not resurrect it.

### Reset game ≠ Recalibrate (MEMORY-recorded)

Two visually distinct actions, never merged:
- **Recalibrate** — geometry only. Re-detects corners, writes a new profile, tells the
  service to rebuild its warper. **Does not touch the game.**
- **Reset game** — game state only (`TrackerEngine.resetToStart()`). **Does not touch the
  profile.** It lives on the tracking screen (06b); this screen only links to it and must
  not duplicate it.

### Navigation seam (pinned; 06b owns the NavHost)

06a exposes exactly:
```kotlin
@Composable fun CalibrationRoute(onCalibrated: () -> Unit, onBack: () -> Unit)
```
06b wires it. Neither phase changes the signature without a `STATUS.md` discrepancy note.

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/`:

- `ui/calibration/CalibrationRoute.kt` — the route composable + step host. **≤ 200 LOC.**
- `ui/calibration/CalibrationViewModel.kt` — step state machine, detection scheduling.
  **≤ 200 LOC.**
- `ui/calibration/CalibrationOverlay.kt` — quad, a8 highlight, marker ids, file/rank labels.
- `ui/calibration/ManualCornerPicker.kt` — 4-tap fallback + coordinate mapping.
- `ui/calibration/OrientationConfirm.kt` — the mandatory confirmation step.
- `geometry/ArucoCalibrator.kt` — `:core-geometry` glue, single-flight detection.
- `geometry/CalibrationProfile.kt` — the profile type + `CropParams`.
- `geometry/CalibrationStore.kt` — DataStore persistence, JSON schema, carry-over rule.

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/`:

- `geometry/CalibrationProfileSerializationTest.kt`, `geometry/CalibrationStoreTest.kt`,
  `ui/calibration/CalibrationViewModelTest.kt`, `ui/calibration/CornerMappingTest.kt`

You own no other file. In particular you do **not** own `ui/ChesslabNavHost.kt`,
`MainActivity.kt`, anything in `service/`, `camera/`, `pipeline/`, `cnn/`, or the manifest.
Need a change there? **STOP** and record a blocker in `STATUS.md`.

## Steps

### 1. `geometry/CalibrationProfile.kt` + `geometry/CalibrationStore.kt` — commit `feat(android-geometry): CalibrationProfile type and DataStore persistence with carry-over`
### 2. `geometry/ArucoCalibrator.kt` — commit `feat(android-geometry): single-flight ArUco calibration off the UI thread, frame size from the Mat`
### 3. `ui/calibration/CalibrationOverlay.kt` + `ManualCornerPicker.kt` — commit `feat(android-ui): calibration overlay with a8 highlight and 4-tap manual fallback`
### 4. `ui/calibration/OrientationConfirm.kt` — commit `feat(android-ui): mandatory orientation confirmation before a profile is saved`
### 5. `ui/calibration/CalibrationRoute.kt` + `CalibrationViewModel.kt` — commit `feat(android-ui): calibration screen consuming the service's frames — no camera binding`
### 6. Tests — commit `test(android-calibration): profile serialization, carry-over, corner mapping, step machine`

## Tests

`:app:testDebugUnitTest`, JVM only. **UI/instrumented tests are NOT required for this
phase** — Compose rendering is covered by the manual checklist; everything decidable is in
the ViewModel, the store, and the coordinate mapping.

`CalibrationProfileSerializationTest`
- `round_trips_all_fields_including_corner_order` — decode(encode(p)) == p; corners stay
  `[a8, h8, h1, a1]` (assert element order explicitly, invariant 11).
- `rejects_an_unknown_schema_version_instead_of_migrating`.
- `rejects_a_corners_array_that_is_not_8_floats`.

`CalibrationStoreTest` (in-memory DataStore)
- `recalibration_carries_over_white_pov_board_size_margin_and_crop` — the `ensure_profile:240`
  rule; a stored `whitePov = false` survives a recalibration.
- `recalibration_replaces_corners_and_source_size`.
- `explicit_white_pov_change_on_confirm_wins_over_carry_over`.

`CornerMappingTest`
- `tap_maps_to_source_pixels_using_the_rendered_bitmap_size` — a 640x480 preview of a
  1280x960 source maps a centre tap to (640, 480); **assert nothing derives from a
  requested camera size** (`a7dab73`).
- `four_taps_are_stored_in_tap_order_not_sorted`.

`CalibrationViewModelTest` (fake frame source + fake detector)
- `save_is_blocked_until_orientation_is_confirmed`.
- `detection_failure_surfaces_a_reason_and_keeps_the_previous_profile_untouched`.
- `only_one_detection_runs_at_a_time`.
- `frame_size_is_taken_from_the_detected_frame`.

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.geometry.*"
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.calibration.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] Switch tracking → calibration → tracking repeatedly: **the feed never freezes**
      (the MEMORY-recorded second-binding bug).
- [ ] Auto-calibrate: overlay shows 4 marker ids, the quad, a8 highlighted, correct
      file/rank letters; toggling `White plays from the bottom` flips them 180°.
- [ ] Cover one marker → explicit "only 3 of 4 markers visible", no silent stale corners.
- [ ] Manual 4-tap on a board without markers produces a correct warp.
- [ ] Deliberately tap a8/h1 swapped → the confirmation screen makes it obvious before save.
- [ ] Set `whitePov = false`, recalibrate → it is still `false` afterwards.
- [ ] "Recalibrate" leaves the move list intact; "Reset game" leaves the profile intact.

## Acceptance criteria

- `grep -rn "ProcessCameraProvider\|androidx.camera" android/app/src/main/kotlin/com/chesslab/tracker/ui/`
  is **empty**. (The single camera owner is `camera/TrackerCamera.kt`, phase 05a.)
- `grep -rn "latestCalibrationFrame\|rawPreview" ui/calibration/` hits — frames come from
  the service.
- `grep -rn "a8" ui/calibration/CalibrationOverlay.kt` and `OrientationConfirm.kt` both hit.
- `grep -rn "forResolution\|rewarp" android/app/src/main/kotlin/com/chesslab/tracker/geometry/`
  is empty (`a7dab73`).
- `grep -rn "Recalibrate\|Reset game" android/app/src/main/kotlin/` shows two distinct
  actions, not one shared handler.
- No file you own exceeds 250 LOC; all named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not bind a camera, create a `PreviewView`, or touch `androidx.camera.*` anywhere.
- Do not auto-sort tapped corners into a canonical order — the confirmation step is the
  safety net, sorting hides the error.
- Do not rescale a stored profile by a resolution ratio; re-detect instead (`a7dab73`).
- Do not reset `whitePov`, `boardSize`, `margin` or `crop` on a recalibration
  (`ensure_profile:240`).
- Do not merge "Reset game" and "Recalibrate".
- Do not implement homography, warping, or marker decoding here — call `:core-geometry`.
- Do not touch `ui/ChesslabNavHost.kt`, `MainActivity.kt`, `ui/tracking/**`, `service/**`,
  `camera/**`, `pipeline/**`, `cnn/**`, the manifest, or `libs.versions.toml`.
