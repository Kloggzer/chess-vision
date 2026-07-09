package com.chesslab.tracker.geometry

import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/** Grayscale + blur + Canny at working resolution. */
internal fun edgeMap(
    frame: Mat,
    scale: Double,
): Mat {
    val small = Mat()
    if (scale < 1.0) {
        Imgproc.resize(frame, small, Size(frame.cols() * scale, frame.rows() * scale))
    } else {
        frame.copyTo(small)
    }
    val gray = Mat()
    Imgproc.cvtColor(small, gray, Imgproc.COLOR_BGR2GRAY)
    Imgproc.GaussianBlur(gray, gray, Size(GAUSS_KERNEL, GAUSS_KERNEL), 0.0)
    val edges = Mat()
    Imgproc.Canny(gray, edges, CANNY_LO, CANNY_HI)
    return edges
}

/** Adaptive-threshold Hough sweep; first fraction that yields a consistent quad wins. */
internal fun quadFromHough(edges: Mat): List<V2>? {
    val minDim = min(edges.rows(), edges.cols())
    for (thrFrac in doubleArrayOf(THR_FRAC_0, THR_FRAC_1, THR_FRAC_2)) {
        val raw = Mat()
        Imgproc.HoughLines(edges, raw, HOUGH_RHO, HOUGH_THETA, (minDim * thrFrac).toInt())
        if (raw.rows() < MIN_RAW_LINES) continue
        val count = min(raw.rows(), MAX_LINES)
        val lines = ArrayList<Line>(count)
        for (i in 0 until count) {
            val v = raw.get(i, 0)
            lines.add(Line(v[0], v[1]))
        }
        val quad = quadFromLines(lines)
        if (quad != null) return quad
    }
    return null
}

/** From Hough lines the 4 outer grid corners (working resolution) or null. Ports `_quad_from_lines`. */
internal fun quadFromLines(lines: List<Line>): List<V2>? {
    val (famA, famB) = clusterTwoAngleFamilies(lines)
    if (!validFamilies(famA, famB)) return null
    return cornersFromFamilies(famA, famB)?.let { orderByAngle(it) }
}

/** Families must be large enough and clearly different in direction. */
internal fun validFamilies(
    famA: List<Line>,
    famB: List<Line>,
): Boolean {
    if (famA.size < MIN_FAMILY_LINES || famB.size < MIN_FAMILY_LINES) return false
    val dref = normPi(abs(refAngle(famA) - refAngle(famB)))
    return min(dref, Math.PI - dref) >= Math.toRadians(MIN_ANGLE_DIFF_DEG)
}

/** Outer-line intersections of the two families → 4 unordered corners, or null. */
internal fun cornersFromFamilies(
    famA: List<Line>,
    famB: List<Line>,
): List<V2>? {
    val borderA = familyBorders(famA)
    val borderB = familyBorders(famB)
    return if (borderA == null || borderB == null) null else intersectAll(borderA, borderB)
}

/** All pairwise intersections of two 2-line borders, or null if any pair is parallel. */
internal fun intersectAll(
    borderA: List<Line>,
    borderB: List<Line>,
): List<V2>? {
    val quad = ArrayList<V2>(BoardCorners.CORNER_COUNT)
    for (la in borderA) {
        for (lb in borderB) {
            quad.add(intersect(la, lb) ?: return null)
        }
    }
    return quad
}

/** Intersection of two lines in normal form, or null if parallel. */
internal fun intersect(
    l1: Line,
    l2: Line,
): V2? {
    val det = cos(l1.theta) * sin(l2.theta) - sin(l1.theta) * cos(l2.theta)
    if (abs(det) < DET_EPS) return null
    val x = (l1.rho * sin(l2.theta) - sin(l1.theta) * l2.rho) / det
    val y = (cos(l1.theta) * l2.rho - l1.rho * cos(l2.theta)) / det
    return V2(x, y)
}

/** Order 4 points as a convex quad by angle around their centroid. */
internal fun orderByAngle(quad: List<V2>): List<V2> {
    val cx = quad.sumOf { it.x } / quad.size
    val cy = quad.sumOf { it.y } / quad.size
    return quad.sortedBy { atan2(it.y - cy, it.x - cx) }
}
