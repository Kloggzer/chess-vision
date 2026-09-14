package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.hypot

/**
 * Straightness of a run of points that is straight in the world: the largest perpendicular distance
 * from the chord through its ends, as a fraction of that chord.
 *
 * Null — never zero — when there is too little to judge. The Python original returns 0.0 for fewer
 * than three points, which is fine as a report and ruinous as an objective: a barely visible line
 * would score perfectly straight and pull the fit toward wherever the least information is.
 */
fun bow(points: List<DoubleArray>): Double? {
    if (points.size < MIN_BOW_POINTS) return null
    val first = points.first()
    val last = points.last()
    val dx = last[0] - first[0]
    val dy = last[1] - first[1]
    val chord = hypot(dx, dy)
    if (chord < MIN_CHORD_PX) return null
    val worst = points.maxOf { abs((it[0] - first[0]) * dy - (it[1] - first[1]) * dx) / chord }
    return worst / chord
}

/** What the fit had to work with. A thin calibration must be recognisable as thin. */
class LensEvidence(
    val lines: Int,
    val points: Int,
    val axes: Int,
    /** Fraction of a 3x3 image grid that any contributing point falls in. */
    val coverage: Double,
) {
    /** What the evidence can carry — nothing is fitted that nothing was observed for. */
    val budget: Int
        get() =
            when {
                lines < MIN_LINES_K1 || axes < 2 -> BUDGET_NONE
                lines >= MIN_LINES_CENTRE && coverage >= GOOD_COVERAGE -> BUDGET_CENTRE
                lines >= MIN_LINES_K2 && coverage >= GOOD_COVERAGE -> BUDGET_K2
                else -> BUDGET_K1
            }

    override fun toString(): String = "$lines lines, $points points, $axes axes, coverage ${"%.2f".format(coverage)}"
}

/** A distortion model and the evidence behind it. [bowAfter] against [bowBefore] is the whole claim. */
data class LensFit(
    val k1: Double,
    val k2: Double,
    val cx: Double,
    val cy: Double,
    val focal: Double,
    val bowBefore: Double,
    val bowAfter: Double,
    val evidence: LensEvidence,
    val rejected: String? = null,
) {
    /** The Python rule: a fit must beat what it replaces by a real margin, or it is not saved. */
    val ok: Boolean get() = rejected == null && bowAfter <= ACCEPT_RATIO * bowBefore
}

/**
 * The lens, from lines that are straight in the world.
 *
 * Straightness is invariant to focal length — whether collinear points stay collinear does not
 * depend on it — so this fits distortion ALONE and never trades one against the other. That is why
 * it replaces a search that had to grid over focal length: that objective was a residual after a
 * homography, and a homography absorbs focal length.
 *
 * [focal] is a scale for the model, not an estimate of the optics, and it is held fixed.
 */
fun fitLens(
    samples: List<GridSample>,
    width: Int,
    height: Int,
): LensFit {
    val lines = groupLines(samples)
    val evidence = evidenceOf(lines, width, height)
    val focal = width.toDouble()
    val centre = doubleArrayOf(width / 2.0, height / 2.0)
    val before = totalBow(lines, 0.0, 0.0, centre, focal)
    if (evidence.budget == BUDGET_NONE || before == null) {
        val nan = before ?: Double.NaN
        return LensFit(0.0, 0.0, centre[0], centre[1], focal, nan, nan, evidence, "too little to fit: $evidence")
    }

    fun score(
        k1: Double,
        k2: Double,
        c: DoubleArray,
    ): Double = totalBow(lines, k1, k2, c, focal) ?: Double.MAX_VALUE

    var k1 = search(K1_LOW, K1_HIGH, 0.0) { score(it, 0.0, centre) }
    var k2 = 0.0
    if (evidence.budget >= BUDGET_K2) {
        k2 = search(K2_LOW, K2_HIGH, 0.0) { score(k1, it, centre) }
        k1 = search(k1 - K1_REFINE, k1 + K1_REFINE, k1) { score(it, k2, centre) }
    }
    var best = centre
    if (evidence.budget >= BUDGET_CENTRE) {
        val span = CENTRE_SPAN_FRAC * width
        val cx = search(centre[0] - span, centre[0] + span, centre[0]) { score(k1, k2, doubleArrayOf(it, centre[1])) }
        val cy = search(centre[1] - span, centre[1] + span, centre[1]) { score(k1, k2, doubleArrayOf(cx, it)) }
        // The centre trades against tangential distortion, so it only moves on a real margin.
        val moved = doubleArrayOf(cx, cy)
        if (score(k1, k2, moved) < CENTRE_MARGIN * score(k1, k2, centre)) best = moved
    }
    return LensFit(k1, k2, best[0], best[1], focal, before, score(k1, k2, best), evidence)
}

/**
 * Golden-section on [low]..[high], and it can never return something worse than [fallback].
 *
 * Both halves of that sentence were bugs first. The interval update has to move the END AWAY from
 * the better probe: `right` sits above `left`, so a better `right` means the minimum is to the
 * right and the LOW end moves up. Having them the wrong way round walked the search away from the
 * optimum and still returned a confident number.
 *
 * And a search that only reports its own best can report something worse than doing nothing. The
 * fallback is the identity — no distortion — so a fit that cannot beat an uncorrected picture
 * leaves it uncorrected, which is the rule `improveQuad` already follows for quads.
 */
private fun search(
    low: Double,
    high: Double,
    fallback: Double,
    score: (Double) -> Double,
): Double {
    var a = low
    var b = high
    repeat(SEARCH_STEPS) {
        val left = b - (b - a) / GOLDEN
        val right = a + (b - a) / GOLDEN
        if (score(left) < score(right)) b = right else a = left
    }
    return listOf(fallback, low, high, (a + b) / 2).minBy(score)
}

/** Points of one world-straight line, ordered along it so the chord spans the line's full extent. */
private fun groupLines(samples: List<GridSample>): List<List<DoubleArray>> =
    samples
        .groupBy { it.axis to it.line }
        .map { (key, group) ->
            val points = group.map { doubleArrayOf(it.x, it.y) }
            if (key.first == 0) points.sortedBy { it[1] } else points.sortedBy { it[0] }
        }

private fun evidenceOf(
    lines: List<List<DoubleArray>>,
    width: Int,
    height: Int,
): LensEvidence {
    val usable = lines.filter { bow(it) != null }
    val cells = mutableSetOf<Int>()
    usable.flatten().forEach { p ->
        val cx = (p[0] / width * COVERAGE_GRID).toInt().coerceIn(0, COVERAGE_GRID - 1)
        val cy = (p[1] / height * COVERAGE_GRID).toInt().coerceIn(0, COVERAGE_GRID - 1)
        cells += cy * COVERAGE_GRID + cx
    }
    return LensEvidence(
        lines = usable.size,
        points = usable.sumOf { it.size },
        axes = orientationsIn(lines, usable),
        coverage = cells.size.toDouble() / (COVERAGE_GRID * COVERAGE_GRID),
    )
}

/**
 * How many of the two line families are actually measurable.
 *
 * Counted from the USABLE lines: a line nobody could measure proves nothing about its orientation,
 * and one family alone cannot separate a lens from a tilt.
 */
private fun orientationsIn(
    all: List<List<DoubleArray>>,
    usable: List<List<DoubleArray>>,
): Int {
    // TODO: this compares SIGNED deltas where the question is about magnitudes, so on a board
    // rotated past 45 degrees in the frame both families answer alike and the fit sees one axis.
    val vertical = usable.count { line -> line.first()[0] - line.last()[0] < line.first()[1] - line.last()[1] }
    return if (vertical > 0 && vertical < usable.size) {
        2
    } else if (all.isEmpty()) {
        0
    } else {
        1
    }
}

/** Median bow over the lines that can be judged, after undistorting with the candidate model. */
private fun totalBow(
    lines: List<List<DoubleArray>>,
    k1: Double,
    k2: Double,
    centre: DoubleArray,
    focal: Double,
): Double? {
    val bows = lines.mapNotNull { line -> bow(undistort(line, k1, k2, centre, focal)) }
    if (bows.isEmpty()) return null
    return bows.sorted()[bows.size / 2]
}

/** The candidate model applied to POINTS — see [undistortPoints], which this shares with the stage. */
private fun undistort(
    points: List<DoubleArray>,
    k1: Double,
    k2: Double,
    centre: DoubleArray,
    focal: Double,
): List<DoubleArray> {
    if (k1 == 0.0 && k2 == 0.0) return points
    return undistortPoints(
        LensModel(
            cameraMatrix = doubleArrayOf(focal, 0.0, centre[0], 0.0, focal, centre[1], 0.0, 0.0, 1.0),
            distCoeffs = doubleArrayOf(k1, k2, 0.0, 0.0, 0.0),
        ),
        points,
    )
}

private const val MIN_BOW_POINTS = 4
private const val MIN_CHORD_PX = 40.0
private const val MIN_LINES_K1 = 6
private const val MIN_LINES_K2 = 10
private const val MIN_LINES_CENTRE = 14
private const val GOOD_COVERAGE = 0.5
private const val COVERAGE_GRID = 3
private const val BUDGET_NONE = 0
private const val BUDGET_K1 = 1
private const val BUDGET_K2 = 2
private const val BUDGET_CENTRE = 3
private const val ACCEPT_RATIO = 0.8
private const val K1_LOW = -1.0
private const val K1_HIGH = 0.4
private const val K1_REFINE = 0.1
private const val K2_LOW = -1.0
private const val K2_HIGH = 1.5
private const val CENTRE_SPAN_FRAC = 0.15
private const val CENTRE_MARGIN = 0.9
private const val SEARCH_STEPS = 24
private const val GOLDEN = 1.6180339887
