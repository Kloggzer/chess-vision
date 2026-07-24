# Phase 02b — geometry: corners, homography, the two warps, crops, ArUco, grid lines

Module `:core-geometry`, package `com.chesslab.geometry`. Runs in parallel with 02a/02c
(different modules — no shared files).

## Why

Geometry is where the previous port lost silently: `specs/16` recorded warp poisoning from
a requested-vs-delivered resolution mismatch, and the app never had Python's *two distinct
warps*. `entry.md` invariant 1 is the whole of this phase's reason to exist:

- **Detection warp** — `calibration.py:926 warp_from_corners`, borderless, playing field
  fills `[0, targetSize]`, run at `detSize = boardSize * detectScale = 800`. Everything the
  engine diffs (`refGray`, `refBgr`, every `CnnSnapshot.warped/gray`) is at `detSize`.
- **CNN crop warp** — `calibration.py:944 warp_board_for_crops`, canvas `boardSize + 2B`
  with `B = cropBorderPx`, homography pre-multiplied by a translation of `B`, run at full
  `boardSize`. Only `Crops.kt` reads this one.

Using one where the other belongs produces crops that are subtly off-centre and a CNN that
is quietly wrong on every edge square. This phase ports the geometry 1:1 from
`src/chesslab/calibration.py` and `src/chesslab/labeling.py`, plus the two cv2 helpers the
detection loop needs (`_grid_line_coverage`, the CLAHE gray pipeline).

## Files you own

```
android/core-geometry/build.gradle.kts
android/core-geometry/src/main/kotlin/com/chesslab/geometry/Corners.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/Homography.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/Warp.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/CropBox.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/Crops.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/Aruco.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/MarkerTracker.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/GridLines.kt
android/core-geometry/src/main/kotlin/com/chesslab/geometry/GrayPipeline.kt
android/core-geometry/src/test/kotlin/com/chesslab/geometry/**            (your test classes)
android/core-geometry/src/test/kotlin/com/chesslab/geometry/testutil/OpenCvNatives.kt
```

Plus **exactly one** line in `android/gradle/libs.versions.toml` per new dependency —
coordinate through `STATUS.md` if 02c also needs one (it does not; it depends on
`:core-geometry`).

## Design (decided — do not redesign)

### Profile model (`Corners.kt`)

`:core-geometry` does not read YAML. A single immutable value type carries what the Python
`CalibrationProfile` contributes to geometry:

```kotlin
data class BoardGeometry(
    val boardSize: Int = 1600,     // config.DEFAULT_BOARD_SIZE
    val margin: Double = 0.0,      // markers sit this fraction OUTSIDE the playing field
    val whitePov: Boolean = true,
    val padUp: Double = 0.0,       // config.CROP.pad_up      (config.py:48)  — 0.0, NOT 0.25
    val padSide: Double = 0.10,    // config.CROP.pad_side    (config.py:54)
    val outW: Int = 128, val outH: Int = 128,  // config.CROP.out_w/out_h (config.py:59-60)
    val markerDict: String = "DICT_4X4_50",
) { val cell: Double get() = boardSize / 8.0 }
```

Corner order is `[a8, h8, h1, a1]` (`calibration.py:77 image_corners`,
`:482 _ARUCO_LABELS`, marker ids 0,1,2,3 in that order). A corner list is
`List<DoubleArray>` of length 4 or the flat `FloatArray(8)` of the API seam
(`FrameInput.corners`), and `Corners.kt` owns the two converters. **Crop order is
`allSquares()` = `a1,b1,…,h1,a2,…,h8`** (`labeling.py:102`) — a different order from the
corner order; `entry.md` invariant 11.

`squareToColRow(square, whitePov)` — port of `calibration.py:329 _square_to_col_row`:
`col = file index a..h → 0..7`, `row = 8 - rank`, and when `!whitePov` both are mirrored
(`col, row = 7-col, 7-row`). Throw on a malformed square string.

### `CropBox.kt`

`squareToCropBox(square, geom, clamp = true): IntArray(x0,y0,x1,y1)` — port of
`calibration.py:347`:

```
x0 = col*cell - padSide*cell
x1 = (col+1)*cell + padSide*cell
y0 = row*cell - padSide*cell - padUp*cell
y1 = (row+1)*cell + padSide*cell
```

then `fix(v) = round(if (clamp) v.coerceIn(0.0, boardSize.toDouble()) else v).toInt()`.
Rounding is **half-away-from-zero** like Python's `int(round(...))` on floats here — use
`kotlin.math.round` (ties away from zero for `.5`), NOT `Math.round` (ties toward +∞) and
NOT `roundToInt` on the clamped value before clamping. With the defaults `padUp = 0.0` the
box is square; do not hardcode that — `padUp` is a settable knob.

`cropBorderPx(geom)` — port of `calibration.py:384`:
`round(max(CROP_WARP_BORDER_CELLS, padSide, padUp) * cell).toInt()` with
`CROP_WARP_BORDER_CELLS = 0.1` (`config.py:70`). With the defaults: `0.10 * 200.0 = 200`
at `boardSize = 1600`.

Also expose `squareCenter(square, geom)` (`calibration.py:377`) and
`squareRegion(square, size, whitePov)` returning the *plain cell* rect in a `size×size`
warp — phase 03 needs the latter at `detSize`; it is the `padUp = padSide = 0` special case
and must be integer-exact (`round(col*cell)` … `round((col+1)*cell)`), so a `detSize` not
divisible by 8 still tiles the board without gaps.

### `Homography.kt`

`computeHomography(corners, boardSize, margin): Mat` — port of `calibration.py:393`:
`src` = the four corners in `[a8,h8,h1,a1]` order; `m = margin * boardSize`;
`dst = [[-m,-m], [bs+m,-m], [bs+m,bs+m], [-m,bs+m]]`; `Imgproc.getPerspectiveTransform(src, dst)`
on `CvType.CV_32F` points. Return the `3x3` `CV_64F` Mat.

`resolveBoardCorners(pointsById, boardSize): Pair<List<DoubleArray>, Int>?` — port of
`calibration.py:518`. `board = {0:(0,0), 1:(bs,0), 2:(bs,bs), 3:(0,bs)}`, `have` = present
ids **in id order 0,1,2,3**:

- `< 2` → `null`.
- `== 2` → **similarity**: `vb = src[1]-src[0]`, `vd = dst[1]-dst[0]`, `nb = |vb|`
  (`< 1e-6` → null), `s = |vd| / nb`, `ang = atan2(vd) - atan2(vb)`, project each of the 4
  targets as `dst[0] + s * R(ang) * (t - src[0])`.
- `== 3` → `Imgproc.getAffineTransform` on the first three, `Core.transform` the targets.
- `== 4` → `getPerspectiveTransform` + `Core.perspectiveTransform`.

### `Warp.kt` — the two warps

```kotlin
fun warpFromCorners(frame: Mat, geom: BoardGeometry, corners: List<DoubleArray>,
                    targetSize: Int? = null): Mat      // calibration.py:926 — DISPLAY/DETECTION
fun warpBoardForCrops(frame: Mat, geom: BoardGeometry, corners: List<DoubleArray>): Mat
                                                        // calibration.py:944 — CNN CROPS
```

- `warpFromCorners`: `sz = targetSize ?: boardSize`; `H = computeHomography(corners, boardSize, margin)`;
  **if `sz != boardSize`, scale rows 0 and 1 of `H` by `s = sz / boardSize`** (row 2
  untouched — it is the projective row); `warpPerspective(frame, H, Size(sz, sz))`.
  Borderless: the playing field fills `[0, sz]`.
- `warpBoardForCrops`: `B = cropBorderPx(geom)`;
  `H' = T(B,B) @ computeHomography(corners, boardSize, margin)`;
  `warpPerspective(frame, H', Size(bs + 2B, bs + 2B))`. Same geometry, shifted by `B`.

Interpolation and border mode: OpenCV defaults (`INTER_LINEAR`, `BORDER_CONSTANT` black),
matching Python's bare `cv2.warpPerspective`. Do not "improve" them.

Both must be callable on a caller-supplied output `Mat` (reuse across frames) — add
`dst: Mat? = null` overloads. Allocating a fresh `Mat` per frame at 15 fps is the plumbing
regression phase 05b will otherwise inherit.

### `Crops.kt`

`cropSquare(boardWarped, square, geom): Mat` — port of `labeling.py:112`:

1. box from `squareToCropBox(square, geom, clamp = false)`;
2. shift ALL FOUR coordinates by `+B` (`B = cropBorderPx`);
3. degenerate guard: `if (x1 <= x0) x1 = x0 + 1`, same for y;
4. intersect with the canvas: `xa = max(0,x0) … xb = min(W,x1)`; take that submat;
5. `padT = ya-y0`, `padB = y1-yb`, `padL = xa-x0`, `padR = x1-xb`; if any is non-zero,
   `Core.copyMakeBorder(..., BORDER_CONSTANT, Scalar(0,0,0))` — **black**, never replicate,
   never reflect. Constant geometry across all 64 squares is the point;
6. `resizeKeepAspect(region, outW, outH)` — port of `imgops.py:14`: `s = min(ow/w, oh/h)`,
   `nw = max(1, round(w*s))`, `nh = max(1, round(h*s))`,
   `INTER_AREA` when `s < 1` else `INTER_LINEAR`, blit centred at `((ow-nw)/2, (oh-nh)/2)`
   (integer division) onto a **black** `oh×ow×3` canvas. With square defaults this is a
   borderless resize; keep the letterbox path anyway.

`cropsForFrame(frame, corners, geom): List<Mat>` — port of `labeling.py:137 crops_for_frame`
reduced to the `geometry="warp", photometry="none"` path (box3d and photometric variants
are Python-only, out of scope): one `warpBoardForCrops`, then `cropSquare` for each of
`allSquares()` in that exact order. Output crops are **BGR uint8 at `outW × outH`** — the
input contract of 02c `Preprocess.kt`.

`allSquares(): List<String>` lives here (`labeling.py:102`): `for r in 1..8, for f in a..h`.

### `Aruco.kt`

- `detectMarkerQuads(frame, dictName, ids)` — port of `calibration.py:489`: gray-convert
  when the input has 3 channels; `Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)`;
  `DetectorParameters` with `cornerRefinementMethod = Objdetect.CORNER_REFINE_SUBPIX`;
  `ArucoDetector.detectMarkers`. Keep only the requested ids; each value is the raw
  `4x2` corner array in ArUco order.
- `detectBoardMarkers(frame, dictName = "DICT_4X4_50", ids = (0,1,2,3), corner = "center")`
  — port of `calibration.py:501`. **The tracker always uses `corner = "center"`** — the
  point is the quad's **centroid** (`quad.mean(axis=0)`). Port the `"inner"` branch too
  (nearest quad corner to the centroid of all quad means) for completeness, but the app
  never selects it.
- Resolve the dictionary name → OpenCV constant with an explicit `when` map, not
  reflection (Python uses `getattr(cv2.aruco, name)`); unknown name → `IllegalArgumentException`.

### `MarkerTracker.kt`

Port of `calibration.py:562`, parameters from `config.TRACKER` (`config.py:208-222`),
copied verbatim as defaults:

```kotlin
data class MarkerTrackerParams(
    val moveThreshold: Double = 4.0,
    val smoothAlpha: Double = 0.35,
    val jumpRejectPx: Double = 60.0,
    val jumpConfirmFrames: Int = 2,
    val maxHeldFrames: Int = 90,
    val defaultMinMarkers: Int = 2,
)
```

State: `pos: MutableMap<Int, DoubleArray>`, `age: MutableMap<Int, Int>`,
`seeded: MutableSet<Int>`, `pending: MutableMap<Int, Pair<DoubleArray, Int>>`.

`seed(pointsById)`: only for ids not already in `pos`; sets `age = maxHeldFrames` (a seed
counts as old immediately) and marks `seeded`.

`update(detected)`, in this exact order:

1. age EVERY known corner by 1 (before consuming detections);
2. per detection: unknown id → adopt, `age = 0`, un-seed, drop pending;
3. `d = |dx| + |dy|` (**L1**, not Euclidean) against the current position;
4. `d <= moveThreshold` → dead zone: keep the old position, but `age = 0`, un-seed, drop
   pending;
5. **`id in seeded` → SNAP: `pos = p` outright, no EMA.** This is a named live bug fix in
   Python (an EMA'd seed leaves the corner 65 % at the seed = permanently offset grid);
6. `d > jumpRejectPx` → `confirmJump`: the pending candidate must stay within
   `jumpRejectPx` of the previous candidate for `jumpConfirmFrames` consecutive frames
   (counter restarts at 1 otherwise); until confirmed, `continue` — the old position and
   the *aged* age stand;
7. otherwise EMA: `pos = prev + smoothAlpha * (p - prev)`, `age = 0`, un-seed, drop pending.

`status(id)`: `"seed"` if seeded, else `"live"` if `age == 0`, else `"stale"` if
`age >= maxHeldFrames`, else `"held"`. Plus `points()`, `nLive()`, `nHeld()`.

`boardCornersForFrame(frame, geom, tracker, minMarkers = null, detectScale = 1.0)` — port
of `calibration.py:883`:

- `minMarkers = minMarkers ?: params.defaultMinMarkers` (= 2);
- `detectScale < 1.0` → `Imgproc.resize(frame, null, fx, fy, INTER_AREA)`, detect on the
  small image, then rescale each point by `1/detectScale`. The ±1 px rescale error is
  inside the 4 px dead zone — that is the documented justification, do not add rounding;
- `tracker.update(det)`; `pts = tracker.points()`; `pts.size < minMarkers` → `null`;
- **single-seed reconstruction**: if exactly one corner has status `"seed"` and
  `pts.size >= 4`, replace it by the parallelogram completion from the three real corners:
  with `m` the seeded index, `prev = (m-1) mod 4`, `next = (m+1) mod 4`, `opp = (m+2) mod 4`,
  `pts[m] = pts[prev] + pts[next] - pts[opp]` (component-wise), applied only when all three
  are present;
- `resolveBoardCorners(pts, boardSize)?.first`.

### `GridLines.kt`

`gridLineCoverage(gray: Mat): Double` — port of `tracker.py:1293 _grid_line_coverage`:

- `h < 16 || w < 16` → `1.0`;
- `Imgproc.Canny(gray, 40.0, 120.0)`;
- `cellX = w/8.0`, `cellY = h/8.0`, `band = max(1, (min(cellX, cellY) * 0.12).toInt())`
  (**truncation**, not rounding);
- for each interior vertical line `i in 1..7`: `x = round(i*cellX).toInt()`, take columns
  `max(0, x-band) .. x+band` (inclusive upper, i.e. width `x+band+1 - start`, clipped to
  the image), a line counts when the fraction of ROWS whose max over that band is `> 0`
  is `>= 0.5`;
- same for the 7 interior horizontal lines over rows (max over the band per column);
- return `hits / 14.0`.

Empty band (`col.size == 0`) does not count as a hit.

### `GrayPipeline.kt`

`toGray(warpedBgr: Mat, claheClip: Double, dst: Mat? = null): Mat` — port of
`tracker.py:1008 _gray`:

1. `cvtColor(BGR2GRAY)`;
2. if `claheClip > 0`: **cache the CLAHE object** (`Imgproc.createCLAHE(claheClip, Size(8.0, 8.0))`,
   tile from `config.PHOTOMETRY.clahe_tile = 8`, `config.py:166`) in the instance and
   `apply` it — created once, not per frame;
3. `GaussianBlur(ksize = 5x5, sigma = 0)`.

CLAHE **before** blur, always, for every frame — reference and current must be enhanced
identically or the per-square noise model is invalid. Expose this as a small class
(`GrayPipeline(claheClip)`) rather than a top-level function so the CLAHE handle has a home.

Note for phase 05b (do not implement here): the dark-frame gate reads mean luma **before**
CLAHE — `FrameInput.lumaPreClahe`.

### Build config, OpenCV natives, test tiers

`android/core-geometry/build.gradle.kts`:

```kotlin
plugins { id("java-library"); alias(libs.plugins.kotlin.jvm); alias(libs.plugins.ktlint); alias(libs.plugins.detekt) }
java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }
dependencies {
    api(project(":core-engine"))
    compileOnly(libs.opencv)          // org.opencv:opencv:4.10.0 — provided on-device by :app's OpenCV SDK
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    // Desktop JVM natives + the org.opencv Java bindings for Tier C tests. Same coordinates
    // the legacy :engine module used (android-legacy/engine/build.gradle.kts:24-29).
    val javacvVersion = "1.5.11"
    val hostClassifier = "windows-x86_64"
    testImplementation("org.bytedeco:javacv:$javacvVersion")
    testRuntimeOnly("org.bytedeco:opencv:4.10.0-$javacvVersion:$hostClassifier")
    testRuntimeOnly("org.bytedeco:openblas:0.3.28-$javacvVersion:$hostClassifier")
}
tasks.withType<Test> { useJUnitPlatform() }
```

Add `opencv = "org.opencv:opencv:4.10.0"` to `libs.versions.toml` and record it in
`STATUS.md` (Apache-2.0 — GPL-compatible). The bytedeco jars stay literal in this file:
they are host-classified test-only artifacts and do not belong in the shared catalog.

**Native init — one mechanism, no alternatives.** `testutil/OpenCvNatives.kt`:

```kotlin
object OpenCvNatives {
    @JvmStatic
    val available: Boolean by lazy {
        runCatching { org.bytedeco.javacpp.Loader.load(org.bytedeco.opencv.opencv_java::class.java) }.isSuccess
    }
}
```

`Loader.load(opencv_java::class.java)` unpacks the JNI library and makes the `org.opencv.*`
Java API usable in the same JVM — that is why the bytedeco artifacts are here even though
production code compiles against `org.opencv`.

Test tiers:

- **Tier A/B** (pure math, no natives): `squareToColRow`, `squareToCropBox`, `cropBorderPx`,
  `allSquares`, `MarkerTracker`, corner converters. These must run everywhere and are
  written with **no OpenCV import at all** — `MarkerTracker` and `CropBox` therefore must
  not reference `Mat`.
- **Tier C** (needs natives): warps, ArUco, Canny/grid lines, CLAHE, `Crops`,
  `resolveBoardCorners`, `computeHomography`. Annotate every Tier-C class with
  `@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")` (JUnit 5
  `@EnabledIf`, fully-qualified static-method form). **Do not** use `Assumptions.assumeTrue`,
  `@Disabled`, or a try/catch fallback — one mechanism, greppable.

`MarkerTracker.kt` and `CropBox.kt` staying OpenCV-free is a hard requirement, not a
preference: phase 03 wants `squareRegion` without dragging natives into `:core-engine`'s
test runtime.

## Steps

### 1. `build.gradle.kts` + catalog entry + `testutil/OpenCvNatives.kt` — commit `build(geometry): :core-geometry module with OpenCV compileOnly + bytedeco test natives`

### 2. `Corners.kt` + `CropBox.kt` — commit `feat(geometry): corner order, square→col/row, crop box, crop border`

### 3. `Homography.kt` + `Warp.kt` — commit `feat(geometry): homography and the two warps (borderless detection, bordered crop)`

### 4. `Crops.kt` — commit `feat(geometry): 64 square crops in all_squares order, black overhang, letterbox resize`

### 5. `Aruco.kt` + `MarkerTracker.kt` — commit `feat(geometry): ArUco marker detection and the jitter/jump-resilient marker tracker`

### 6. `GridLines.kt` + `GrayPipeline.kt` — commit `feat(geometry): grid-line coverage and the CLAHE+blur gray pipeline`

### 7. Tests — commit `test(geometry): crop-box, warp, marker-tracker and grid-line parity`

Fixtures from phase 00b (`android/core-geometry/src/test/resources/fixtures/`):

- `geometry_cropbox.jsonl` — `{square, board_size, pad_up, pad_side, white_pov, clamp, box: [x0,y0,x1,y1]}`
- `geometry_homography.jsonl` — `{corners, board_size, margin, h: [[..],[..],[..]]}`
- `geometry_resolve_corners.jsonl` — `{points_by_id, board_size, corners, n_used}`
- `geometry_grid_coverage.jsonl` — `{image: "<png name>", coverage}` (+ the PNGs)

If a fixture named here is absent, **STOP** and record the blocker in `STATUS.md`.

Test classes and cases:

- `CropBoxTest` (Tier A) — every `geometry_cropbox.jsonl` row EXACT (integers).
  Hand-written: with defaults (`boardSize=1600`, `padUp=0`, `padSide=0.10`, `cell=200`)
  `a8` unclamped = `(-20,-20,220,220)` and clamped = `(0,0,220,220)`; `h1` unclamped
  `x1 = 1620`; `cropBorderPx == 200`; `padUp = 0.25` makes the box 50 px taller at the top
  only and raises `cropBorderPx` to 500; `!whitePov` maps `a8` to the `h1` box.
- `CornersTest` (Tier A) — `squareToColRow("a8") == (0,0)`, `("h1") == (7,7)`,
  `("e4") == (4,4)`; `!whitePov` mirrors both; `allSquares()[0] == "a1"`, `[7] == "h1"`,
  `[8] == "a2"`, `[63] == "h8"`, size 64, all distinct; flat `FloatArray(8)` ↔ corner-list
  round-trip.
- `HomographyTest` (Tier C) — `geometry_homography.jsonl` rows within `1e-4` relative after
  normalizing `H[2][2]` to 1 (scale of a homography is arbitrary in principle but
  `getPerspectiveTransform` fixes it — assert element-wise anyway). `margin = 0` maps the
  four corners exactly to `(0,0),(bs,0),(bs,bs),(0,bs)`; `margin = 0.06` maps them to
  `∓m` outside.
- `WarpTest` (Tier C) — synthetic 8×8 checkerboard frame with known corners:
  - `warpFromCorners(target=800)` and `warpFromCorners(target=1600)` place the same board
    feature at proportional coordinates (row scaling correct, projective row untouched);
  - `warpBoardForCrops` output is `(bs+2B)²` and its playing field is the borderless warp
    shifted by exactly `B` — compare a centre-of-square sample per square, tolerance ±1 px;
  - **the two are not interchangeable**: assert `warpBoardForCrops(...).width() != warpFromCorners(...).width()`
    so a future "simplification" fails loudly.
- `CropsTest` (Tier C) — 64 crops, order `allSquares()`, each `128×128` BGR;
  corner square `a8` has non-black content on all sides (proving the border warp works);
  a crop from a deliberately tiny canvas is black-padded, not replicated (sample a padded
  pixel `== 0`); `resizeKeepAspect` on a 2:1 region letterboxes with black bars and keeps
  the aspect.
- `MarkerTrackerTest` (Tier A) — dead zone (3 px move → position unchanged, status `live`);
  EMA (10 px move with `alpha=0.35` → exactly `prev + 0.35*d`); **seed snap** (seeded corner
  + first live detection 30 px away → position is the detection EXACTLY, not blended);
  jump reject (70 px jump ignored on frame 1, applied on frame 2 when repeated within
  `jumpRejectPx`, and a *different* 70 px jump restarts the counter); ageing → `held` then
  `stale` after 90 frames; `seed` status before any detection.
- `BoardCornersForFrameTest` (Tier C) — `detectScale = 0.5` on a synthetic marker image
  returns corners within 2 px of the full-res result; `< minMarkers` known corners → null;
  the single-seed parallelogram completion produces `prev + next - opp`.
- `ArucoTest` (Tier C) — render markers 0..3 with `Objdetect.generateImageMarker`, detect
  them, assert the returned point is the quad **centroid** (within 0.5 px) and that ids
  outside the requested set are dropped.
- `GridLinesTest` (Tier C) — `geometry_grid_coverage.jsonl` rows within `1e-4`; a clean
  synthetic grid scores `1.0`; blanking a horizontal strip over 3 lines drops it to
  `11/14`; an 8×8 pixel image returns `1.0` (size guard).
- `GrayPipelineTest` (Tier C) — CLAHE handle is created once (call twice, assert identical
  output and no exception); `claheClip = 0` skips CLAHE but still blurs.

Run once:
`cd android; .\gradlew.bat :core-geometry:test`
then `.\gradlew.bat :core-geometry:ktlintFormat` and `.\gradlew.bat :core-geometry:detekt`.

## Acceptance criteria

- `:core-geometry:test` green. If natives are unavailable the Tier-C classes report
  *skipped* (not failed) and Tier A/B still runs — verify by reading the test report, and
  record in `STATUS.md` whether natives were present in this run.
- `grep -n "warp_board_for_crops\|warpBoardForCrops" android/core-geometry/src/main/kotlin/com/chesslab/geometry/{Warp,Crops}.kt` — `Crops.kt` is the ONLY caller.
- `grep -rn "org.opencv" android/core-geometry/src/main/kotlin/com/chesslab/geometry/{CropBox,MarkerTracker,Corners}.kt` — zero hits.
- `grep -rn "EnabledIf" android/core-geometry/src/test/kotlin | wc -l` equals the number of
  Tier-C classes; `grep -rn "assumeTrue\|@Disabled" android/core-geometry/src/test/kotlin` — zero hits.
- `grep -n "CORNER_REFINE_SUBPIX" android/core-geometry/src/main/kotlin/com/chesslab/geometry/Aruco.kt` hits.
- `grep -n "0.12" android/core-geometry/src/main/kotlin/com/chesslab/geometry/GridLines.kt` and
  `grep -n "14.0" ...` hit.
- ktlint/detekt clean for `:core-geometry`, zero `@Suppress`, no baseline entries.
- `STATUS.md` row 02b `done`; catalog addition + license note recorded.

## Do NOT

- Do NOT collapse the two warps, and do NOT give `warpFromCorners` a border parameter.
- Do NOT change the corner order, and do NOT reuse it for crops (`allSquares` is rank-major
  from rank 1 — `entry.md` invariant 11).
- Do NOT port `board_corners_from_lines`, `_grid_progression`, `draw_*`, profile YAML I/O,
  `ensure_profile`, `lens`, `geometry3d`/box3d, or the photometric crop variants. Out of scope.
- Do NOT fill crop overhang with anything but black, and do NOT clamp the box instead of padding.
- Do NOT put OpenCV types in `:core-engine`'s API seam — this module converts `Mat` ↔
  `GrayImage`/`BgrImage` at its own boundary.
- Do NOT EMA a seeded corner, and do NOT smooth inside the dead zone.
- Do NOT vendor OpenCV jars or add an `opencv-platform` fat dependency.
