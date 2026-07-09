package com.chesslab.tracker.geometry

import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * EXPERIMENTAL markerless board detection from the board lines (no deep
 * learning). Direct port of `board_corners_from_lines` (`calibration.py:656-786`)
 * and its helpers (see [HoughPipeline], [LineFamilies]). Used as a calibration
 * assist and drift check only (wired behind the experimental settings toggle in
 * phase 04).
 *
 * Pipeline: grayscale + resize to work width 960 -> Canny(40, 120) -> HoughLines
 * with adaptive threshold fractions 0.30/0.24/0.19 -> two angle families
 * (>= 6 lines each, >= 35 deg apart) -> RANSAC 9-term grid progression per
 * family -> extrapolate outer slots -> intersect outer lines -> 4 corners,
 * mapped to (a8, h8, h1, a1) by proximity to `prior` (`_finish_quad`).
 */
object BoardDetector {
    /**
     * Detect the four board corners in [frame] (BGR). Returns null if no
     * consistent grid is found.
     *
     * With a [prior] the result is rotated to match the calibrated corner
     * assignment (lines alone cannot distinguish 90/180 deg rotations). Without
     * a prior the corners are returned angle-sorted with UNRESOLVED orientation
     * — the phase 04 confirm step assigns a8.
     */
    fun detect(
        frame: Mat,
        prior: BoardCorners? = null,
    ): BoardCorners? {
        val w = frame.cols()
        val h = frame.rows()
        val scale = min(1.0, WORK_WIDTH / w.toDouble())
        val priorV2 = prior?.toList()?.map { V2(it.x.toDouble(), it.y.toDouble()) }
        return quadFromHough(edgeMap(frame, scale))
            ?.map { V2(it.x / scale, it.y / scale) }
            ?.let { finishQuad(it, w, h, priorV2) }
            ?.let { ordered -> BoardCorners.of(ordered.map { Point(it.x.toFloat(), it.y.toFloat()) }) }
    }

    /**
     * RANSAC over line positions for the 9-term arithmetic grid progression.
     * Returns (first_position, spacing) of outer slots 0 and 8, else null.
     * Ports `_grid_progression`. Internal for unit testing and [familyBorders].
     */
    internal fun gridProgression(positions: List<Double>): DoubleArray? {
        val n = positions.size
        if (n < GRID_MIN_SLOTS) return null
        val span = positions.max() - positions.min()
        val sLo = span / SPAN_S_LO_DIV
        val sHi = span / SPAN_S_HI_DIV
        var best: Candidate? = null
        for (i in 0 until n) {
            for (j in i + 1 until n) {
                val cand = bestForPair(positions[i], positions[j], positions, sLo, sHi)
                if (cand != null && (best == null || cand.betterThan(best))) best = cand
            }
        }
        return best?.let { doubleArrayOf(it.base, it.spacing) }
    }

    /** Best progression candidate for pair (pi, pj), over all slot counts k and shifts. */
    private fun bestForPair(
        pi: Double,
        pj: Double,
        positions: List<Double>,
        sLo: Double,
        sHi: Double,
    ): Candidate? {
        var best: Candidate? = null
        val gap = pj - pi
        for (k in 1 until GRID_LINES) {
            val s = gap / k
            if (s <= MIN_SPACING || s < sLo || s > sHi) continue
            for (shift in 0 until (GRID_LINES - k)) {
                val cand = evaluateProgression(pi - shift * s, s, positions)
                if (cand != null && (best == null || cand.betterThan(best))) best = cand
            }
        }
        return best
    }

    /** Count distinct grid slots hit by [base] + m*[spacing]; null if fewer than the minimum. */
    private fun evaluateProgression(
        base: Double,
        spacing: Double,
        positions: List<Double>,
    ): Candidate? {
        val slots = HashMap<Int, Double>()
        for (q in positions) {
            val m = ((q - base) / spacing).roundToInt()
            val e = abs(q - (base + m * spacing))
            if (m in 0..LAST_SLOT && e <= spacing * SLOT_TOL_FRAC) {
                slots[m] = min(e, slots[m] ?: Double.MAX_VALUE)
            }
        }
        if (slots.size < GRID_MIN_SLOTS) return null
        return Candidate(slots.size, -slots.values.sum() / spacing, base, spacing)
    }
}

/**
 * Plausibility (inside image, minimum area) + mapping to (a8, h8, h1, a1):
 * pick the rotation closest to [prior]. Without a prior, returns the
 * angle-sorted quad (orientation unresolved). Ports `_finish_quad`.
 */
internal fun finishQuad(
    quad: List<V2>,
    w: Int,
    h: Int,
    prior: List<V2>?,
): List<V2>? {
    if (!isPlausible(quad, w, h)) return null
    return if (prior != null && prior.size >= BoardCorners.CORNER_COUNT) alignToPrior(quad, prior) else quad
}

/** Corners inside a padded image bounds and enclosing at least the minimum area fraction. */
internal fun isPlausible(
    quad: List<V2>,
    w: Int,
    h: Int,
): Boolean {
    val inBounds =
        quad.all { p ->
            p.x in -BOUNDS_MARGIN * w..(1 + BOUNDS_MARGIN) * w && p.y in -BOUNDS_MARGIN * h..(1 + BOUNDS_MARGIN) * h
        }
    return inBounds && abs(shoelaceArea(quad)) / 2.0 >= AREA_MIN_FRAC * w * h
}

/** Rotate the quad to the assignment minimizing squared distance to the prior corners. */
internal fun alignToPrior(
    quad: List<V2>,
    prior: List<V2>,
): List<V2> {
    var bestRot = 0
    var bestCost = Double.MAX_VALUE
    for (rot in 0 until BoardCorners.CORNER_COUNT) {
        val rq = quad.subList(rot, quad.size) + quad.subList(0, rot)
        val cost = (0 until BoardCorners.CORNER_COUNT).sumOf { squaredDist(rq[it], prior[it]) }
        if (cost < bestCost) {
            bestCost = cost
            bestRot = rot
        }
    }
    return quad.subList(bestRot, quad.size) + quad.subList(0, bestRot)
}

private fun shoelaceArea(quad: List<V2>): Double {
    var area = 0.0
    for (i in quad.indices) {
        val a = quad[i]
        val b = quad[(i + 1) % quad.size]
        area += a.x * b.y - b.x * a.y
    }
    return area
}

private fun squaredDist(
    a: V2,
    b: V2,
): Double = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)

/** A grid-progression hypothesis, compared lexicographically like the Python tuple. */
private class Candidate(
    val slots: Int,
    val negError: Double,
    val base: Double,
    val spacing: Double,
) {
    /** More slots wins; ties broken by smaller normalized error (larger negError). */
    fun betterThan(other: Candidate): Boolean {
        if (slots != other.slots) return slots > other.slots
        return negError > other.negError
    }
}
