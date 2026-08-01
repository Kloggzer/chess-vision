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

/** How far either side of an expected line to look, as a fraction of a cell (`alignment.py:35`). */
private const val SEARCH_FRAC: Double = 0.25

/** Cap on the centroid half-width, as a fraction of a cell — about one and a half groove widths. */
private const val CENTROID_FRAC: Double = 0.08

/** Bands per axis. 1 reproduces the old tilt-blind collapse; 2 and 8 land within 0.1 px of 4. */
const val ALIGN_BANDS: Int = 4

/** Iterations of measure-and-refit. One pass leaves the answer depending on how bad the input was. */
const val ALIGN_ITERS: Int = 3

/** Fewest usable samples per axis before a slope is worth estimating. */
private const val MIN_SLOPE_SAMPLES: Int = 4

private const val LATTICE_LINES: Int = BOARD_SIDE - 1

private const val BYTE_MASK: Int = 0xFF

/** The board's real line positions per axis, plus the tilt of each axis. */
class LineGeometry(
    /** 9 vertical-line x positions; index 0 and 8 are pinned, interior ones may be `NaN`. */
    val xs: DoubleArray,
    /** 9 horizontal-line y positions. */
    val ys: DoubleArray,
    /** dx per unit y — one slope for the whole axis, not one per line. */
    val slopeX: Double,
    /** dy per unit x. */
    val slopeY: Double,
)

/** One groove: where it was measured, where the nominal grid puts it, and which axis it pins. */
class LatticeSample(
    val src: DoubleArray,
    val dst: DoubleArray,
    /** 0 for a sample that pins a VERTICAL line's x, 1 for a horizontal line's y. */
    val axis: Int,
)

/** Band-wise groove samples over the whole board. */
class Lattice(
    val samples: List<LatticeSample>,
) {
    val size: Int get() = samples.size
    val src: List<DoubleArray> get() = samples.map { it.src }
    val dst: List<DoubleArray> get() = samples.map { it.dst }
}

/** Per-square offsets in rectified pixels, and how many interior lines could not be located. */
class SquareOffsets(
    val offsets: Map<String, Double>,
    val unread: Int,
) {
    /** The largest square offset, or `NaN` when nothing was measurable. */
    val worst: Double get() = offsets.values.maxOrNull() ?: Double.NaN
}

/** [improveQuad]'s answer: the corrected quad (or null), and the offset before and after. */
class QuadImprovement(
    val quad: List<DoubleArray>?,
    val before: Double,
    val after: Double,
)

/** Search window and centroid width, derived once per measurement from the cell size. */
private class ProfileParams(
    val cell: Double,
    val span: Int,
    val csp: Int,
) {
    constructor(boardSize: Int) : this(
        boardSize / BOARD_SIDE_D,
        pyRound(boardSize / BOARD_SIDE_D * SEARCH_FRAC),
        max(2, pyRound(boardSize / BOARD_SIDE_D * CENTROID_FRAC)),
    )
}

/**
 * The board's REAL 9 line positions per axis, as `(xs, ys)` in rectified pixels.
 *
 * Index 0 and 8 are the playing-field edges, which the warp fixes at 0 and [boardSize] by
 * construction — they are not measured and cannot drift. An interior groove that cannot be told
 * from its neighbourhood comes back as `NaN`: pieces sit ON the grooves and legitimately hide some.
 *
 * This is the whole-board collapse, the most PRECISE estimate of where a line crosses the middle of
 * the board, and it says nothing about tilt. [lineGeometry] adds the tilt.
 */
fun linePositions(
    warped: Mat,
    boardSize: Int,
): Pair<DoubleArray, DoubleArray> {
    val g = BoardGray(warped)
    val p = ProfileParams(boardSize)
    // INTENSITY collapsed along the lines of this axis, not its gradient: a groove is a dark band
    // and its centre is what the grid is supposed to sit on.
    val xs = profileLines(g.columnMeans(0, g.height), p.cell, p.span, p.csp)
    val ys = profileLines(g.rowMeans(0, g.width), p.cell, p.span, p.csp)
    xs[0] = 0.0
    xs[BOARD_SIDE] = boardSize.toDouble()
    ys[0] = 0.0
    ys[BOARD_SIDE] = boardSize.toDouble()
    return xs to ys
}

/**
 * Band-wise groove samples. Each interior line contributes one sample per band instead of one for
 * the whole board, which is what makes a tilt visible at all — at sqrt(bands) worse noise per
 * sample, which the fit averages straight back out.
 */
fun boardLattice(
    warped: Mat,
    boardSize: Int,
    bands: Int = ALIGN_BANDS,
): Lattice {
    val g = BoardGray(warped)
    val p = ProfileParams(boardSize)
    val bh = boardSize.toDouble() / bands
    val out = mutableListOf<LatticeSample>()
    for (axis in 0..1) {
        for (bi in 0 until bands) {
            out += bandSamples(g, axis, pyRound(bi * bh), pyRound((bi + 1) * bh), p)
        }
    }
    return Lattice(out)
}

/**
 * The grooves one band of one axis contributes.
 *
 * The sample's other coordinate is the band's centre and carries no information of its own — it is
 * the lever arm the slope is regressed against, nothing more.
 */
private fun bandSamples(
    g: BoardGray,
    axis: Int,
    s0: Int,
    s1: Int,
    p: ProfileParams,
): List<LatticeSample> {
    val mid = (s0 + s1) / 2.0
    val prof = if (axis == 0) g.columnMeans(s0, s1) else g.rowMeans(s0, s1)
    val pos = profileLines(prof, p.cell, p.span, p.csp)
    val out = mutableListOf<LatticeSample>()
    for (k in 1..LATTICE_LINES) {
        val found = pos[k]
        if (found.isNaN()) continue
        val nom = k * p.cell
        out +=
            if (axis == 0) {
                LatticeSample(doubleArrayOf(found, mid), doubleArrayOf(nom, mid), axis)
            } else {
                LatticeSample(doubleArrayOf(mid, found), doubleArrayOf(mid, nom), axis)
            }
    }
    return out
}

/**
 * Line positions at the board's middle, and the TILT of each axis.
 *
 * The position comes from the whole-board collapse — the lowest-noise estimate there is — and only
 * the tilt comes from the bands, so tilt awareness costs nothing where the old measurement was
 * already right.
 *
 * **One slope per axis, not one per line.** The tilt worth measuring is a rotation or shear of the
 * whole grid, which every line of an axis shares; a per-line slope would additionally chase the
 * board's own warp, and that is 0.75 px peak to peak on the reference board — far below the noise a
 * 4-sample regression carries. Pooling divides the slope's noise by sqrt(7) and loses nothing real.
 *
 * The tilt it reports is real, not slope noise: estimated twice per frame from two disjoint halves
 * of the bands, the two answers correlate at +0.91.
 */
fun lineGeometry(
    warped: Mat,
    boardSize: Int,
    bands: Int = ALIGN_BANDS,
): LineGeometry {
    val (xs, ys) = linePositions(warped, boardSize)
    val lattice = boardLattice(warped, boardSize, bands)
    val cell = boardSize / BOARD_SIDE_D
    val half = boardSize / 2.0
    return LineGeometry(
        xs,
        ys,
        axisSlope(lattice, xs, axis = 0, cell = cell, half = half),
        axisSlope(lattice, ys, axis = 1, cell = cell, half = half),
    )
}

/** Least-squares slope of one axis's samples against their lever arm from the board's centre. */
private fun axisSlope(
    lattice: Lattice,
    base: DoubleArray,
    axis: Int,
    cell: Double,
    half: Double,
): Double {
    var lever2 = 0.0
    var leverResid = 0.0
    var used = 0
    for (s in lattice.samples) {
        if (s.axis != axis) continue
        val mid = base.getOrElse(pyRound(s.dst[axis] / cell)) { Double.NaN }
        if (!mid.isNaN()) {
            val lever = s.src[1 - axis] - half
            lever2 += lever * lever
            leverResid += lever * (s.src[axis] - mid)
            used++
        }
    }
    return if (used >= MIN_SLOPE_SAMPLES && lever2 > 0.0) leverResid / lever2 else 0.0
}

/**
 * Per-square offset: the largest displacement of any of the square's four boundaries from where the
 * grid says it should be — the quantity that decides whether the crop cut at that cell contains the
 * square or a slice of its neighbour.
 *
 * Each edge is evaluated WHERE IT PASSES THAT SQUARE, using the line's measured slope, so a grid
 * rotated inside the warp no longer reads as perfectly aligned because its lines happen to cross
 * the middle in the right place.
 */
fun squareOffsets(
    warped: Mat,
    boardSize: Int,
): SquareOffsets {
    val geom = lineGeometry(warped, boardSize)
    val cell = boardSize / BOARD_SIDE_D
    val half = boardSize / 2.0
    var unread = 0
    for (k in 1..LATTICE_LINES) {
        if (geom.xs[k].isNaN()) unread++
        if (geom.ys[k].isNaN()) unread++
    }
    val off = LinkedHashMap<String, Double>()
    for (f in 0 until BOARD_SIDE) {
        for (r in 0 until BOARD_SIDE) {
            squareOffset(geom, f, r, cell, half)?.let { off["${'a' + f}${r + 1}"] = it }
        }
    }
    return SquareOffsets(off, unread)
}

/** The worst of one square's four boundary displacements, or null if any of them is unmeasured. */
private fun squareOffset(
    geom: LineGeometry,
    file: Int,
    rank: Int,
    cell: Double,
    half: Double,
): Double? {
    // Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
    val cy = (BOARD_SIDE - 0.5 - rank) * cell
    val cx = (file + 0.5) * cell
    val top = BOARD_SIDE - 1 - rank
    val edges =
        doubleArrayOf(
            geom.xs[file] + geom.slopeX * (cy - half),
            geom.xs[file + 1] + geom.slopeX * (cy - half),
            geom.ys[top] + geom.slopeY * (cx - half),
            geom.ys[top + 1] + geom.slopeY * (cx - half),
        )
    val want = doubleArrayOf(file * cell, (file + 1) * cell, top * cell, (top + 1) * cell)
    if (edges.any { it.isNaN() }) return null
    var worst = 0.0
    for (i in edges.indices) worst = max(worst, abs(edges[i] - want[i]))
    return worst
}

/** [squareOffsets] for a RAW frame and its corner quad. */
fun frameOffsets(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): SquareOffsets {
    val warped = warpFromCorners(frame, geom, quad)
    try {
        return squareOffsets(warped, geom.boardSize)
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
 * A corrected corner quad, or null when the frame gives too little to fit one.
 *
 * The measurement already says where the board's lines REALLY are, so the correction is the map
 * that puts them where they belong: fit the measured lattice onto the nominal one, chain it onto
 * the existing corner homography, and read the new corners back out in frame pixels.
 *
 *     H_old : frame -> rectified (from the current quad)
 *     H_fix : rectified(measured) -> rectified(nominal)
 *     new   = H_old^-1 . H_fix^-1 . H_old . old
 *
 * That runs [iters] times, re-measuring in the corrected warp each round, and it matters more than
 * anything else here: a badly placed grid puts every groove near the edge of its search window
 * where the measurement is worst, so a single pass leaves the answer depending on how wrong the
 * input was — 7.5 px from a broken quad against 2.4 px from a good one, where iterating brings both
 * to ~3.5.
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
    var cur: List<DoubleArray>? = quad.map { it.copyOf() }
    repeat(max(1, iters)) {
        cur = cur?.let { refine(frame, it, geom) }
    }
    return cur
}

/** One measure-and-refit pass, or null when the frame gives too little. */
private fun refine(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): List<DoubleArray>? {
    val warped = warpFromCorners(frame, geom, quad)
    val lattice =
        try {
            boardLattice(warped, geom.boardSize)
        } finally {
            warped.release()
        }
    val hOld = homographyOf(quad, geom)
    val hOldInv = invert3(hOld)
    val hFixInv = fitAffine(lattice.src, lattice.dst)?.let { invert3(it) }
    if (hOldInv == null || hFixInv == null) return null
    val m = mul3(mul3(hOldInv, hFixInv), hOld)
    val moved = quad.map { project3(m, it) }
    return if (moved.any { it == null }) null else moved.filterNotNull()
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

private fun homographyOf(
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): DoubleArray {
    val h = computeHomography(quad, geom.boardSize, geom.margin)
    val out = DoubleArray(9)
    h.get(0, 0, out)
    h.release()
    return out
}

/**
 * The rectified board as one grey plane, with the two band collapses.
 *
 * Pulled across JNI once and reduced in Kotlin. `Core.reduce` over a submat would be the obvious
 * transcription of numpy's `mean(axis=…)`, but this runs 8 band collapses plus 2 whole-board ones
 * per measurement, and 4 measurements per [improveQuad] — 40 native round trips against one.
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

    /** Mean down the rows of `[y0, y1)` — one value per column, the profile vertical lines sit in. */
    fun columnMeans(
        y0: Int,
        y1: Int,
    ): DoubleArray {
        val lo = max(0, y0)
        val hi = min(height, y1)
        val out = DoubleArray(width)
        if (hi <= lo) return out
        // Row-major: the column-major transcription touches a new cache line on every read.
        for (y in lo until hi) {
            val row = y * width
            for (x in 0 until width) out[x] += (data[row + x].toInt() and BYTE_MASK).toDouble()
        }
        val n = (hi - lo).toDouble()
        for (x in 0 until width) out[x] /= n
        return out
    }

    /** Mean across the columns of `[x0, x1)` — one value per row. */
    fun rowMeans(
        x0: Int,
        x1: Int,
    ): DoubleArray {
        val lo = max(0, x0)
        val hi = min(width, x1)
        val out = DoubleArray(height)
        if (hi <= lo) return out
        val n = (hi - lo).toDouble()
        for (y in 0 until height) {
            val row = y * width
            var s = 0.0
            for (x in lo until hi) s += (data[row + x].toInt() and BYTE_MASK).toDouble()
            out[y] = s / n
        }
        return out
    }
}
