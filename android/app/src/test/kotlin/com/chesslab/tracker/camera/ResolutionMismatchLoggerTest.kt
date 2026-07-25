package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ResolutionMismatchLoggerTest {
    private val lines = mutableListOf<String>()
    private val logger = ResolutionMismatchLogger { lines += it }

    @Test
    fun logsOncePerDistinctPair() {
        repeat(100) { logger.report(1280, 720, DeliveredSize(1280, 960, 90)) }
        assertEquals(1, lines.size)
        assertTrue(lines[0].contains("1280x720 requested"), lines[0])
        assertTrue(lines[0].contains("delivers 1280x960"), lines[0])

        repeat(100) { logger.report(1280, 720, DeliveredSize(1600, 1200, 90)) }
        assertEquals(2, lines.size)
    }

    @Test
    fun noLogWhenDeliveredMatchesRequested() {
        repeat(100) { logger.report(1280, 720, DeliveredSize(1280, 720, 90)) }
        assertEquals(emptyList<String>(), lines)
    }
}
