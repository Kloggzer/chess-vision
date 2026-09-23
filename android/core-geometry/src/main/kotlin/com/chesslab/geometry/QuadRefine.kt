package com.chesslab.geometry

import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Decides what to do with the numbers `Alignment.kt` measures.

/** One pass leaves the answer depending on how bad the input was. */
const val ALIGN_ITERS: Int = 4

/** A three-marker quad starts a third of a cell out: the first pass must reach the groove, later ones stop
 *  chasing the neighbour. */
private val SEARCH_SCHEDULE = doubleArrayOf(0.45, 0.30, 0.22, 0.18)

private const val OUTER_LOCK_FRAC: Double = 0.5 * OUTER_SEARCH_FRAC

private const val MIN_DENOM: Double = 1e-9

class QuadImprovement(
    val quad: List<DoubleArray>?,
    val before: Double,
    val after: Double,
)

/** `new = H_old^-1 . H_fix^-1 . H_old . old`, [iters] times, re-measuring each round: a bad grid puts every
 *  groove at its window edge. Coarse to fine; outer lines only under [OUTER_LOCK_FRAC] (the label border).
 *  Worth applying only out of tolerance — callers decide. */
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

/** Line INTERSECTIONS, real 2D correspondences (up to 81): samples pinning one coordinate constrain an affine
 *  map, not a homography — a fit on those came out worse than its input (31.7 px). */
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

/** Null when the fit failed OR did not improve the frame, so a caller writes unconditionally and never worsens it. */
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
