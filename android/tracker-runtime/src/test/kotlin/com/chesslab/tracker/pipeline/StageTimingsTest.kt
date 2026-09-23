package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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

    /** `StageTimings` outlives the stack: the pause between two used to land in the EMA as one huge frame gap. */
    @Test
    fun `the pause between two stacks is not a frame period`() {
        repeat(30) {
            now += 45_000_000L
            timings.begin()
            now += 55_000_000L
            timings.endFrame()
        }
        assertTrue(lines.last().contains("fps=10.0 idle=45.0"), lines.last())
        timings.onFeedStopped()
        now += 60_000_000_000L // a minute with the camera released
        repeat(30) {
            now += 45_000_000L
            timings.begin()
            now += 55_000_000L
            timings.endFrame()
        }
        assertTrue(lines.last().contains("fps=10.0 idle=45.0"), lines.last())
    }

    /** `idle` is the diagnosis: 45 ms waiting for the sensor means no pipeline optimisation can buy a frame. */
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
        assertTrue(lines.last().contains("frame=55.0 fps=10.0 idle=45.0"), lines.last())
    }

    /** A skipped frame runs neither `grayDet` nor the engine; the previous frame's numbers would read as work. */
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
    fun `the snapshot carries every stage key that has run`() {
        timings.begin()
        now += 3_000_000L
        timings.mark(Stage.CONVERT)
        now += 2_000_000L
        timings.mark(Stage.WARP)
        now += 5_000_000L
        timings.mark(Stage.TOTAL)
        val snap = timings.snapshot()
        assertEquals(setOf("convert", "warp", "total"), snap.keys)
        assertEquals(3.0, snap.getValue("convert"))
        assertEquals(2.0, snap.getValue("warp"))
        // TOTAL is measured from begin(), not from the previous mark.
        assertEquals(10.0, snap.getValue("total"))
        assertTrue(lines.isEmpty())
    }

    /**
     * No lens configured (the default) means `Stage.LENS` is never marked, and the panel read
     * `lens 0.0 ms` for a full-frame remap nobody ran — as did gray/grid on an all-skipped feed.
     */
    @Test
    fun `a stage that never ran is absent from the snapshot, not zero`() {
        repeat(3) {
            timings.begin()
            now += 4_000_000L
            timings.mark(Stage.CONVERT)
            now += 1_000_000L
            timings.mark(Stage.TOTAL)
            timings.endFrame("frame too dark (6 < 18.0) — detection paused", luma = 6.4)
        }
        val snap = timings.snapshot()
        assertFalse("lens" in snap, snap.toString())
        assertFalse("gray" in snap, snap.toString())
        assertFalse("grid" in snap, snap.toString())
        assertTrue("convert" in snap, snap.toString())
    }

    /** Verdict fields (2026-08-01): a dash said a frame was skipped, not WHICH of `readFrame`'s three exits took it. */
    @Test
    fun `an emitted frame reports no skip reason and no luma`() {
        timings.begin()
        now += 1_000_000
        timings.endFrame()
        assertTrue(lines.last().endsWith("skip=-"), lines.last())
    }

    @Test
    fun `a skipped frame carries its reason and the luma it was judged on`() {
        timings.begin()
        now += 1_000_000
        timings.endFrame("frame too dark (6 < 18.0) — detection paused", luma = 6.4)
        val line = lines.last()
        assertTrue(line.contains("skip=frame too dark (6 < 18.0)"), line)
        assertTrue(line.endsWith("luma=6.4"), line)
    }

    /** Two decimals: the floor lives between 0 and a few grey levels, one decimal quantises it. */
    @Test
    fun `the noise floor rides beside the luma it trades against`() {
        timings.begin()
        now += 1_000_000
        timings.endFrame(luma = 41.0, noise = 0.37)
        assertTrue(lines.last().endsWith("luma=41.0 noise=0.37"), lines.last())
    }
}
