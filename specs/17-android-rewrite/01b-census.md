# Phase 01b — census transform and the structural evidence channel

## Why

The census channel is what sees dark-piece-on-dark-square moves that the gray mean-diff
dilutes away, and it is what tells a cast shadow (monotone darkening → code unchanged)
apart from an arriving piece (structure → code changes). It carries two live-tuned
thresholds (`censusThr = 40.0`, `occlCensusThr = 24.0`) that are only meaningful if the
code, the padding and the scaling are bit-for-bit Python's.

Reference: `src/chesslab/move_tracker/tracker.py` `_POPCOUNT8` `:189`,
`census_transform` `:192`, `per_square_census_change` `:220`; consumers
`_compute_evidence` `:3104`, `_apply_vetoes` `:3159`, `_baseline_occlusion_and_shadow`
`:424`.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Census.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/CensusParityTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/CensusUnitTest.kt
```

Nothing else. `ParityFixtures.kt` is phase 00b's — read only.

## Contract from 01a (do not re-create these)

`Squares.ALL`, `SquareBoxes`, `squareBoxes(boardSize, whitePov, extendUp)`,
`integral(data, w, h)`, `regionMeans(ii, width, boxes, out)`. If 01a has not landed when
you start, code against these signatures; if the landed signatures differ, adapt YOUR
file and note it in `STATUS.md` — never edit 01a's files.

## Design (decided — do not redesign)

`internal`, package `com.chesslab.engine`. Primitives only.

```kotlin
/** Popcount of 8-bit census codes, `_POPCOUNT8` (tracker.py:189). */
internal val POPCOUNT8: IntArray   // 256 entries, IntArray (not ByteArray — used as an addend)

/**
 * 3x3 census transform. Python census_transform (tracker.py:192).
 * @param eps comparison deadband. MUST stay 0 — see below.
 * Output is one byte per pixel, same width/height as the input.
 */
internal fun censusTransform(
    gray: ByteArray, width: Int, height: Int,
    yLo: Int = 0, yHi: Int = height, eps: Int = 0, out: ByteArray,
): ByteArray

/**
 * Mean Hamming distance of census codes per square, scaled to 0..255.
 * Python per_square_census_change (tracker.py:220).
 */
internal fun perSquareCensusChange(
    refCodes: ByteArray, curGray: GrayImage, boxes: SquareBoxes,
    out: DoubleArray, rows: IntArray? = null,   // rows = intArrayOf(yLo, yHi) band fast path
): DoubleArray
```

### `censusTransform`

- Neighbour order is the **row-major 3×3 scan skipping the centre**, bit index 0..7 in
  that order: `(dy,dx) = (-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)`.
- Bit `b` is set iff `center > neighbour + eps`, compared as **signed ints** on unsigned
  byte values (`x.toInt() and 0xFF`) — Python widens to `int16` first for exactly this
  reason.
- **Padding is `BORDER_REPLICATE`** (edge pixels repeat), implemented by clamping the
  neighbour coordinate into `[0, width-1]` / `[bandLo, bandHi-1]`. It is **never a
  wrap/roll** — a roll compares row 0 against the last row and poisons the edge squares'
  census scores (entry.md invariant 7, `census_transform` comment `:204`).
- **`eps` stays 0.** Any `eps > 0` breaks the monotone-brightness invariance (pixels in
  the `[eps, eps/ratio)` contrast band flip under multiplicative darkening) and the shadow
  behaviour collapses. Keep the parameter for parity with Python, default 0, and never
  pass anything else from the engine.
- `yLo`/`yHi` transform only that row band; replication then happens at the **band**
  edges, which is precisely what Python's `census_transform(cur_gray[y_lo:y_hi])` does.
  Do not "improve" this by reading rows outside the band — the ±1 halo guard below
  compensates for it and the parity fixtures encode the current behaviour.

### `perSquareCensusChange`

Full path (`rows == null`):

```
ham[p]  = POPCOUNT8[(refCodes[p].toInt() xor curCodes[p].toInt()) and 0xFF]
out[i]  = regionMean(ham, box_i) * (255.0 / 8.0)
```

Band fast path (`rows != null`, requires precomputed `refCodes`) — transcribe `:236-248`
exactly:

```
yLo = max(0, rows[0]); yHi = min(boardSize, rows[1])
curCodes = censusTransform(curGray, yLo = yLo, yHi = yHi)
ham      = popcount(refCodes[yLo until yHi] xor curCodes)      // band-height buffer
ii       = integral(ham, width, yHi - yLo)
for each square i:
    inBand = area[i] > 0 &&
             y0[i] >= yLo + (if (yLo > 0) 1 else 0) &&
             y1[i] <= yHi - (if (yHi < boardSize) 1 else 0)
    out[i] = if (inBand) (boxSum(ii, x0, y0 - yLo, x1, y1 - yLo) / area[i]) * (255.0 / 8.0)
             else 0.0
```

`boardSize` is `boxes`-derived — pass it explicitly if `SquareBoxes` does not carry it;
do not infer it from the image height. **Squares outside the band read 0.0, and callers
must only consult squares whose boxes lie inside the band** — that is the caller's
contract, not something you defend against here.

The `* 255/8` scaling makes the channel comparable to the gray diff and to `censusThr`.
Never normalize inside this function: `censusThr` (40.0) compares against the **RAW**
census channel; median normalization happens in the caller and a raw copy is kept
(`_cens_raw` `:3115`, entry.md invariant 8).

## Steps

### 1. `Census.kt` — census transform — commit `feat(engine): 3x3 census transform with replicate padding`
### 2. `Census.kt` — per-square change + band fast path — commit `feat(engine): per-square census change with band fast path`
### 3. Tests — commit `test(engine): census parity against Python fixtures`

## Tests

`CensusParityTest`, fixtures via `ParityFixtures.kt`:

- `censusCodesMatchPython` — full-image codes on the fixture gray at `detSize = 800`:
  **byte-exact** for every pixel (compare as unsigned).
- `perSquareCensusChangeMatchesPython` — ref/cur fixture pair, `extendUp = 0.25`: every
  square within **1e-4 relative**.
- `bandFastPathMatchesPythonBand` — same fixture with the fixture's `rows` band: matches
  Python's banded result within 1e-4 relative, including the squares that must be 0.0.
- `bandInteriorEqualsFullTransform` — for squares fully inside the band with a ≥1 px halo,
  the banded result equals the full-path result within 1e-4 relative (the property the
  fast path relies on).

`CensusUnitTest` — hand-written:

- constant image → all codes 0, change 0.0;
- **monotone darkening invariance**: `cur = (ref * 0.6)` on a textured patch leaves the
  codes almost unchanged and the per-square change far below `censusThr = 40.0`
  (this is the test `eps > 0` breaks — keep it as the guard);
- replicate vs roll: a bright top row and dark bottom row must NOT make the top-rank
  squares hot (a rolled implementation does);
- `POPCOUNT8[0xFF] == 8`, `POPCOUNT8[0] == 0`, max per-square change is `255.0`;
- zero-area box → 0.0; band that covers nothing (`yLo >= yHi`) → all 0.0.

Run once, at the end of the phase:

```
cd android; .\gradlew.bat :core-engine:test --tests "com.chesslab.engine.CensusParityTest" --tests "com.chesslab.engine.CensusUnitTest"
```

Then `.\gradlew.bat :core-engine:ktlintFormat` and `.\gradlew.bat :core-engine:detekt`.

## Performance

The census transform is the single hottest pixel loop (640k pixels × 8 comparisons at
~18 fps). Rules: `ByteArray` in, `ByteArray` out, caller-supplied `out` buffers reused
across frames (size-keyed scratch inside `Census.kt` is fine — single-threaded engine);
one flat index walk, no 2D indexing helpers, no `Byte` boxing, no lambdas per pixel;
`POPCOUNT8` is an `IntArray` lookup, never `Integer.bitCount` on a boxed value. The
reference codes are computed once per reference by the caller and passed in. Correctness
first: do not vectorize into a different comparison order.

## Do NOT

- Do not change `eps` from 0, do not expose an `eps` knob to config.
- Do not use wrap/roll padding, do not skip border pixels.
- Do not median-normalize inside this file.
- Do not touch `Squares.kt`, `SquareRegion.kt`, `Integral.kt`, `SquareDiff.kt`,
  `Normalize.kt` (01a), `ShadowVeto.kt`/`ColorSpace.kt`/`Gamut.kt` (01c),
  `Motion.kt`/`SquareNoise.kt`/`BaselineOcclusion.kt` (01d), or `ParityFixtures.kt` (00b).
- Do not read `android-legacy/**` for logic.
