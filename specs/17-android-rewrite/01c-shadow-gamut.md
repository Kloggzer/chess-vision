# Phase 01c — colour space, HSV shadow veto, board colour gamut

## Why

Two of the tracker's three vetoes are colour-based: the Cucchiara HSV cast-shadow test
(shadow squares leave `changed` but KEEP their z) and the Lab/saturation gamut outlier
test that recognizes a hand/arm/sleeve (occlusion — z is ZEROED). Both are pure
arithmetic over per-square colour means, so they belong in `:core-engine`
(entry.md hard rule 1) — **but OpenCV is not on `:core-engine`'s classpath, so the two
colour conversions must be implemented by hand** and must reproduce OpenCV's 8-bit
conventions, because every threshold was tuned against OpenCV's numbers.

Reference: `src/chesslab/move_tracker/tracker.py` `hsv_shadow_squares` `:257`,
`board_color_gamut` `:284`, `occlusion_color_squares` `:322`; consumers `_apply_vetoes`
`:3162`, `_baseline_occlusion_and_shadow` `:426`, `set_ref` gamut rebuild `:2570`.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/ColorSpace.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/ShadowVeto.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Gamut.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/ColorSpaceParityTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/ShadowGamutParityTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/GamutUnitTest.kt
```

Nothing else. `ParityFixtures.kt` is phase 00b's — read only.

## Contract from 01a (do not re-create these)

`Squares.ALL`, `squareRegion(square, boardSize, whitePov, inset, extendUp): IntArray`,
`SquareBoxes`. If 01a has not landed yet, code against these signatures and record any
landed deviation in `STATUS.md` — never edit 01a's files.

## Design (decided — do not redesign)

`internal`, package `com.chesslab.engine`. Primitives only.

### `ColorSpace.kt` — hand-written BGR→HSV and BGR→Lab

```kotlin
/** Interleaved BGR (stride = w*3) -> interleaved HSV, OpenCV 8-bit convention:
 *  H in 0..179, S in 0..255, V in 0..255. */
internal fun bgrToHsv(bgr: ByteArray, width: Int, height: Int, out: ByteArray): ByteArray

/** Interleaved BGR -> interleaved Lab, OpenCV 8-bit convention (sRGB input, D65):
 *  L in 0..255 (= L* * 255/100), a = a* + 128, b = b* + 128, all saturated to 0..255. */
internal fun bgrToLab(bgr: ByteArray, width: Int, height: Int, out: ByteArray): ByteArray
```

HSV (`cv2.COLOR_BGR2HSV`, 8-bit), per pixel with `R,G,B` as ints 0..255:

```
V = max(R,G,B); mn = min(R,G,B); d = V - mn
S = if (V == 0) 0 else round(255.0 * d / V)
h = when { d == 0   -> 0.0
           V == R   -> 60.0 * (G - B) / d
           V == G   -> 120.0 + 60.0 * (B - R) / d
           else     -> 240.0 + 60.0 * (R - G) / d }
if (h < 0) h += 360.0
H = round(h / 2.0); if (H >= 180) H -= 180      // 0..179
```

Lab (`cv2.COLOR_BGR2LAB`, 8-bit — OpenCV assumes **sRGB** input and applies the gamma):

```
c  = C / 255.0                                        // per channel
lin(c) = if (c <= 0.04045) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
X = 0.412453*R + 0.357580*G + 0.180423*B              // linearized R,G,B
Y = 0.212671*R + 0.715160*G + 0.072169*B
Z = 0.019334*R + 0.119193*G + 0.950227*B
X /= 0.950456; Z /= 1.088754                          // D65 white point, Yn = 1.0
f(t) = if (t > 0.008856) cbrt(t) else 7.787*t + 16.0/116.0
L* = if (Y > 0.008856) 116.0 * cbrt(Y) - 16.0 else 903.3 * Y
a* = 500.0 * (f(X) - f(Y));  b* = 200.0 * (f(Y) - f(Z))
L8 = saturate(round(L* * 255.0 / 100.0)); a8 = saturate(round(a* + 128.0)); b8 = saturate(round(b* + 128.0))
```

`saturate` clamps to 0..255 (OpenCV's `saturate_cast<uchar>`). OpenCV's 8-bit path uses
integer LUT approximations, so **bit-exact equality is not achievable and not required**:
the acceptance bound is **≤ 1 LSB per channel** against the 00b fixtures, which is far
below the resolution of any threshold in this pack.

Both functions write interleaved 3-channel output into a caller-owned `ByteArray`. The
gamut/shadow code only ever needs Lab a*, Lab b* and HSV S — but convert whole images
(as Python does) so the per-square means match.

### `ShadowVeto.kt`

```kotlin
/** Python hsv_shadow_squares (tracker.py:257). Cucchiara HSV cast-shadow test. */
internal fun hsvShadowSquares(
    refHsv: ByteArray, curHsv: ByteArray, width: Int,
    boardSize: Int, whitePov: Boolean, candidates: Collection<String>,
    vLo: Double = 0.35, vHi: Double = 0.97,
    hTol: Double = 15.0, sTol: Double = 40.0, frac: Double = 0.5,
    extendUp: Double = 0.0,
): Set<String>
```

Parameters are the live-tuned Cucchiara constants — **keep every default exactly:
`vLo = 0.35, vHi = 0.97, hTol = 15.0, sTol = 40.0, frac = 0.5`.** Only `candidates`
(already-changed squares) are examined. Per candidate, over the box
`squareRegion(sq, boardSize, whitePov, extendUp = extendUp)`:

```
if (region is empty)  continue          // skip, do NOT add
per pixel:
    ratio = Vc / (Vr + 1e-3)
    dh    = abs(Hc - Hr); dh = min(dh, 180.0 - dh)      // hue is circular over 0..179
    ds    = Sc - Sr                                      // SIGNED
    shadowPx = ratio >= vLo && ratio <= vHi && dh <= hTol && ds <= sTol
square is shadow iff  mean(shadowPx) >= frac  &&  mean(Vc) < mean(Vr)
```

Both conditions are required. `ratio` uses the `+1e-3` guard verbatim. Accumulate in
`Double`; the shadow count is an `Int`, the V means are `Double` sums / pixel count.

The caller (phase 03b) additionally requires `censusRaw[sq] < censusThr` before vetoing
— that is NOT your concern; return the pure HSV verdict.

### `Gamut.kt`

```kotlin
/** Reference-board colour model. Feature per square: [Lab a*, Lab b*, HSV S] — L* is
 *  DELIBERATELY DROPPED (exposure/shadow robustness). Python board_color_gamut (:284). */
internal class ColorGamut(
    val mu: DoubleArray,        // 3
    val invCov: DoubleArray,    // 3x3 row-major
    val feats: DoubleArray,     // n*3 row-major, n = usable squares
    val n: Int,
)

internal fun boardColorGamut(
    refLab: ByteArray, refHsv: ByteArray, width: Int, boardSize: Int, whitePov: Boolean,
): ColorGamut?

/** Python occlusion_color_squares (tracker.py:322). */
internal fun occlusionColorSquares(
    curLab: ByteArray, curHsv: ByteArray, width: Int, gamut: ColorGamut?,
    boardSize: Int, whitePov: Boolean, candidates: Collection<String>,
    thr: Double = 4.0, extendUp: Double = 0.0,
): Set<String>
```

`boardColorGamut`:

- Iterate `Squares.ALL` with `squareRegion(sq, boardSize, whitePov)` — **base box,
  `extendUp = 0.0`, default inset 0.16**.
- Skip empty regions. Feature = `[mean(Lab ch1), mean(Lab ch2), mean(HSV ch1)]`, i.e.
  `a*`, `b*`, `S` in their 8-bit encodings (a*/b* offset by 128 — do NOT re-centre them;
  the covariance absorbs the offset and the thresholds were tuned on these numbers).
- **Fewer than 8 usable squares → return `null`** (`:308`).
- `mu` = column means. `cov` = the **sample covariance with denominator (n - 1)**
  (`np.cov` default) **plus `4.0 * I`** — the regularizer that keeps a flat chroma axis
  from exploding the distance (`:314`). Then invert the 3×3 analytically (adjugate /
  determinant). If `abs(det)` is ~0 (`< 1e-12`) return `null` — mirrors Python's
  `LinAlgError` branch.
- Python computes in `float32`, we compute in `Double`. Accept the difference; do not
  emulate float32.

`occlusionColorSquares`:

- Guard first: `gamut == null || candidates.isEmpty() || thr <= 0.0` → empty set.
- `thr2 = thr * thr`.
- A box is an outlier iff its feature `f` satisfies
  `min over ALL n reference features of ((ref_j - f)^T · invCov · (ref_j - f)) > thr2`.
  **This is a NEAREST-NEIGHBOUR test over the reference squares, NOT a distance to
  `mu`** — a dark piece landing on a light square matches some square that already
  carries a dark piece; skin/fabric matches none. A mean-based test flags the piece and
  stalls detection (`:293-295`, `:326-330`). `mu` is kept in `ColorGamut` only because
  Python returns it; nothing consumes it.
- Empty region → not an outlier (`false`).
- Per candidate: check the **base box** (`extendUp = 0.0`) and, **only if
  `extendUp > 0`**, additionally the extended box; outlier on either → occluded
  (`:350-354`). Note `_baseline_occlusion_and_shadow` calls this with the default
  `extendUp = 0.0`, so only the base box is checked there.
- Default `thr = 4.0` here, but the engine passes `TrackerConfig.occlusionColorThr`
  (**3.0** from `config.py` TRACK_DEFAULTS — entry.md; the Python constructor's 1.5 and
  the stale docs' 1.5 both lose).

## Steps

### 1. `ColorSpace.kt` — commit `feat(engine): hand-rolled BGR->HSV/Lab matching OpenCV 8-bit conventions`
### 2. `ShadowVeto.kt` — commit `feat(engine): Cucchiara HSV cast-shadow veto`
### 3. `Gamut.kt` — commit `feat(engine): board colour gamut and nearest-neighbour Mahalanobis occlusion`
### 4. Tests — commit `test(engine): colour-space, shadow and gamut parity against Python fixtures`

## Tests

`ColorSpaceParityTest` — **required**, this is the load-bearing risk of the phase:

- `bgrToHsvMatchesOpenCv` / `bgrToLabMatchesOpenCv` — against the OpenCV-produced
  fixture from phase 00b (the fixture must include a full 0..255 sweep patch plus a real
  board crop): max abs per-channel difference **≤ 1**, and mean abs difference `< 0.2`.
- `hueIsCircular` — pure red maps to `H == 0` (never 180).

`ShadowGamutParityTest` — fixtures via `ParityFixtures.kt`:

- `hsvShadowSquaresMatchPython` — the fixture's shadow frame and candidate set →
  returned set **EXACTLY** equal to Python's.
- `boardColorGamutMatchesPython` — `invCov` entries within **1e-4 relative** of Python's
  (recomputed from the fixture's own features to isolate the colour-conversion error;
  the fixture must carry both the input image and Python's features), `n == 64`.
- `occlusionColorSquaresMatchPython` — hand-over-board fixture frame, candidate set from
  the fixture, `thr = 3.0` → set **EXACTLY** equal.

If a set mismatches on a single borderline square, do NOT tune a threshold: record it in
`STATUS.md` with the two distances so the orchestrator can regenerate a non-borderline
fixture.

`GamutUnitTest` — hand-written:

- fewer than 8 usable squares (`inset = 0.5` → all boxes degenerate) → `null`;
- perfectly uniform board (zero chroma variance) → `4.0 * I` regularizer keeps it
  invertible, `invCov` = `0.25 * I`, and a same-coloured square is NOT an outlier;
- empty candidate set → empty result, no conversion work;
- `thr <= 0.0` → empty result; `gamut == null` → empty result;
- shadow test: a globally scaled-down copy (`cur = 0.7 * ref`) of a candidate square IS
  shadow; a re-coloured (hue-shifted) square is NOT; a BRIGHTER copy is NOT (the
  `mean(Vc) < mean(Vr)` guard).

Run once, at the end of the phase:

```
cd android; .\gradlew.bat :core-engine:test --tests "com.chesslab.engine.ColorSpaceParityTest" --tests "com.chesslab.engine.ShadowGamutParityTest" --tests "com.chesslab.engine.GamutUnitTest"
```

Then `.\gradlew.bat :core-engine:ktlintFormat` and `.\gradlew.bat :core-engine:detekt`.

## Performance

Two 800×800×3 conversions per frame at ~18 fps. Rules: `ByteArray` in / `ByteArray` out
with caller-owned reusable buffers (size-keyed scratch inside the file is fine — the
engine is single-threaded); one flat index walk; no per-pixel object, no `FloatArray`
boxing, no `Triple`. Precompute the sRGB-linearization LUT as a `DoubleArray(256)` and
the `L8` mapping once — that removes the `pow` from the pixel loop. Per-square means
accumulate into local `Double`s. Correctness first: no SIMD-shaped rewrite of the
formulas.

## Do NOT

- Do not add an OpenCV dependency to `:core-engine` (`ClasspathPurityTest` will fail).
- Do not include `L*` in the gamut feature; do not re-centre a*/b*.
- Do not replace the nearest-neighbour Mahalanobis with a distance to `mu`.
- Do not change the Cucchiara constants or drop the `mean(Vc) < mean(Vr)` guard.
- Do not apply the census threshold here (that is the caller's job, phase 03b).
- Do not touch 01a's, 01b's or 01d's files, or `ParityFixtures.kt`.
- Do not read `android-legacy/**` for logic.
