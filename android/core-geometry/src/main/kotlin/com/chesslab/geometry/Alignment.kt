package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Port of `alignment.py`. Where the board's squares REALLY sit in a rectified frame, and how to
// pull them onto the grid.
//
// A warp can be wrong without anything failing: the corners resolve, 64 crops come out, every count
// looks healthy, and the grid sits a few degrees off with every crop straddling its groove. That is
// what happened to the whole Python corpus until 2026-07-31, and re-cutting it moved the champion's
// empty-crop margin 5.5x — more than nine training experiments had managed.
//
// **The lattice is measured BAND-WISE.** Collapsing the whole board along an axis locates a line
// precisely and averages its TILT away completely, so a rotation or shear inside the warp used to
// be invisible AND uncorrectable: 0.01 px reported for a 3.05 px shear. That version passed every
// directional test ("the shear is visible") and certified 302 frames whose grid the eye can see is
// wrong. `AlignmentTruthTest` is calibrated against analytic truth for exactly that reason — this
// file's whole history is a plausible-looking measurement being silently wrong for months.
//
// **The lines are measured OUT TO THE EDGE, in a padded warp** (2026-08-03, `specs/41`). Index 0
// and 8 used to be pinned at 0 and `boardSize` — the values the warp puts there by construction —
// which made a uniform SCALE error read 25 % short and made the metric partly a statement about its
// own assumption. [warpForGrid] keeps [GRID_PAD_CELLS] of surrounding board so the playing-field
// boundary is measured like every other line, and a line that cannot be found is REPORTED missing
// rather than assumed.
//
// **The fit is PROJECTIVE** (`ProjectiveFit.kt`). That is the change that made a three-marker quad
// usable at all; the reasoning is in that file.

/** How far either side of an expected INTERIOR line to look, as a fraction of a cell. */
private const val SEARCH_FRAC: Double = 0.25

/**
 * The same for the two OUTER lines, and deliberately tighter: the reference board carries a printed
 * rank/file border whose own boundary runs about a third of a cell outside the playing field, and a
 * window that reaches it locks onto the wrong line and reports a small offset for a board scaled
 * wrong by half a square.
 */
private const val OUTER_SEARCH_FRAC: Double = 0.15

/** Cap on the centroid half-width, as a fraction of a cell — about one and a half groove widths. */
private const val CENTROID_FRAC: Double = 0.08

/**
 * Bands per axis. 1 reproduces the old tilt-blind collapse. 8 gives each of the 18 lines eight
 * samples, which is what lets a robust fit throw away the bands a piece is standing in and still
 * have a line left; 4 was the previous value and lands within 0.2 px of it on clean frames.
 */
const val ALIGN_BANDS: Int = 8

/** Iterations of measure-and-refit. One pass leaves the answer depending on how bad the input was. */
const val ALIGN_ITERS: Int = 4

/** Band samples a line needs before it counts as located, after robust reweighting. */
private const val MIN_BAND_SAMPLES: Int = 3

/**
 * Cells of surrounding board [warpForGrid] keeps beyond the playing field, so the two OUTER lines
 * per axis are measured rather than assumed. Must exceed [OUTER_SEARCH_FRAC] (the window has to
 * fit) and stay under the ~0.33 cell at which the board's printed label border begins.
 */
const val GRID_PAD_CELLS: Double = 0.25

/**
 * Search half-width per refit iteration, as a fraction of a cell. A three-marker quad starts a third
 * of a cell out, which is outside [SEARCH_FRAC] at the worst squares — the first pass has to be able
 * to reach the groove at all, and later passes have to stop chasing the neighbour.
 */
private val SEARCH_SCHEDULE = doubleArrayOf(0.45, 0.30, 0.22, 0.18)

/** Below this measured displacement (fraction of a cell) the OUTER lines can be searched safely. */
private const val OUTER_LOCK_FRAC: Double = 0.5 * OUTER_SEARCH_FRAC

/**
 * The gate: a square edge this far off, as a fraction of a cell, fails the frame.
 *
 * Argued from `docs/data-pipeline.md` 12, not invented. The corpus that cost this project 5.5x its
 * empty-crop margin sat at 3.2-6.5 % of a cell; re-fitting brought every session to 2.0-3.3 %
 * median, max 4.3 %. So 3.2 % is the lowest error measured as damaging and 3.3 % the highest a
 * repaired session carries — the bands touch, and the gate sits at the seam. A FRACTION of a cell,
 * so it means the same on the rig (cell 100) and on the phone (cell up to 200).
 */
const val MAX_OFFSET_FRAC: Double = 0.04

private const val LINES_PER_AXIS: Int = BOARD_SIDE + 1

private const val BYTE_MASK: Int = 0xFF

/** Elements of a row-major 3x3. */
internal const val H_ELEMENTS: Int = 9

/** One measured grid line: its tilt, and where it crosses the board's centre. */
class GridLine(
    /** Position change per unit of the OTHER axis. */
    val slope: Double,
    /** Position at the board's centre, in the coordinates of the padded warp. */
    val offset: Double,
)

/**
 * The board's real grid: `[axis][k]`, null where a line could not be located.
 *
 * `axis` 0 is the family of VERTICAL lines (each pins an x), 1 the horizontal ones.
 */
class BoardGrid(
    val lines: Array<Array<GridLine?>>,
    /** Where nominal line 0 sits in the warp these were measured in. */
    val pad: Int,
) {
    val unread: Int get() = lines.sumOf { axis -> axis.count { it == null } }

    fun at(
        axis: Int,
        k: Int,
    ): GridLine? = lines[axis][k]
}

/** Per-square offsets in rectified pixels, and how many grid lines could not be located. */
class SquareOffsets(
    val offsets: Map<String, Double>,
    val unread: Int,
) {
    /** The largest square offset, or `NaN` when nothing was measurable. */
    val worst: Double get() = offsets.values.maxOrNull() ?: Double.NaN
}

/**
 * The verdict on one quad, and the numbers behind it.
 *
 * A verdict and not a number, because every path that produces a quad has to act on it. [unread] is
 * part of the verdict, not a footnote — a frame whose outer lines could not be found has not been
 * measured at its edges, and calling that a pass is how the pinned metric certified 302 bad frames.
 *
 * Absolute, never self-referential: nothing here looks at any other frame.
 */
class Alignment(
    val ok: Boolean,
    val worst: Double,
    val unread: Int,
    val limit: Double,
    val reason: String,
)

/** [improveQuad]'s answer: the corrected quad (or null), and the offset before and after. */
class QuadImprovement(
    val quad: List<DoubleArray>?,
    val before: Double,
    val after: Double,
)

/** [refineQuad]'s answer: the best quad available for this frame, and what it measures. */
class RefinedQuad(
    val quad: List<DoubleArray>,
    val alignment: Alignment,
)

/** Search windows and centroid width, derived once per measurement from the cell size. */
private class ProfileParams(
    val cell: Double,
    val span: Int,
    val outerSpan: Int,
    val csp: Int,
) {
    constructor(boardSize: Int, searchFrac: Double, outer: Boolean) : this(
        boardSize / BOARD_SIDE_D,
        max(4, pyRound(boardSize / BOARD_SIDE_D * searchFrac)),
        if (outer) max(4, pyRound(boardSize / BOARD_SIDE_D * OUTER_SEARCH_FRAC)) else 0,
        max(2, pyRound(boardSize / BOARD_SIDE_D * CENTROID_FRAC)),
    )
}

/**
 * The rectified board plus [GRID_PAD_CELLS] of what surrounds it, and that pad in pixels.
 *
 * The pad is what makes the two outer lines per axis measurable instead of assumed. It is not
 * `warpBoardForCrops`' border, which is sized for the crop pads and is much wider — a wide pad would
 * let the outer search reach the board's printed label border. **The caller owns the `Mat`.**
 */
fun warpForGrid(
    frame: Mat,
    geom: BoardGeometry,
    quad: List<DoubleArray>,
): Pair<Mat, Int> {
    val pad = pyRound(GRID_PAD_CELLS * geom.boardSize / BOARD_SIDE_D)
    return warpFromCornersPadded(frame, geom, quad, pad) to pad
}

/**
 * The board's REAL 9 lines per axis, measured band by band.
 *
 * A line that cannot be told from its neighbourhood comes back as null, so a caller can see which
 * boundary is a guess: pieces sit ON the grooves and legitimately hide some. **Nothing here is
 * assumed** — with [pad] `> 0` the outer lines are looked for like any other, and without a pad they
 * are reported missing rather than invented.
 */
fun gridLines(
    warped: Mat,
    boardSize: Int,
    pad: Int = 0,
    bands: Int = ALIGN_BANDS,
    searchFrac: Double = SEARCH_FRAC,
    outer: Boolean = pad > 0,
): BoardGrid {
    val g = BoardGray(warped)
    val p = ProfileParams(boardSize, searchFrac, outer)
    val bh = boardSize.toDouble() / bands
    val centre = pad + boardSize / 2.0
    val lines = Array(2) { arrayOfNulls<GridLine>(LINES_PER_AXIS) }
    for (axis in 0..1) {
        val samples = axisSamples(g, axis, bands, bh, pad, p)
        fitAxis(samples, centre).forEach { (k, line) -> lines[axis][k] = line }
    }
    return BoardGrid(lines, pad)
}

/** `(k, lever, position)` for every groove one axis contributed, over all its bands. */
private fun axisSamples(
    g: BoardGray,
    axis: Int,
    bands: Int,
    bh: Double,
    pad: Int,
    p: ProfileParams,
): List<DoubleArray> {
    val out = mutableListOf<DoubleArray>()
    for (bi in 0 until bands) {
        val s0 = pyRound(pad + bi * bh)
        val s1 = pyRound(pad + (bi + 1) * bh)
        if (s1 <= s0) continue
        // MEDIAN down the band, not mean: a piece occupying part of the band contributes an outlier
        // to every column it covers, and a mean carries it into the profile the notch is looked for
        // in. Within 0.1 px of the mean on clean frames, worth a line or two on cluttered ones.
        val prof = if (axis == 0) g.columnMedians(s0, s1) else g.rowMedians(s0, s1)
        val pos = profileLines(prof, p.cell, p.span, p.csp, pad.toDouble(), p.outerSpan)
        val mid = (s0 + s1) / 2.0
        for (k in 0 until LINES_PER_AXIS) {
            if (!pos[k].isNaN()) out += doubleArrayOf(k.toDouble(), mid, pos[k])
        }
    }
    return out
}

/**
 * One axis' nine lines from all its band samples at once.
 *
 * **The slope is POOLED over the axis, the intercept is per line.** A per-line regression over eight
 * bands carries more noise than the tilt it is measuring — the board's own warp is 0.75 px peak to
 * peak on the reference board — and a line whose bands are half hidden by a row of pieces comes back
 * tilted by tens of milliradians. Pooling divides that noise by sqrt(9) and loses nothing real.
 *
 * The pooled slope is `a + b * k`, LINEAR in the line index, not one constant. A residual homography
 * maps a family of parallel lines to a pencil, so their directions fan out across the board; a
 * single constant cannot represent that and would leave the projective component of the error
 * unmeasurable — which is the component a three-marker quad's error consists of.
 */
private fun fitAxis(
    samples: List<DoubleArray>,
    centre: Double,
): Map<Int, GridLine> {
    val present = samples.map { it[0].toInt() }.distinct().filter { k -> samples.count { it[0].toInt() == k } >= MIN_BAND_SAMPLES }.sorted()
    if (present.isEmpty()) return emptyMap()
    val used = samples.filter { present.contains(it[0].toInt()) }
    val col = present.withIndex().associate { (i, k) -> k to 2 + i }
    val n = used.size
    val cols = 2 + present.size
    val design = Array(n) { i ->
        val lever = used[i][1] - centre
        DoubleArray(cols).also { row ->
            row[0] = lever
            row[1] = used[i][0] * lever
            row[col.getValue(used[i][0].toInt())] = 1.0
        }
    }
    val target = DoubleArray(n) { used[it][2] }
    val sol = huberSolve(design, target) ?: return emptyMap()
    val kept = IntArray(LINES_PER_AXIS)
    for (i in 0 until n) if (sol.weights[i] >= WEIGHT_KEPT) kept[used[i][0].toInt()]++
    return present.filter { kept[it] >= MIN_BAND_SAMPLES }.associateWith { k ->
        GridLine(sol.x[0] + sol.x[1] * k, sol.x[col.getValue(k)])
    }
}

/** [squareOffsets] on a grid already measured. */
fun squareOffsets(
    grid: BoardGrid,
    boardSize: Int,
): SquareOffsets {
    val cell = boardSize / BOARD_SIDE_D
    val centre = grid.pad + boardSize / 2.0
    val off = LinkedHashMap<String, Double>()
    for (f in 0 until BOARD_SIDE) {
        for (r in 0 until BOARD_SIDE) {
            squareOffset(grid, f, r, cell, centre)?.let { off["${'a' + f}${r + 1}"] = it }
        }
    }
    return SquareOffsets(off, grid.unread)
}

/**
 * Per-square offset: the largest displacement of any of the square's four boundaries from where the
 * grid says it should be — the quantity that decides whether the crop cut at that cell contains the
 * square or a slice of its neighbour.
 *
 * Each edge is evaluated WHERE IT PASSES THAT SQUARE, using the line's measured slope, so a grid
 * rotated inside the warp no longer reads as perfectly aligned because its lines happen to cross the
 * middle in the right place.
 *
 * `unread` counts out of 18 when [pad] `> 0` and out of 14 when it is 0 — without surrounding board
 * the outer lines are not measurable, and they are reported missing rather than assumed perfect.
 */
fun squareOffsets(
    warped: Mat,
    boardSize: Int,
    pad: Int = 0,
): SquareOffsets = squareOffsets(gridLines(warped, boardSize, pad), boardSize)

/** The worst of one square's four boundary displacements, or null if any of them is unmeasured. */
private fun squareOffset(
    grid: BoardGrid,
    file: Int,
    rank: Int,
    cell: Double,
    centre: Double,
): Double? {
    // Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
    val cy = grid.pad + (BOARD_SIDE - 0.5 - rank) * cell
    val cx = grid.pad + (file + 0.5) * cell
    val top = BOARD_SIDE - 1 - rank
    val at = { axis: Int, k: Int, coord: Double ->
        grid.at(axis, k)?.let { it.slope * (coord - centre) + it.offset - grid.pad } ?: Double.NaN
    }
    val edges = doubleArrayOf(at(0, file, cy), at(0, file + 1, cy), at(1, top, cx), at(1, top + 1, cx))
    val want = doubleArrayOf(file * cell, (file + 1) * cell, top * cell, (top + 1) * cell)
    if (edges.any { it.isNaN() }) return null
    var worst = 0.0
    for (i in edges.indices) worst = max(worst, abs(edges[i] - want[i]))
    return worst
}

/** [squareOffsets] for a RAW frame and its corner quad, measured out to the board's edge. */
fun frameOffsets(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): SquareOffsets {
    val (warped, pad) = warpForGrid(frame, geom, quad)
    try {
        return squareOffsets(warped, geom.boardSize, pad)
    } finally {
        warped.release()
    }
}

/** The largest square offset in this frame, or `NaN` when nothing was measurable. */
fun worstOffset(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): Double = frameOffsets(frame, quad, geom).worst

/**
 * Measure [quad] against the board's own grid and say pass or fail.
 *
 * Absolute, never self-referential. The Python script path's `quadSpread` equivalent compares each
 * frame's quad against the MEDIAN OF THE SAME QUADS, so a consistently wrong quad scores p90 0.93
 * rectified px and 99.9 % "detected" — precision reported as accuracy, and it hid a 27-33 px error
 * for a day.
 */
fun alignmentOf(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
    maxFrac: Double = MAX_OFFSET_FRAC,
): Alignment {
    val limit = maxFrac * geom.boardSize / BOARD_SIDE_D
    val measured = frameOffsets(frame, quad, geom)
    val total = 2 * LINES_PER_AXIS
    return when {
        measured.offsets.isEmpty() ->
            Alignment(false, Double.NaN, measured.unread, limit, "no square could be measured")
        measured.unread > 0 ->
            Alignment(
                false, measured.worst, measured.unread, limit,
                "${measured.unread} of $total grid lines could not be located",
            )
        measured.worst > limit ->
            Alignment(
                false, measured.worst, measured.unread, limit,
                "${measured.offsets.count { it.value > limit }} of 64 squares are cut off their grid",
            )
        else -> Alignment(true, measured.worst, measured.unread, limit, "every square edge is on its groove")
    }
}

/**
 * A corrected corner quad, or null when the frame gives too little to fit one.
 *
 * The measurement already says where the board's lines REALLY are, so the correction is the map that
 * puts them where they belong: fit the measured lattice onto the nominal one, chain it onto the
 * existing corner homography, and read the new corners back out in frame pixels.
 *
 *     H_old : frame -> rectified (from the current quad)
 *     H_fix : rectified(measured) -> rectified(nominal)
 *     new   = H_old^-1 . H_fix^-1 . H_old . old
 *
 * That runs [iters] times, re-measuring in the corrected warp each round, and it matters more than
 * anything else here: a badly placed grid puts every groove near the edge of its search window where
 * the measurement is worst, so a single pass leaves the answer depending on how wrong the input was.
 *
 * **Coarse to fine, and the outer lines last.** The window follows [SEARCH_SCHEDULE], starting at
 * 0.45 of a cell because a three-marker quad is a third of a cell out at its worst squares —
 * outside [SEARCH_FRAC], where the first pass would simply not find the groove — and narrowing to
 * 0.18 so the last passes cannot drift onto a neighbour. The OUTER lines join only once the measured
 * displacement is under [OUTER_LOCK_FRAC] of a cell, because their window has to stay clear of the
 * board's printed label border a third of a cell further out.
 *
 * Worth applying only to a frame that is out of tolerance: inside the noise band the fit chases
 * measurement noise. Callers decide that; this function just computes.
 */
fun correctQuad(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
    iters: Int = ALIGN_ITERS,
): List<DoubleArray>? {
    val cell = geom.boardSize / BOARD_SIDE_D
    val pad = pyRound(GRID_PAD_CELLS * cell)
    var cur: List<DoubleArray>? = quad.map { it.copyOf() }
    var outer = false
    for (i in 0 until max(1, iters)) {
        val at = cur ?: return null
        val warped = warpFromCornersPadded(frame, geom, at, pad)
        val grid =
            try {
                gridLines(warped, geom.boardSize, pad, ALIGN_BANDS, SEARCH_SCHEDULE[min(i, SEARCH_SCHEDULE.size - 1)], outer)
            } finally {
                warped.release()
            }
        val (src, dst) = lattice(grid, geom.boardSize)
        outer = src.isNotEmpty() && src.indices.maxOf { k -> max(abs(src[k][0] - dst[k][0]), abs(src[k][1] - dst[k][1])) } < OUTER_LOCK_FRAC * cell
        cur = applyFit(at, src, dst, geom)
    }
    return cur
}

/** One measure-and-refit pass applied to [quad], or null when the fit gives nothing usable. */
private fun applyFit(
    quad: List<DoubleArray>,
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
    geom: BoardGeometry,
): List<DoubleArray>? {
    val hOld = homographyOf(quad, geom)
    val hOldInv = invert3(hOld)
    val hFixInv = fitProjective(src, dst)?.let { invert3(it) }
    if (hOldInv == null || hFixInv == null) return null
    val m = mul3(mul3(hOldInv, hFixInv), hOld)
    val moved = quad.map { project3(m, it) }
    return if (moved.any { it == null }) null else moved.filterNotNull()
}

/**
 * The measured line intersections and where the nominal grid puts them, in RECTIFIED coordinates.
 *
 * Two dimensions, not two collapsed profiles. The previous version fitted over samples that each
 * pinned ONE coordinate and carried the band's centre in the other, which is enough to constrain an
 * affine map and not enough to constrain a homography. Intersecting the fitted lines gives real 2D
 * correspondences, up to 81 of them, and the perspective parameters then have something to be
 * estimated from.
 */
private fun lattice(
    grid: BoardGrid,
    boardSize: Int,
): Pair<List<DoubleArray>, List<DoubleArray>> {
    val cell = boardSize / BOARD_SIDE_D
    val centre = grid.pad + boardSize / 2.0
    val src = mutableListOf<DoubleArray>()
    val dst = mutableListOf<DoubleArray>()
    for (i in 0 until LINES_PER_AXIS) {
        val v = grid.at(0, i) ?: continue
        for (j in 0 until LINES_PER_AXIS) {
            val h = grid.at(1, j) ?: continue
            val den = 1.0 - v.slope * h.slope
            if (abs(den) < MIN_DENOM) continue
            val x = (v.slope * (h.offset - centre - h.slope * centre) + v.offset) / den
            val y = h.slope * (x - centre) + h.offset
            src += doubleArrayOf(x - grid.pad, y - grid.pad)
            dst += doubleArrayOf(i * cell, j * cell)
        }
    }
    return src to dst
}

/**
 * `(best quad, verdict)` — the COARSE-to-FINE staging, in one call.
 *
 * [quad] is whatever located the board at all: an ArUco quad from two, three or four markers, or the
 * previous frame's answer. It is explicitly allowed to be tens of pixels wrong — the 2026-08-02
 * video's three-marker quads read 29.6 px of square-edge error at the median on a 100 px cell —
 * because all it has to do is bring the grooves inside the first search window. The grid fit
 * supplies the accuracy, including the perspective the coarse stage could not have.
 *
 * The verdict describes the quad that comes BACK, so a caller never has to guess which stage
 * answered.
 */
fun refineQuad(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): RefinedQuad {
    val best = correctQuad(frame, quad, geom) ?: quad
    return RefinedQuad(best, alignmentOf(frame, best, geom))
}

/**
 * `(corrected quad or null, offset before, offset after)`.
 *
 * Null for the quad when the fit failed OR when it did not actually improve the frame, so a caller
 * can write the result unconditionally and never make a frame worse.
 */
fun improveQuad(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): QuadImprovement {
    val before = worstOffset(frame, quad, geom)
    val fixed = correctQuad(frame, quad, geom) ?: return QuadImprovement(null, before, Double.NaN)
    val after = worstOffset(frame, fixed, geom)
    val better = after.isFinite() && before.isFinite() && after < before
    return QuadImprovement(if (better) fixed else null, before, after)
}

internal fun homographyOf(
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): DoubleArray {
    val h = computeHomography(quad, geom.boardSize, geom.margin)
    val out = DoubleArray(H_ELEMENTS)
    h.get(0, 0, out)
    h.release()
    return out
}

/** Denominators below this mean the two lines are parallel in the warp. */
private const val MIN_DENOM: Double = 1e-9

/** Huber weight at or above which a sample counts as kept rather than outvoted. */
private const val WEIGHT_KEPT: Double = 0.5

/** Huber IRLS: reweight this many times. */
private const val AXIS_HUBER_ITERS: Int = 5

/** Huber cut-off in robust standard deviations. */
private const val AXIS_HUBER_K: Double = 1.5

/** MAD -> sigma for a normal distribution. */
private const val AXIS_MAD_TO_SIGMA: Double = 1.4826

/** Floor on the robust scale, so a perfect fit does not divide by zero. */
private const val AXIS_MIN_SCALE: Double = 0.4

private const val AXIS_MIN_WEIGHT: Double = 1e-6

private class AxisFit(
    val x: DoubleArray,
    val weights: DoubleArray,
)

/** Huber-IRLS least squares for the axis model, or null when the system is degenerate. */
private fun huberSolve(
    design: Array<DoubleArray>,
    target: DoubleArray,
): AxisFit? {
    val n = design.size
    val cols = if (n == 0) 0 else design[0].size
    if (n < cols) return null
    val w = DoubleArray(n) { 1.0 }
    var x: DoubleArray? = null
    repeat(AXIS_HUBER_ITERS) {
        x = weightedLeastSquares(design, target, w) ?: x
        x?.let { sol ->
            val r = DoubleArray(n) { i -> abs(dot(design[i], sol) - target[i]) }
            val s = max(AXIS_MIN_SCALE, AXIS_MAD_TO_SIGMA * medianOf(r))
            for (i in 0 until n) w[i] = min(1.0, AXIS_HUBER_K * s / max(r[i], AXIS_MIN_WEIGHT))
        }
    }
    return x?.let { AxisFit(it, w) }
}

/**
 * Weighted normal equations, solved by Cholesky with an SVD fallback.
 *
 * The normal equations are acceptable here and not in `ProjectiveFit.kt` because the design matrix
 * is one lever column, one lever-times-index column and a set of 0/1 indicators — all of the same
 * order — rather than coordinates running to `boardSize`.
 */
private fun weightedLeastSquares(
    design: Array<DoubleArray>,
    target: DoubleArray,
    w: DoubleArray,
): DoubleArray? {
    val cols = design[0].size
    val ata = Array(cols) { DoubleArray(cols) }
    val atb = DoubleArray(cols)
    for (i in design.indices) {
        val wi = max(w[i], AXIS_MIN_WEIGHT)
        for (a in 0 until cols) {
            atb[a] += wi * design[i][a] * target[i]
            for (b in a until cols) ata[a][b] += wi * design[i][a] * design[i][b]
        }
    }
    for (a in 0 until cols) for (b in 0 until a) ata[a][b] = ata[b][a]
    return solveSymmetric(ata, atb)
}

/** Gauss-Jordan with partial pivoting on a small symmetric system, or null when singular. */
private fun solveSymmetric(
    a: Array<DoubleArray>,
    b: DoubleArray,
): DoubleArray? {
    val n = b.size
    val m = Array(n) { i -> a[i].copyOf() + doubleArrayOf(b[i]) }
    for (c in 0 until n) {
        var pivot = c
        for (r in c until n) if (abs(m[r][c]) > abs(m[pivot][c])) pivot = r
        if (abs(m[pivot][c]) < PIVOT_EPS) return null
        val tmp = m[c]
        m[c] = m[pivot]
        m[pivot] = tmp
        val d = m[c][c]
        for (k in c..n) m[c][k] /= d
        for (r in 0 until n) {
            if (r == c) continue
            val f = m[r][c]
            if (f == 0.0) continue
            for (k in c..n) m[r][k] -= f * m[c][k]
        }
    }
    return DoubleArray(n) { m[it][n] }
}

private const val PIVOT_EPS: Double = 1e-12

private fun dot(
    a: DoubleArray,
    b: DoubleArray,
): Double {
    var s = 0.0
    for (i in b.indices) s += a[i] * b[i]
    return s
}

private fun medianOf(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sortedArray()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 1) sorted[mid] else (sorted[mid - 1] + sorted[mid]) / 2.0
}

/**
 * The rectified board as one grey plane, with the two band collapses.
 *
 * Pulled across JNI once and reduced in Kotlin. `Core.reduce` over a submat would be the obvious
 * transcription of numpy's `median(axis=…)`, but this runs 16 band collapses per measurement and 4
 * measurements per [correctQuad] — 64 native round trips against one.
 */
private class BoardGray(
    warped: Mat,
) {
    val width: Int
    val height: Int
    private val data: ByteArray

    init {
        val gray = Mat()
        try {
            if (warped.channels() == 1) warped.copyTo(gray) else Imgproc.cvtColor(warped, gray, Imgproc.COLOR_BGR2GRAY)
            width = gray.cols()
            height = gray.rows()
            data = ByteArray(width * height)
            gray.get(0, 0, data)
        } finally {
            gray.release()
        }
    }

    /** Median down the rows of `[y0, y1)` — one value per column, the profile vertical lines sit in. */
    fun columnMedians(
        y0: Int,
        y1: Int,
    ): DoubleArray {
        val lo = max(0, y0)
        val hi = min(height, y1)
        val out = DoubleArray(width)
        if (hi <= lo) return out
        val buf = DoubleArray(hi - lo)
        for (x in 0 until width) {
            for (y in lo until hi) buf[y - lo] = (data[y * width + x].toInt() and BYTE_MASK).toDouble()
            out[x] = medianOf(buf)
        }
        return out
    }

    /** Median across the columns of `[x0, x1)` — one value per row. */
    fun rowMedians(
        x0: Int,
        x1: Int,
    ): DoubleArray {
        val lo = max(0, x0)
        val hi = min(width, x1)
        val out = DoubleArray(height)
        if (hi <= lo) return out
        val buf = DoubleArray(hi - lo)
        for (y in 0 until height) {
            val row = y * width
            for (x in lo until hi) buf[x - lo] = (data[row + x].toInt() and BYTE_MASK).toDouble()
            out[y] = medianOf(buf)
        }
        return out
    }
}
