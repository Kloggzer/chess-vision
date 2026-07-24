# Phase 01a — square geometry, integral images, gray diff channel

## Why

Everything downstream indexes squares in exactly one order and reads pixels through
exactly one box definition. The legacy port had two competing square orders and its own
box rounding, so every threshold in the pack was compared against slightly different
pixels than Python compares them against. This spec establishes the single canonical
geometry (`_ALL` order, `square_region` rounding) and the gray evidence channel on top of
it: `per_square_diff` → `normalize_diffs`.

Reference (source of truth): `src/chesslab/move_tracker/tracker.py`
`_ALL` `:53`, `_square_boxes` `:99`, `_region_means` `:110`, `square_region` `:119`,
`square_center` `:133`, `per_square_diff` `:139`, `normalize_diffs` `:487`;
`src/chesslab/calibration.py::_square_to_col_row` `:329`.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Squares.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/SquareRegion.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Integral.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/SquareDiff.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Normalize.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/SquareDiffParityTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/SquareGeometryTest.kt
```

Own nothing else. `ParityFixtures.kt` belongs to phase 00b — read it, never edit it.
**01b, 01c and 01d compile against your API and cannot start until it exists.** Publish
the signatures below verbatim; any deviation is a phase-wide blocker, record it in
`STATUS.md` immediately rather than silently renaming.

## Design (decided — do not redesign)

All declarations are `internal`, package `com.chesslab.engine`. Primitives only:
`ByteArray`/`IntArray`/`LongArray`/`DoubleArray`, no boxing, no per-pixel allocation.
**Engine internals pass per-square values as `DoubleArray(64)` indexed by `Squares.ALL`,
never as `Map<String, Double>`** — maps are built once at the `api` seam
(`TrackerStatus`).

### `Squares.kt`

```kotlin
internal object Squares {
    const val FILES = "abcdefgh"
    /** 64 names, rank-major from rank 1: a1,b1,…,h1,a2,…,h8. Python `_ALL` (tracker.py:53). */
    val ALL: List<String>
    fun index(square: String): Int              // -1 if unknown
    /** Packed (col shl 3) or row — calibration.py `_square_to_col_row` (:329). No Pair, no boxing. */
    fun colRow(square: String, whitePov: Boolean): Int
    fun colOf(packed: Int): Int
    fun rowOf(packed: Int): Int
    fun maskToSet(mask: BooleanArray): Set<String>   // ordered by ALL
    fun setToMask(squares: Collection<String>): BooleanArray
}
```

`colRow`: `col = FILES.indexOf(file)`, `row = 8 - rank`; if `!whitePov` then
`col = 7 - col; row = 7 - row`. Throw `IllegalArgumentException` on a malformed square or
a rank outside 1..8, matching Python's `ValueError`.

### `SquareRegion.kt`

```kotlin
/** Parallel arrays for all 64 boxes, in Squares.ALL order. area == 0 for degenerate boxes. */
internal class SquareBoxes(
    val x0: IntArray, val y0: IntArray, val x1: IntArray, val y1: IntArray, val area: IntArray,
)

internal fun squareBoxes(boardSize: Int, whitePov: Boolean, extendUp: Double = 0.0): SquareBoxes

/** Returns intArrayOf(x0, y0, x1, y1). Python square_region (tracker.py:119). */
internal fun squareRegion(
    square: String, boardSize: Int, whitePov: Boolean,
    inset: Double = 0.16, extendUp: Double = 0.0,
): IntArray

/** intArrayOf(cx, cy). Python square_center (tracker.py:133). */
internal fun squareCenter(square: String, boardSize: Int, whitePov: Boolean): IntArray
```

Exact arithmetic, no cleverness:

```
cell = boardSize / 8.0          // Double division
m    = cell * inset             // inset DEFAULT 0.16 — keep it as the default
y0f  = row * cell + m - extendUp * cell
x0 = (col * cell + m).toInt()
y0 = max(0, y0f.toInt())
x1 = ((col + 1) * cell - m).toInt()
y1 = ((row + 1) * cell - m).toInt()
```

- `toInt()` truncates toward zero, exactly like Python's `int()`. `y0f` may be negative
  under `extendUp`; truncate FIRST, then clamp at 0 (`max(0, y0f.toInt())`) — flooring
  instead of truncating changes the box by a pixel for negative `y0f`.
- `area = if (y1 > y0 && x1 > x0) (x1 - x0) * (y1 - y0) else 0` (`_square_boxes` `:105`).
- **Extended boxes may overlap their neighbours. That is intended** (`square_region`
  docstring: 3D pieces protrude toward the back rank; the soft LL scoring tolerates it).
  Never de-overlap, never clamp `y1`.
- `squareCenter`: `((col + 0.5) * cell).toInt()`, `((row + 0.5) * cell).toInt()`.

### `Integral.kt`

```kotlin
/** (w+1)*(h+1) row-major integral image, zero first row/column — cv2.integral layout. */
internal fun integral(data: ByteArray, width: Int, height: Int): LongArray
internal fun integralAbsDiff(a: ByteArray, b: ByteArray, width: Int, height: Int): LongArray
internal fun regionMeans(ii: LongArray, width: Int, boxes: SquareBoxes, out: DoubleArray): DoubleArray
```

- Bytes are unsigned: `data[i].toInt() and 0xFF`. `LongArray` cannot overflow at
  800×800×255.
- `regionMeans` (Python `_region_means` `:110`), with `stride = width + 1`:
  `sum = ii[y1*stride+x1] - ii[y0*stride+x1] - ii[y1*stride+x0] + ii[y0*stride+x0]`,
  `out[i] = if (area > 0) sum.toDouble() / area else 0.0`. **Zero-area boxes yield 0.0,
  never NaN.**
- `out` is caller-owned and reused across frames; return it for chaining.

### `SquareDiff.kt`

```kotlin
/** Python per_square_diff (tracker.py:139). Mean |ref - cur| per square. */
internal fun perSquareDiff(
    grayA: GrayImage, grayB: GrayImage, boxes: SquareBoxes, out: DoubleArray,
): DoubleArray
```

`absdiff` → integral → `regionMeans`. Boxes are precomputed by the caller (the tracker
holds one `SquareBoxes` for `extendUp = overhang` and one for `extendUp = 0.0`; Python
rebuilds them per call, we must not). Require `grayA.width == grayB.width` and equal
heights; throw otherwise.

### `Normalize.kt`

```kotlin
/** Python normalize_diffs (tracker.py:487). */
internal fun normalizeDiffs(values: DoubleArray, out: DoubleArray): DoubleArray
```

Sort a **copy** of all 64 values ascending, take `sorted[n / 2]` (= index 32, the UPPER
median — NOT the average of elements 31 and 32), then
`out[i] = max(0.0, values[i] - baseline)`. Empty input → baseline 0.0. The input array
must not be mutated: the raw channel feeds noise learning afterwards.

## Steps

### 1. `Squares.kt` + `SquareRegion.kt` — commit `feat(engine): canonical square order and square regions`
### 2. `Integral.kt` + `SquareDiff.kt` — commit `feat(engine): integral-image region means and per-square gray diff`
### 3. `Normalize.kt` — commit `feat(engine): median normalization of a per-square channel`
### 4. Tests — commit `test(engine): square geometry and gray-diff parity against Python fixtures`

## Tests

`SquareDiffParityTest` — consumes the phase-00b golden fixtures through
`ParityFixtures.kt` (read it first; use its accessors as they are, do not edit it):

- `squareRegionMatchesPython` — every `(square, boardSize ∈ {800, 1600}, whitePov ∈
  {true,false}, extendUp ∈ {0.0, 0.25})` box equals the fixture box **exactly** (ints).
- `perSquareDiffMatchesPython` — on the fixture gray pair at `detSize = 800`,
  `extendUp = 0.25`: every square within **1e-4 relative**.
- `normalizeDiffsMatchesPython` — same tolerance, on the fixture's raw diff vector.
- `squareCenterMatchesPython` — exact.

`SquareGeometryTest` — hand-written edge cases:

- zero-area box (`inset = 0.5`) → `area == 0` and `regionMeans` gives `0.0`, not NaN;
- `extendUp` large enough to push `y0` negative → clamps to 0, `x` unchanged;
- black-pov (`whitePov = false`) is the 180° rotation of white-pov: box of `a1` equals
  the white-pov box of `h8`;
- `ALL.size == 64`, `ALL[0] == "a1"`, `ALL[63] == "h8"`, `index("e4") == 28`;
- `maskToSet`/`setToMask` round-trip;
- `normalizeDiffs` clamps at 0 (all-equal input → all zeros) and does not mutate input.

Run once, at the end of the phase:

```
cd android; .\gradlew.bat :core-engine:test --tests "com.chesslab.engine.SquareDiffParityTest" --tests "com.chesslab.engine.SquareGeometryTest"
```

Then `.\gradlew.bat :core-engine:ktlintFormat` and `.\gradlew.bat :core-engine:detekt`.

## Performance

64 boxes per frame at 800×800, ~18 fps. Integral images are `LongArray`; region means are
O(1) per box. No `Map`, no `Pair`, no `List<Double>`, no lambda capture in the pixel
loops. Allocate the integral buffer once per size and reuse it (an internal
size-keyed scratch holder inside `Integral.kt` is fine — the engine is single-threaded by
entry.md rule 2). Correctness first: do not replace the integral-image formulation with a
different algorithm.

## Do NOT

- Do not add `Map<String, Double>` APIs; do not use `chess`/`chesslib` here.
- Do not "fix" overlapping extended boxes, do not clamp `x1`/`y1` to the image.
- Do not change `inset = 0.16` or the truncation order.
- Do not use the median-of-two convention in `normalizeDiffs`.
- Do not touch `Census.kt`, `ShadowVeto.kt`, `ColorSpace.kt`, `Gamut.kt`, `Motion.kt`,
  `SquareNoise.kt`, `BaselineOcclusion.kt`, or `ParityFixtures.kt` (other owners).
- Do not read `android-legacy/**` for logic.
