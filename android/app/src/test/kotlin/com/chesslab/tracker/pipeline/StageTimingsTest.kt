package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class StageTimingsTest {
    private var now = 0L
    private val lines = mutableListOf<String>()
    private val timings = StageTimings(nowNs = { now }, logLine = { lines += it })

    @Test
    fun `it emits at most one log line per second`() {
        repeat(60) {
            now += 16_000_000L // ~60 fps
            timings.begin()
            timings.mark(Stage.TOTAL)
            timings.maybeLog()
        }
        // 60 frames span 0.96 s: the very first line plus nothing else.
        assertEquals(1, lines.size)
        repeat(60) {
            now += 16_000_000L
            timings.maybeLog()
        }
        assertEquals(2, lines.size)
    }

    @Test
    fun `the snapshot carries every stage key`() {
        timings.begin()
        now += 3_000_000L
        timings.mark(Stage.CONVERT)
        now += 2_000_000L
        timings.mark(Stage.WARP)
        now += 5_000_000L
        timings.mark(Stage.TOTAL)
        val snap = timings.snapshot()
        assertEquals(setOf("convert", "warp", "gray", "motion", "grid", "total"), snap.keys)
        assertEquals(3.0, snap.getValue("convert"))
        assertEquals(2.0, snap.getValue("warp"))
        // TOTAL is measured from begin(), not from the previous mark.
        assertEquals(10.0, snap.getValue("total"))
        assertTrue(lines.isEmpty())
    }
}
