package com.chesslab.geometry

import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.imgproc.Imgproc

// Carrying a measured grid correction onto a quad that was derived without one.
//
// Kept apart from `Alignment.kt`, which MEASURES: this file never looks at a pixel. The split is
// the point of the pair — measuring costs ~80 ms at boardSize 1600 and cannot run at the live
// alignment cadence, while applying is four points through a 3x3 and can.

/**
 * The RECTIFIED-space correction a refinement implies, reusable on a later quad.
 *
 * This is what makes the measurement survive live alignment. `boardCornersForFrame` re-derives the
 * quad from the ArUco markers every few frames and knows nothing about grooves, so a refined quad
 * written into the pipeline is overwritten within ~0.2 s and every crop is cut with the geometry
 * the refinement exists to remove. Re-measuring at that cadence is not affordable; re-APPLYING is
 * free — four points through a 3x3.
 *
 * Rectified space, not frame space, is what makes it reusable: the correction says "the grid sits
 * this far off inside the warp", which is a property of the board and the lens, not of where the
 * quad currently is. `specs/30` measured that residual as systematic per setup — two sessions of
 * the same rig agree to 0.1 px — while differing in SIGN between setups, which is exactly the
 * profile of something worth measuring once per calibration and carrying.
 *
 * Returns null when the two quads do not define a usable map.
 */
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

/** [quad] with a [gridCorrection] applied through its OWN homography, or null if it does not map. */
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

/** The frame-space homography taking [from]'s four corners onto [to]'s. */
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
