package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.math.hypot

/**
 * The arithmetic of `_roi_motion`. The OpenCV half (warp / resize / blur) needs natives that
 * `:app`'s unit tests do not have (STATUS D05b-2); what is asserted here is the geometry, the
 * change score and the buffer lifecycle, i.e. everything that can be got wrong silently.
 */
class RoiMotionGeometryTest {
    private val square = floatArrayOf(100f, 100f, 300f, 100f, 300f, 300f, 100f, 300f)

    @Test
    fun `corners expand from the centroid by one plus two margin`() {
        val expanded = expandCorners(square, 0.10)
        val want = doubleArrayOf(80.0, 80.0, 320.0, 80.0, 320.0, 320.0, 80.0, 320.0)
        for (i in want.indices) assertEquals(want[i], expanded[i], 1e-9, "coordinate $i")
    }

    @Test
    fun `expansion is from the centroid, not from the bounding box`() {
        // A trapezoid: an AABB inflate would move the two short-side corners by a different
        // factor than the long-side ones. Centre expansion scales every radius by exactly 1.20.
        val quad = floatArrayOf(0f, 0f, 400f, 40f, 360f, 300f, 40f, 260f)
        val expanded = expandCorners(quad, 0.10)
        val cx = 200.0
        val cy = 150.0
        for (i in 0 until 4) {
            val before = hypot(quad[i * 2] - cx, quad[i * 2 + 1] - cy)
            val after = hypot(expanded[i * 2] - cx, expanded[i * 2 + 1] - cy)
            assertEquals(before * 1.20, after, 1e-9, "corner $i")
        }
    }

    @Test
    fun `the roi is scored at 160x160`() {
        assertEquals(160.0, ROI_SIDE)
    }

    @Test
    fun `the first roi scores zero and the next one scores changed pixels in percent`() {
        val motion = RoiMotion(boardSize = 640, margin = 0.10, pxThr = 20.0)
        val first = ByteArray(100)
        assertEquals(0.0, motion.scoreRoi(first))
        val second = ByteArray(100)
        for (i in 0 until 25) second[i] = 60
        assertEquals(25.0, motion.scoreRoi(second))
        // Strictly greater than the threshold, exactly like NumPy's `d > px_thr`.
        val third = second.copyOf()
        for (i in 25 until 50) third[i] = 20
        assertEquals(0.0, motion.scoreRoi(third))
    }

    @Test
    fun `the previous roi is cleared when the motion margin changes`() {
        val motion = RoiMotion(boardSize = 640, margin = 0.10, pxThr = 20.0)
        val plane = ByteArray(100)
        motion.scoreRoi(plane)
        val moved = ByteArray(100) { 200.toByte() }
        motion.onConfigChanged(TrackerConfig(motionMargin = 0.20))
        // Without the reset this would score 100.0 against a region that no longer exists.
        assertEquals(0.0, motion.scoreRoi(moved))
    }

    @Test
    fun `a changed board size clears the previous roi too`() {
        val motion = RoiMotion(boardSize = 640, margin = 0.10, pxThr = 20.0)
        motion.scoreRoi(ByteArray(100))
        motion.onGeometryChanged(1600)
        assertEquals(0.0, motion.scoreRoi(ByteArray(100) { 200.toByte() }))
    }
}
