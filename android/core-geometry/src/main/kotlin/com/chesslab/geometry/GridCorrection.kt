package com.chesslab.geometry

import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.imgproc.Imgproc

// Applying never looks at a pixel: measuring costs 70-85 ms and cannot run at the live cadence, applying is
// four points through a 3x3 and can.

/** `boardCornersForFrame` re-derives the quad from markers and knows no grooves, overwriting a refined quad
 *  within ~0.2 s. Re-APPLYING in rectified space is free: the residual is systematic per setup (two sessions
 *  of one rig agree to 0.1 px). Null when the quads define no usable map. */
fun gridCorrection(
    raw: List<DoubleArray>,
    refined: List<DoubleArray>,
    geom: BoardGeometry,
): DoubleArray? {
    if (raw.size < CORNER_COUNT || refined.size < CORNER_COUNT) return null
    val a = quadToQuad(raw, refined)
    val h = homographyOf(raw, geom)
    val hInv = invert3(h)
    if (a == null || hInv == null) return null
    // correctQuad applies `inv(H) . inv(hFix) . H`; so `inv(hFix) = H . A . inv(H)`.
    return mul3(mul3(h, a), hInv)
}

fun applyGridCorrection(
    correction: DoubleArray,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): List<DoubleArray>? {
    val h = homographyOf(quad, geom)
    val hInv = invert3(h) ?: return null
    val m = mul3(mul3(hInv, correction), h)
    val moved = quad.map { project3(m, it) }
    return if (moved.any { it == null }) null else moved.filterNotNull()
}

private fun quadToQuad(
    from: List<DoubleArray>,
    to: List<DoubleArray>,
): DoubleArray? {
    val src = MatOfPoint2f().also { m -> m.fromList(from.take(CORNER_COUNT).map { Point(it[0], it[1]) }) }
    val dst = MatOfPoint2f().also { m -> m.fromList(to.take(CORNER_COUNT).map { Point(it[0], it[1]) }) }
    val h = Imgproc.getPerspectiveTransform(src, dst)
    val out = DoubleArray(H_ELEMENTS)
    h.get(0, 0, out)
    src.release()
    dst.release()
    h.release()
    return if (out.all { it.isFinite() }) out else null
}

/** In CELLS, never pixels: 4 px is 4 % of a square at 800 and 2 % at 1600. The mean over corners: one
 *  corner's jitter must not say "moved" alone. 0.0 for malformed input — a spurious large number would
 *  throw away a correction that is probably good. */
fun quadDriftCells(
    a: FloatArray,
    b: FloatArray,
    geom: BoardGeometry,
): Double {
    if (a.size != CORNER_COUNT * 2 || b.size != CORNER_COUNT * 2 || geom.cell <= 0.0) return 0.0
    var sum = 0.0
    for (i in 0 until CORNER_COUNT) {
        val dx = (a[i * 2] - b[i * 2]).toDouble()
        val dy = (a[i * 2 + 1] - b[i * 2 + 1]).toDouble()
        sum += kotlin.math.hypot(dx, dy)
    }
    return sum / CORNER_COUNT / geom.cell
}
