package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ParallelVisualPrepassTest {
    @Test
    fun `cached observation sequences are selected relative to replay start`() {
        val selector = ObservationFrameSelector(skipDecoded = 5, stride = 1, observations = setOf(2L, 4L))

        assertFalse(selector.keep(4))
        assertFalse(selector.keep(5))
        assertTrue(selector.keep(6))
        assertFalse(selector.keep(7))
        assertTrue(selector.keep(8))
    }

    @Test
    fun `cache-free cadence selects every second processed frame`() {
        val selector = ObservationFrameSelector(skipDecoded = 3, stride = 2, observations = null)

        assertFalse(selector.keep(3))
        assertFalse(selector.keep(4))
        assertTrue(selector.keep(5))
        assertFalse(selector.keep(6))
        assertFalse(selector.keep(7))
        assertTrue(selector.keep(9))
    }
}
