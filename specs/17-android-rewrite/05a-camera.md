# Phase 05a — camera: one CameraX owner, delivered-resolution truth, rebind backoff

> Module `:app`, package `com.chesslab.tracker.camera`. Runs in parallel with 05b and 05c
> on strictly disjoint files. Read `entry.md` completely first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read it for CameraX API usage
> and build configuration ONLY — never for architecture or tracker logic.

## Why

The camera layer has exactly three jobs and every one of them has already broken this
project once:

1. **One owner.** MEMORY-recorded live bug: the calibration screen created a *second*
   `ProcessCameraProvider` binding; on tab switch the analyzer feed froze dead. CameraX
   gives the device to the last binder — two owners is a coin flip, not a race you can fix.
2. **Never trust the requested resolution.** Commit `a7dab73`
   (`fix(android-geometry): calibration poisoned by requested-vs-delivered resolution
   mismatch`): the app requested 1280x720, the Xiaomi delivered 4:3 **1280x960**, the
   resolution controller emitted the *enum*, corners were rescaled with `sy = 720/960 =
   0.75` (x untouched — the log signature), and live-align then EMA-mixed corners across
   two coordinate spaces. Result: warp shifted ~2.3 ranks, CNN reading garbage, tracker
   permanently stuck. Deterministic on every auto-calibration.
3. **Never deliver the same frame twice** (entry.md invariant 14). A repeated frame diffs
   to zero and reads as "board stable" while a hand is waving — observed live in Python
   before `LatestFrame` (`src/chesslab/camera.py:242-306`, `LatestFrame.read` docstring:
   *"Latest frame, but NEVER the same frame twice"*).

Python reference for device robustness: `tracker.py::_loop:1490-1548` (a throwing
`cap.read()` is treated as a dropped frame, not a crash), `_reconnect_backoff:1250`,
`_downshift_target:1257`, `_log_reconnect_diagnosis:1269`, and the sustained-recovery rule
at `:1552`.

## Design (decided — do not redesign)

1. **`TrackerCamera` is the only class in the app that calls
   `ProcessCameraProvider.getInstance`.** It is constructed exactly once, by
   `TrackerService` (phase 06c). No screen, no ViewModel, no composable binds a camera.
   Enforced by an acceptance grep over the whole `:app` source set.

2. **`ImageAnalysis` is the only use case.** No `Preview` use case, no `PreviewView`
   surface provider, no `ImageCapture`. The preview the user sees is rendered from the
   analyzer's own frames (06b publishes them, 06b/06c own that path). A second use case
   fighting for the stream is exactly the class of bug that froze the feed.
   - `setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)` — this *is* the
     Android `LatestFrame`: CameraX holds only the newest frame and never re-delivers an
     already-delivered one. State this in the KDoc, naming `src/chesslab/camera.py:242-306`.
   - `setOutputImageFormat(OUTPUT_IMAGE_FORMAT_YUV_420_888)` (conversion is 05b's).
   - Analyzer runs on a dedicated single-thread executor
     (`Executors.newSingleThreadExecutor()`), named `chesslab-analyzer`.
   - Resolution request via `ResolutionSelector` + `ResolutionStrategy` with
     `FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER`. **The request is a wish.**

3. **The seam is a callback, not a Flow.** `ImageProxy` is a pooled resource; queueing it
   through a channel invites leaks and stale frames.
   ```kotlin
   fun interface FrameSink { fun onFrame(image: ImageProxy, delivered: DeliveredSize) }
   ```
   `TrackerCamera` invokes the sink on the analyzer thread and closes the `ImageProxy` in
   a `finally` **after** the sink returns. The sink must not retain it. Documented on the
   interface.

4. **`DeliveredSize` is truth.** A tiny value type:
   ```kotlin
   data class DeliveredSize(val width: Int, val height: Int, val rotationDegrees: Int)
   ```
   built **only** from `image.width` / `image.height` / `image.imageInfo.rotationDegrees`.
   - `TrackerCamera` exposes `val deliveredSize: DeliveredSize?` (updated per frame) and
     `val requestedSize: Size` **separately, and never conflates them**.
   - A `ResolutionMismatchLogger` (pure, testable) logs **once per distinct
     requested/delivered pair** at WARN, mirroring `tracker.py::_note_frame_size:1086`'s
     rate limit: `camera mode 1280x720 requested but the device delivers 1280x960`.
   - **No code in `camera/` ever scales geometry.** Reacting to a size change is 05b's
     `FrameSizeGuard` (`_note_frame_size:1086` / `_regenerate_profile:1125`). The legacy
     `rewarpFor()` collector that `a7dab73` deleted must not be reintroduced in any form.

5. **Device robustness** (ports `specs/16/03-camera-reconnect.md`, which stays valid):
   - Observe `cameraInfo.cameraState` on the main executor after binding. Rebind
     (`unbindAll()` + bind the same `ImageAnalysis`) on `CameraState.error != null` with
     code in `{ERROR_CAMERA_IN_USE, ERROR_MAX_CAMERAS_IN_USE, ERROR_CAMERA_FATAL_ERROR,
     ERROR_CAMERA_DISABLED, ERROR_OTHER_RECOVERABLE_ERROR}`, or a `CLOSED`/`CLOSING` state
     carrying an error.
   - `ReconnectPolicy` (pure) mirrors `_reconnect_backoff:1250`:
     `min(30.0, max(3.0, reconnectGraceS) * 2^min(attempts, 4))` → 3/6/12/24/30/30…
   - `shouldDiagnose()` fires **exactly once** after 3 consecutive failures
     (`_log_reconnect_diagnosis:1269` — one clear line, then stay quiet at the cap).
   - **Auto-downshift**: after `attempts >= 2`, if the delivered size is `>= 1920*1080`,
     retry **once** at 720p and latch `downshifted = true` (`_downshift_target:1257`).
     Ported honestly: the Python guard `isinstance(self._src, int)` (local USB only) has no
     Android analogue — the bandwidth argument applies to the ISP path too, so it always
     applies here. Record this as a deliberate deviation in `STATUS.md`.
   - **Escalation resets only after sustained health** (`tracker.py:1552`): `attempts` and
     the diagnosis flag reset when frames have been delivered continuously for **10 s**,
     not on the first lucky frame. `ReconnectPolicy.onFrameDelivered(nowMs)` implements
     this internally — one healthy frame does NOT reset.
   - The camera never throws into the analyzer thread: the sink invocation is wrapped so a
     sink exception is logged and the frame dropped (`tracker.py:1509-1516` — an unhandled
     throw there killed the whole loop).

6. **Camera-down is a status, not a freeze.** `TrackerCamera` exposes
   `val cameraState: StateFlow<CameraHealth>` where
   `CameraHealth = Up | Down(reason: String, retryInS: Int)`. 06c maps it into
   `TrackerStatus.note`. `camera/` renders nothing and knows no Compose type.

7. **Lifecycle.** `bind(lifecycleOwner)` / `close()`. `close()` unbinds, removes the
   `cameraState` observer, cancels pending rebinds, shuts down the analyzer executor.

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/camera/`:

- `TrackerCamera.kt` — binding, analyzer wiring, `CameraState` observer, rebind. **≤ 250 LOC.**
- `CameraModels.kt` — `DeliveredSize`, `CameraHealth`, `CameraRequest` (requested size,
  lens facing, target fps), `FrameSink`.
- `ReconnectPolicy.kt` — pure backoff / diagnosis / downshift / sustained-recovery policy.
- `ResolutionMismatchLogger.kt` — pure once-per-pair mismatch reporter.

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/camera/`:

- `ReconnectPolicyTest.kt`, `ResolutionMismatchLoggerTest.kt`, `DeliveredSizeTest.kt`

You own no other file. If you need a change in `pipeline/`, `cnn/`, `service/`, the version
catalog, or the manifest: **STOP** and record a blocker in `STATUS.md`.

## Steps

### 1. `camera/CameraModels.kt` — seam types — commit `feat(android-camera): camera seam types (DeliveredSize, FrameSink, CameraHealth)`
### 2. `camera/ReconnectPolicy.kt` + `camera/ResolutionMismatchLogger.kt` — pure policies — commit `feat(android-camera): pure reconnect/downshift policy and resolution-mismatch reporter`
### 3. `camera/TrackerCamera.kt` — single-owner ImageAnalysis binding — commit `feat(android-camera): single-owner CameraX ImageAnalysis with keep-only-latest`
### 4. `camera/TrackerCamera.kt` — CameraState observer + rebind — commit `feat(android-camera): CameraState observer, rebind with backoff and one-shot diagnosis`
### 5. Tests — commit `test(android-camera): backoff schedule, sustained-recovery reset, delivered-vs-requested guard`

## Tests

`:app:testDebugUnitTest`, JVM only. **UI/instrumented tests are NOT required for this
phase** — the CameraX binding is not unit-testable on the JVM; everything testable is
extracted into pure classes, and the rest is covered by the manual checklist below.

`ReconnectPolicyTest`
- `backoff_schedule_is_3_6_12_24_30_30` — exact doubling and the 30 s cap.
- `backoff_base_follows_reconnect_grace_s` — `reconnectGraceS = 8.0` → 8/16/30/30.
- `one_lucky_frame_does_not_reset_escalation` — a delivered frame at t+1 s keeps
  `attempts`; only 10 s of continuous delivery resets it (`tracker.py:1552`).
- `diagnosis_fires_exactly_once_after_three_failures`.
- `downshift_offered_once_above_1080p_then_latched` — no offer below 1080p, none twice.

`ResolutionMismatchLoggerTest`
- `logs_once_per_distinct_pair` — 1280x720 requested / 1280x960 delivered logs once over
  100 frames; a switch to 1600x1200 logs again.
- `no_log_when_delivered_matches_requested`.

`DeliveredSizeTest` — **the named `a7dab73` regression test:**
- `delivered_size_is_read_from_the_image_never_from_the_request` — a fake `ImageProxy`
  reporting 1280x960 against a `CameraRequest` of 1280x720 yields
  `DeliveredSize(1280, 960, …)`; assert no `720` appears in the result and that no API in
  `camera/` returns a size derived from `CameraRequest`.

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.camera.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] Feed keeps running across a tab switch to calibration and back (the 2nd-binding freeze).
- [ ] Logcat shows the requested-vs-delivered WARN exactly once on a device that falls back.
- [ ] Pull the camera (another app grabs it) → status shows "camera down … retrying in Ns",
      intervals 3/6/12/24/30 s in logcat, one diagnosis line, then quiet.
- [ ] Release the camera → feed returns; escalation state clears only after ~10 s of frames.

## Acceptance criteria

- `grep -rn "ProcessCameraProvider" android/app/src/main/kotlin/` returns hits in
  `camera/TrackerCamera.kt` **only**, and `grep -c` on that file is `1`.
- `grep -rn "Preview\.Builder\|ImageCapture\|setSurfaceProvider" android/app/src/main/kotlin/com/chesslab/tracker/camera/`
  is empty.
- `grep -n "STRATEGY_KEEP_ONLY_LATEST" android/app/src/main/kotlin/com/chesslab/tracker/camera/TrackerCamera.kt` hits.
- `grep -rn "rewarpFor\|forResolution" android/app/src/main/kotlin/com/chesslab/tracker/camera/` is empty.
- No file in `camera/` exceeds 250 LOC (`wc -l`).
- All named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not add a `Preview` use case or a `PreviewView` — 05b/06b render from analyzer frames.
- Do not convert, warp, crop, or grayscale anything: `camera/` hands out a raw `ImageProxy`.
- Do not scale corners, profiles, or any geometry on a resolution change (that is `a7dab73`).
- Do not retain or re-deliver an `ImageProxy`, and do not add a buffering `Channel`/`Flow`
  of frames — `STRATEGY_KEEP_ONLY_LATEST` is the whole contract (invariant 14).
- Do not port `android-legacy/.../camera/DynamicResolutionController.kt`'s
  `activeResolution` → rewarp collector. It is the deleted bug.
- Do not touch `pipeline/`, `cnn/`, `service/`, `ui/`, the manifest, or `libs.versions.toml`.
