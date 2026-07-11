package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ArucoCornerSmootherTest {
    private fun corners(offset: Float = 0f) =
        BoardCorners(
            Point(100f + offset, 100f),
            Point(900f + offset, 100f),
            Point(900f + offset, 900f),
            Point(100f + offset, 900f),
        )

    @Test
    fun `marker jitter inside dead zone does not move warp`() {
        val smoother = ArucoCornerSmoother().apply { reset(corners()) }
        assertEquals(corners(), smoother.update(corners(offset = 2f)))
    }

    @Test
    fun `real movement is smoothed`() {
        val smoother = ArucoCornerSmoother().apply { reset(corners()) }
        assertEquals(corners(offset = 3.5f), smoother.update(corners(offset = 10f)))
    }

    @Test
    fun `single large jump is rejected but a repeated jump self-corrects`() {
        val smoother = ArucoCornerSmoother().apply { reset(corners()) }
        assertEquals(corners(), smoother.update(corners(offset = 100f)))
        assertEquals(corners(offset = 35f), smoother.update(corners(offset = 100f)))
    }
}
