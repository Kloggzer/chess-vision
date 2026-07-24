# Phase 01d — motion score, per-square noise model, baseline occlusion/shadow

## Why

Three pieces that gate the whole state machine:

- `motion_score` decides `waiting` vs `moving` — it counts pixels over a threshold
  (percent), NOT a mean absdiff; the old mean formulation could not tell a hand from a
  desk wobble and parked the tracker in `moving` forever.
- `SquareNoise` is the per-square EMA that turns raw diffs into z-scores. Its two
  instances have DIFFERENT constants, and its exclusion semantics (gray lane learns
  nothing on candidates, census lane learns at 1/8 rate) were both hard-won live fixes.
- `_baseline_occlusion_and_shadow` classifies strong-absdiff squares as occluder vs cast
  shadow, and returns a **raw undilated core** that entry.md invariant 3 depends on.

Reference: `src/chesslab/move_tracker/tracker.py` `motion_score` `:358`,
`_SQ_NEIGHBOURS` `:369`, `_baseline_occlusion_and_shadow` `:386`, `SquareNoise` `:500`;
call sites `_loop` `:1603` (motion) and `:1612` (baseline), constructor `:752` and `:761`
(the two noise instances), `_compute_evidence` `:3117`.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Motion.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/SquareNoise.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/BaselineOcclusion.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/MotionNoiseParityTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/BaselineOcclusionUnitTest.kt
```

Nothing else. `ParityFixtures.kt` is phase 00b's — read only.

## Contract from 01a/01b/01c (do not re-create these)

```kotlin
Squares.ALL, Squares.maskToSet, SquareBoxes, squareBoxes(...), regionMeans(...),
integral(...), integralAbsDiff(...)                                     // 01a
perSquareCensusChange(refCodes, curGray, boxes, out, rows)              // 01b
occlusionColorSquares(curLab, curHsv, width, gamut, boardSize, whitePov,
                      candidates, thr, extendUp)                        // 01c
```

Code against these signatures; if the landed ones differ, adapt YOUR files and record it
in `STATUS.md`. Never edit another agent's file. Your module will only compile once
01a–01c have landed — that is expected; run tests at the end of the phase.

## Design (decided — do not redesign)

`internal`, package `com.chesslab.engine`. Primitives only.

### `Motion.kt`

```kotlin
/** Python motion_score (tracker.py:358). PERCENT of pixels whose |delta| exceeds pxThr. */
internal fun motionScore(prev: ByteArray, cur: ByteArray, pxThr: Double = 20.0): Double
```

`count(|cur[i] - prev[i]| > pxThr) / n * 100.0`, unsigned bytes, **strict `>`**, `n` =
array length, `0.0` for an empty array. Sizes must match — throw otherwise. This is a
percentage in 0..100 and is compared against `motionThr = 0.25`; never return a fraction.

### `SquareNoise.kt`

```kotlin
/** Python SquareNoise (tracker.py:500). Per-square EMA of mean and mean-abs-deviation,
 *  run on the MEDIAN-NORMALIZED channel. */
internal class SquareNoise(
    private val alpha: Double = 0.05,
    initStd: Double = 6.0,
    private val stdFloor: Double = 3.0,
) {
    val mean = DoubleArray(64)
    val std = DoubleArray(64) { initStd }

    /** exclude == null means "exclude nothing". */
    fun update(diffs: DoubleArray, exclude: BooleanArray? = null, excludeAlphaScale: Double = 0.0)
    fun z(diffs: DoubleArray, out: DoubleArray): DoubleArray
}
```

Defaults are the **gray** lane: `alpha = 0.05, initStd = 6.0, stdFloor = 3.0`
(`:515`). The **census** lane is constructed as `SquareNoise(initStd = 8.0,
stdFloor = 2.5)` (`:761`) — flat squares produce census tie-flip noise from frame one, so
it starts wide and floors lower. Do not unify them.

`update`, per square `i`:

```
a = if (exclude != null && exclude[i]) alpha * excludeAlphaScale else alpha
if (a == 0.0) continue                       // excluded squares learn NOTHING at scale 0
val m = mean[i]                              // OLD mean
mean[i] = (1 - a) * m + a * d
std[i]  = max(stdFloor, (1 - a) * std[i] + a * abs(d - m))     // deviation vs the OLD mean
```

- The `a == 0.0` skip is exact-equality on `Double`, as in Python (`:534`).
- `excludeAlphaScale`: the gray lane passes **0.0** (learning a shadow/hand inflates std
  and desensitizes real moves there); the census lane passes **0.125** — the SLOW LANE.
  Full exclusion deadlocks the census channel: a flat square whose tie-flip noise fires
  from frame one would be excluded forever and stay hot (observed live on empty b1/b8).
- `z(d) = (d - mean[i]) / std[i]`; `std` can never be 0 thanks to the floor.
- No `reset()` — the tracker constructs a fresh instance when it needs one, as Python
  does. No `Map` API.

### `BaselineOcclusion.kt`

```kotlin
/** Orthogonal (4-)neighbours per square index, Python _SQ_NEIGHBOURS (tracker.py:369). */
internal val SQ_NEIGHBOURS: Array<IntArray>          // 64 entries, indices into Squares.ALL

internal class BaselineResult(
    val occluded: BooleanArray,   // DILATED occluded
    val shadow: BooleanArray,     // DILATED shadow MINUS dilated occluded
    val core: BooleanArray,       // RAW UNDILATED occluded core
)

/** Python _baseline_occlusion_and_shadow (tracker.py:386). */
internal fun baselineOcclusionAndShadow(
    curGray: GrayImage, refGray: GrayImage, boardSize: Int, absThr: Double,
    whitePov: Boolean, boxes: SquareBoxes,
    refCodes: ByteArray? = null, occlCensusThr: Double = 0.0,
    curLab: ByteArray? = null, curHsv: ByteArray? = null,
    gamut: ColorGamut? = null, colorThr: Double = 0.0,
): BaselineResult
```

`boxes` is the caller's `_det_boxes` — built with **`extendUp = 0.0`** (`:820`). `absThr`
is passed by the caller as **`motionPxThr * 4` = 80.0** (`:1614`); do not hardcode it,
do not derive it here.

Algorithm, transcribed:

```
occMeans = regionMeans(integralAbsDiff(cur, ref), boxes)
curMeans = regionMeans(integral(cur), boxes)
refMeans = regionMeans(integral(ref), boxes)
strong   = { i : occMeans[i] > absThr }                       // strict >

cens = null; chromaOut = empty
if (strong.isNotEmpty() && occlCensusThr > 0 && refCodes != null) {
    rows = intArrayOf(min over strong of y0 - 1, max over strong of y1 + 1)
    cens = perSquareCensusChange(refCodes, curGray, boxes, rows = rows)   // extendUp 0 boxes
    if (curLab != null && gamut != null && colorThr > 0)
        chromaOut = occlusionColorSquares(curLab, curHsv, ..., candidates = strong,
                                          thr = colorThr, extendUp = 0.0)
}

for each square i:
    if (occMeans[i] > absThr) {
        if (cens == null)                              occluded += i     // legacy: brightness only
        else if (cens[i] > occlCensusThr ||                              // structured occluder
                 i in chromaOut ||                                       // skin/fabric chroma outlier
                 curMeans[i] >= refMeans[i])            occluded += i    // flat BRIGHTENER: conservative
        else                                            shadow += i      // flat + darker + chroma-consistent
    } else if (refMeans[i] - curMeans[i] > absThr / 2)  shadow += i      // weak darkening
```

Then dilate both sets by their orthogonal neighbours and return
`BaselineResult(dilatedOcc, dilatedShadow - dilatedOcc, occludedRaw)`.

**The third return is the RAW UNDILATED occluded core and callers depend on it**
(entry.md invariant 3, comment `:447-453`): the `>2 → occluded state` gate counts the
core, never the dilated set. One genuinely strong square (a dark knight arriving on a
light square) dilates to 5 and used to lock the tracker in the occluded state, where
`_try_detect` — and with it the CNN move-vs-hand arbitration — never runs. Dilation still
protects the z-taint. Never return the dilated set in the third slot, never let a caller
"simplify" to two returns.

`SQ_NEIGHBOURS` contains only the four orthogonal neighbours (rank ±1, file ±1), never
diagonals. Build it once as a top-level `val` over `Squares.ALL` indices.

## Steps

### 1. `Motion.kt` — commit `feat(engine): pixel-count motion score`
### 2. `SquareNoise.kt` — commit `feat(engine): per-square EMA noise model with slow-lane exclusion`
### 3. `BaselineOcclusion.kt` — commit `feat(engine): baseline occlusion/shadow classification with raw core`
### 4. Tests — commit `test(engine): motion, noise and baseline-occlusion parity against Python fixtures`

## Tests

`MotionNoiseParityTest` — fixtures via `ParityFixtures.kt`:

- `motionScoreMatchesPython` — fixture frame pairs (still, wobble, hand) at
  `pxThr = 20.0`: within **1e-4 relative**.
- `squareNoiseTraceMatchesPython` — replay the fixture's recorded diff sequence through
  both lanes (gray `6.0/3.0/scale 0.0`, census `8.0/2.5/scale 0.125`) with the recorded
  exclude sets; `mean`, `std` and `z` after every step within **1e-4 relative**.
- `baselineOcclusionMatchesPython` — the hand-over-board fixture with
  `absThr = 80.0, occlCensusThr = 24.0, colorThr = 3.0`: all three returned sets
  **EXACTLY** equal to Python's (`Squares.maskToSet` for comparison), including the
  distinction between `core` and dilated `occluded`.

`BaselineOcclusionUnitTest` — hand-written:

- identical frames → all three sets empty;
- one strong square with high census change → occluded; its 4 orthogonal neighbours
  appear in the dilated set but **not** in `core`; `core.size == 1`;
- one strong square that is flat, darker and chroma-consistent → shadow, `core` empty;
- a flat BRIGHTER strong square (`curMean >= refMean`) → occluded, not shadow;
- weak darkening (`refMean - curMean` just above `absThr / 2`) → shadow;
- `shadow` and `occluded` are disjoint after dilation;
- corner square `a1` has exactly 2 neighbours, edge `a4` has 3, interior `d4` has 4;
- `SquareNoise.update` with an empty/`null` exclude learns every square; with
  `excludeAlphaScale = 0.0` an excluded square's `mean`/`std` are bit-identical
  afterwards; with `0.125` it moves by exactly one eighth of the unexcluded step;
- `std` never drops below its floor; `z` of a fresh model on a zero diff is `0.0`;
- `motionScore` on identical arrays is `0.0`, on a fully saturated flip `100.0`, and a
  uniform +19 shift at `pxThr = 20.0` is `0.0` (the wobble case).

Run once, at the end of the phase:

```
cd android; .\gradlew.bat :core-engine:test --tests "com.chesslab.engine.MotionNoiseParityTest" --tests "com.chesslab.engine.BaselineOcclusionUnitTest"
```

Then `.\gradlew.bat :core-engine:ktlintFormat` and `.\gradlew.bat :core-engine:detekt`.

## Performance

`motionScore` walks 640k pixels per frame; `baselineOcclusionAndShadow` runs during
motion/occlusion states at ~18 fps. Rules: `ByteArray` input, `LongArray` integrals,
`BooleanArray(64)` sets (no `Set<String>`/`HashSet` inside the pixel path — convert only
at the api seam), `DoubleArray` per-square buffers owned by the caller and reused; no
boxing, no per-pixel allocation, no streams. The census band fast path exists precisely so
this function does not re-encode the full frame — always pass `rows`. Correctness first:
do not fuse the three `regionMeans` passes into a hand-rolled loop that changes rounding.

## Do NOT

- Do not return a fraction from `motionScore`; the caller compares against 0.25 percent.
- Do not collapse `BaselineResult` to two sets, and do not dilate the `core`.
- Do not add diagonals to `SQ_NEIGHBOURS`.
- Do not unify the two `SquareNoise` constant sets, and do not remove the `std` floor.
- Do not median-normalize inside these files.
- Do not touch 01a's, 01b's or 01c's files, or `ParityFixtures.kt`.
- Do not read `android-legacy/**` for logic.
