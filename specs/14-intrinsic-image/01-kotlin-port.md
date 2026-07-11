# Phase 01 — Kotlin port: IntrinsicGray + golden parity + pipeline seam

Depends on: phase 00 (consumes `tests/data/intrinsic_golden.json`). Do not start before
00's golden JSON is committed.

## Why

The Android tracker preprocesses frames in `BoardFramePipeline` (app side); the
invariant transform must run there with numerics matching Python to ≤1 u8 level,
proven by the golden file — otherwise the two trackers drift apart on the same clips.

## Design (decided — do not redesign)

New file `android/app/src/main/kotlin/com/chesslab/tracker/service/IntrinsicGray.kt`
(app module, NOT `android/engine/**` — engine purity rule):

```kotlin
/** Finlayson intrinsic image (specs/14): shadow-free gray from a BGR board Mat. */
class IntrinsicGray(
    val angleDeg: Double,
    val lo: Double,
    val hi: Double,
) {
    /** In: CV_8UC3 BGR detect-res board. Out: NEW CV_8UC1 invariant gray, same size. */
    fun apply(bgr: Mat): Mat

    companion object {
        /** Entropy-minimization calibration on one warped board frame (ports intrinsic.calibrate). */
        fun calibrate(bgr: Mat): IntrinsicGray
    }
}
```

Numerics identical to `src/chesslab/move_tracker/intrinsic.py` (phase 00):
same basis vectors, same clamp-to-1, same P1/P99, same Scott-rule entropy loop
(0..179°, 1° steps). Iterate over a `ByteArray` fetched with `Mat.get(0,0,buf)`
(pattern: `BoardFramePipeline.toGrayImage`, BoardFramePipeline.kt:101-105) — do NOT
per-pixel `Mat.get`. A 256-entry `ln` DoubleArray LUT for the channel logs.

Pipeline seam — `BoardFramePipeline` (android/.../service/BoardFramePipeline.kt):

```kotlin
class BoardFramePipeline(
    warper: BoardWarper,
    @Volatile var claheClip: Double,
    /** Non-null = intrinsic channel active: replaces cvtColor-gray, skips CLAHE. */
    @Volatile var intrinsic: IntrinsicGray? = null,
)
```

In `process(...)`: `meanLuma` stays computed from the PLAIN gray exactly as today
(dark gate contract, see the `// Measured pre-CLAHE` comment). After that:
if `intrinsic != null`, produce `detectGray` via `intrinsic.apply(detectBgr)` (then
release the cvtColor gray it replaces), and `preprocessGray` must skip CLAHE for
this frame (blur only). Keep the `!whitePov` rotation order unchanged (rotate FIRST,
then transform — rotation is pixel-permutation, transform is per-pixel, order is
actually free; keep rotation-first to minimize the diff).

## Steps

### 1. `IntrinsicGray.kt` (new) — commit `feat(android): IntrinsicGray — finlayson invariant transform + calibration port`

### 2. Golden parity test — commit `test(android): intrinsic golden parity vs python`
`android/app/src/test/kotlin/com/chesslab/tracker/service/IntrinsicGrayTest.kt`:
regenerate the 16×16 input from the formula in the golden JSON (read the JSON by
walking up from `user.dir` to `tests/data/`, pattern:
`ClipReplayTest.findClipsDir`, android/engine/src/test/.../ClipReplayTest.kt), run
`IntrinsicGray(calib).apply`, assert every pixel within ±1 of the golden output.
Pure-JVM test: build the input as a Mat via OpenCV test deps if available in app
unit tests — check first with `grep -rn "Imgcodecs\|Mat(" android/app/src/test`; if
app unit tests have no native OpenCV, restructure `IntrinsicGray` so the core math
takes `ByteArray + width/height` (testable) and only a thin `Mat` adapter is
untested — record the choice in STATUS.md.

### 3. Pipeline seam — commit `feat(android): intrinsic channel seam in BoardFramePipeline`
Constructor param + process() branch + CLAHE skip, per Design. No settings wiring
yet (phase 02).

## Tests (write, run once, targeted)

`gradlew :app:testDebugUnitTest --tests '*IntrinsicGray*'` ONCE. Cases:
golden parity (±1 u8); calibrate() on the formula image reproduces the JSON's
angle ±3°; shadow-invariance smoke (port of Python test 1, same synthetic data).

## Acceptance criteria

- Golden parity test green at ±1 u8.
- `grep -n "intrinsic" android/engine/src -r` → NO hits (engine untouched).
- `BoardFramePipeline` with `intrinsic = null` byte-identical behavior to before
  (existing pipeline tests stay green: `gradlew :app:testDebugUnitTest` scoped run
  by the orchestrator, not you).
- Scoped ktlint/detekt clean, no suppressions.

## Do NOT

- No settings/UI/DataStore wiring (phase 02).
- No engine changes, no changes to `meanLuma`/dark-gate semantics.
- Do not run assembleDebug or the clip replays (orchestrator).
