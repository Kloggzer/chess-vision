# Phase 03 — Camera: CameraX pipeline, resolution setting, dynamic escalation

## Why

Python side: OpenCV `VideoCapture` + a `LatestFrame` wrapper so URL streams
never serve stale frames (`src/chesslab/web/camera.py:113-161`). Android gets
this natively from CameraX, plus two new features: a user-facing resolution
setting and **dynamic resolution** — temporarily escalate when the engine is
uncertain.

## Design (decided — do not redesign)

Package `com.chesslab.tracker.camera` in `:app`.

```kotlin
class TrackerCamera(context: Context, lifecycle: LifecycleOwner) {
    /** Warped-ready frames; conflated (grab-latest). */
    val frames: Flow<CameraFrame>          // CameraFrame(mat: Mat, timestampNs, width, height)
    fun start(config: CameraConfig)
    fun setResolution(res: Resolution)     // rebinds ImageAnalysis
    /** One high-res still for CNN verify / uncertainty; independent of analysis res. */
    suspend fun captureHiRes(): Mat
}

data class CameraConfig(
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
    val resolution: Resolution = Resolution.R1080P,   // settings-backed
    val dynamicResolution: Boolean = true,            // settings-backed
)
enum class Resolution(val size: Size) { R720P(1280×720), R1080P(1920×1080), R4K(3840×2160) }
```

- `ImageAnalysis` with `setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST)` and
  `ResolutionSelector` per setting — this IS the grab-latest semantics
  (`camera.py:150-161` equivalent); document the mapping in KDoc.
- YUV→BGR Mat conversion on the analysis thread; downstream flow is
  `conflate()`d so a slow engine never queues frames.
- Keep-screen-on + camera kept bound while tracking (foreground service comes in phase 04).

### Dynamic resolution (new feature)

```kotlin
class DynamicResolutionController(
    camera: TrackerCamera, engine: TrackerEngine, scope: CoroutineScope,
    val escalateAfterS: Double = 3.0, val holdS: Double = 10.0,
) // observes engine.uncertainty (phase 01 API):
```

- Trigger: `Uncertainty` sustained for `escalateAfterS` (margin < 2×ambiguityMarginLl,
  state STUCK, or pending verify) → step analysis resolution one level up
  (`setResolution(next)`), hold for `holdS` after uncertainty clears, then step back.
- On escalation the geometry rescales via `BoardWarper.forResolution` (phase 02) —
  the controller emits the new size; wiring is phase 04's job, but the controller
  exposes `val activeResolution: StateFlow<Resolution>` for it.
- Additionally, a single `captureHiRes()` still is exposed for phase 05 (CNN
  verify on hi-res crop) — implemented here with `ImageCapture` use case bound
  alongside analysis; escalation and stills are independent mechanisms.
- Everything behind the `dynamicResolution` setting; off = fixed resolution.

## Steps

1. `TrackerCamera` (analysis pipeline, YUV→Mat, conflated flow, resolution rebind) — commit `feat(android-camera): camerax grab-latest analysis pipeline`
2. `captureHiRes()` via ImageCapture — commit `feat(android-camera): on-demand hi-res still capture`
3. `DynamicResolutionController` + JVM unit tests with fake camera/engine (virtual clock: escalates after 3 s sustained uncertainty, de-escalates after 10 s clear, no flapping on 1 s blips) — commit `feat(android-camera): dynamic resolution on uncertainty`

## Tests (write, run once, targeted)

`cd android && ./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.camera.*"`
(Controller tests only; CameraX itself is verified manually in phase 04.)

## Acceptance criteria

- [ ] `grep -n "STRATEGY_KEEP_ONLY_LATEST" android/app/src` → hit in TrackerCamera.
- [ ] Controller tests green: escalate/hold/de-escalate/no-flap cases.
- [ ] Escalation is a no-op when `dynamicResolution=false` (tested).
- [ ] No UI code, no engine modifications.

## Do NOT

- Do not wire controller → warper rescale (phase 04 integration point).
- Do not add ONNX or crop logic (phase 05 consumes `captureHiRes`).
- No IP-camera/URL sources — phone camera only in v1.
