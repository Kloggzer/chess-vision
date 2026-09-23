package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private const val MS = 1_000_000L

class CameraRateTest {
    private var now = 0L
    private val rate = CameraRate(nowNs = { now })

    @Test
    fun `one frame is not a rate`() {
        now += 33 * MS
        rate.onFrame()
        assertEquals(0.0, rate.fps, "there is no interval yet — the first frame must not invent one")
    }

    @Test
    fun `a constant delivery rate is a fixed point of the EMA`() {
        repeat(50) {
            now += 33 * MS
            rate.onFrame()
        }
        assertEquals(1000.0 / 33.0, rate.fps, 1e-6)
    }

    @Test
    fun `a stop resets instead of measuring the pause as a frame time`() {
        repeat(50) {
            now += 33 * MS
            rate.onFrame()
        }
        rate.reset()
        assertEquals(0.0, rate.fps)
        now += 60_000 * MS
        rate.onFrame()
        assertEquals(0.0, rate.fps, "the first frame after a resume is still not an interval")
        now += 33 * MS
        rate.onFrame()
        assertEquals(1000.0 / 33.0, rate.fps, 1e-6, "and the one after it is the real rate, not a dragged average")
    }
}
