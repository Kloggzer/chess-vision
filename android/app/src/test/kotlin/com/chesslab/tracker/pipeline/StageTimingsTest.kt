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

    /**
     * `idle` is the whole diagnosis: 55 ms of work inside a 100 ms frame means the analyzer spent
     * 45 ms waiting for the sensor, and no pipeline optimisation can buy a frame. Idle near zero
     * would be the opposite finding.
     */
    @Test
    fun `the logged rate is the gap between frames, and idle says who is the bottleneck`() {
        // 20 ms of pipeline + 30 ms of engine + 5 ms of publish inside a 100 ms frame: 10 fps.
        repeat(200) {
            now += 45_000_000L
            timings.begin()
            now += 20_000_000L
            timings.mark(Stage.TOTAL)
            now += 30_000_000L
            timings.mark(Stage.ENGINE)
            now += 5_000_000L
            timings.endFrame()
        }
        assertTrue(lines.last().endsWith("frame=55.0 fps=10.0 idle=45.0"), lines.last())
    }

    /**
     * A skipped frame runs neither `grayDet` nor the engine. Printing the previous frame's numbers
     * for them reads as work that happened — the log has to say the stage did not run.
     */
    @Test
    fun `a stage that did not run this frame is not reported as a duration`() {
        timings.begin()
        now += 20_000_000L
        timings.mark(Stage.GRAY)
        timings.endFrame()
        assertTrue(lines.last().contains("gray=20.0"), lines.last())

        now += 1_000_000_000L
        timings.begin()
        now += 4_000_000L
        timings.mark(Stage.TOTAL)
        timings.endFrame()
        assertTrue(lines.last().contains("gray=-"), lines.last())
        // The snapshot still carries the last known value — the debug panel wants stable keys.
        assertEquals(20.0, timings.snapshot().getValue("gray"))
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
        assertEquals(
            setOf("publish", "convert", "warp", "gray", "motion", "grid", "total", "engine", "post", "frame"),
            snap.keys,
        )
        assertEquals(3.0, snap.getValue("convert"))
        assertEquals(2.0, snap.getValue("warp"))
        // TOTAL is measured from begin(), not from the previous mark.
        assertEquals(10.0, snap.getValue("total"))
        assertTrue(lines.isEmpty())
    }
}
