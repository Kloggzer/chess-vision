package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CornerDriftMonitorTest {
    private fun corners(
        dx: Float = 0f,
        dy: Float = 0f,
    ) = BoardCorners(
        a8 = Point(100f + dx, 50f + dy),
        h8 = Point(900f, 60f),
        h1 = Point(880f, 900f),
        a1 = Point(120f, 880f),
    )

    private val reference = corners()

    @Test
    fun `undetected when detector returns null`() {
        val monitor = CornerDriftMonitor(reference)
        assertInstanceOf(DriftResult.Undetected::class.java, monitor.evaluate(null))
    }

    @Test
    fun `ok when shift within threshold`() {
        val monitor = CornerDriftMonitor(reference, cornerJumpPx = 6.0)
        assertInstanceOf(DriftResult.Ok::class.java, monitor.evaluate(corners(dx = 3f, dy = 3f)))
    }

    @Test
    fun `drifted when a corner moves past threshold`() {
        val monitor = CornerDriftMonitor(reference, cornerJumpPx = 6.0)
        val shifted = corners(dx = 10f)
        val result = monitor.evaluate(shifted)
        assertInstanceOf(DriftResult.Drifted::class.java, result)
        assertEquals(shifted, (result as DriftResult.Drifted).corners)
    }

    @Test
    fun `max corner shift is the largest single-corner displacement`() {
        val shift = CornerDriftMonitor.maxCornerShift(reference, corners(dx = 3f, dy = 4f))
        assertTrue(shift in 4.999..5.001)
    }

    @Test
    fun `default corner jump threshold is 6px`() {
        assertEquals(6.0, CornerDriftMonitor.DEFAULT_CORNER_JUMP_PX, 1e-9)
    }
}
