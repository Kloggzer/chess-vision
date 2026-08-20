package com.chesslab.geometry

import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Turning a measured grid into a corrected corner quad. Port of `alignment.py::correct_quad`,
// `refine_quad` and `improve_quad`.
//
// Kept apart from `Alignment.kt`, which MEASURES: this file decides what to do with the numbers.

/** Iterations of measure-and-refit. One pass leaves the answer depending on how bad the input was. */
const val ALIGN_ITERS: Int = 4

/**
 * Search half-width per refit iteration, as a fraction of a cell. A three-marker quad starts a third
 * of a cell out, which is outside `SEARCH_FRAC` at the worst squares — the first pass has to be able
 * to reach the groove at all, and later passes have to stop chasing the neighbour.
 */
private val SEARCH_SCHEDULE = doubleArrayOf(0.45, 0.30, 0.22, 0.18)

/** Below this measured displacement (fraction of a cell) the OUTER lines can be searched safely. */
private const val OUTER_LOCK_FRAC: Double = 0.5 * OUTER_SEARCH_FRAC

/** Denominators below this mean the two lines are parallel in the warp. */
private const val MIN_DENOM: Double = 1e-9

/** [improveQuad]'s answer: the corrected quad (or null), and the offset before and after. */
class QuadImprovement(
    val quad: List<DoubleArray>?,
    val before: Double,
    val after: Double,
)

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
 * **Coarse to fine, and the outer lines last.** The window follows [SEARCH_SCHEDULE]; the OUTER
 * lines join only once the measured displacement is under [OUTER_LOCK_FRAC] of a cell, because their
 * window has to stay clear of the board's printed label border a third of a cell further out.
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
        val searchFrac = SEARCH_SCHEDULE[min(i, SEARCH_SCHEDULE.size - 1)]
        val grid = measureAt(frame, at, geom, pad, searchFrac, outer)
        val (src, dst) = lattice(grid, geom.boardSize)
        outer = src.isNotEmpty() && worstDisplacement(src, dst) < OUTER_LOCK_FRAC * cell
        cur = applyFit(at, src, dst, geom)
    }
    return cur
}

private fun measureAt(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
    pad: Int,
    searchFrac: Double,
    outer: Boolean,
): BoardGrid {
    val warped = warpFromCornersPadded(frame, geom, quad, pad)
    try {
        return gridLines(warped, geom.boardSize, pad, ALIGN_BANDS, searchFrac, outer)
    } finally {
        warped.release()
    }
}

private fun worstDisplacement(
    src: List<DoubleArray>,
    dst: List<DoubleArray>,
): Double = src.indices.maxOf { k -> max(abs(src[k][0] - dst[k][0]), abs(src[k][1] - dst[k][1])) }

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
 * affine map and not enough to constrain a homography — a fit over those came out WORSE than its own
 * input on one frame (31.7 px; `docs/data-pipeline.md` §13). Intersecting the fitted lines gives real 2D
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
            val h = grid.at(1, j)
            val den = if (h == null) 0.0 else 1.0 - v.slope * h.slope
            if (h != null && abs(den) >= MIN_DENOM) {
                val x = (v.slope * (h.offset - centre - h.slope * centre) + v.offset) / den
                val y = h.slope * (x - centre) + h.offset
                src += doubleArrayOf(x - grid.pad, y - grid.pad)
                dst += doubleArrayOf(i * cell, j * cell)
            }
        }
    }
    return src to dst
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
