package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

class MarkerTrackerTest {
    private fun pt(
        x: Double,
        y: Double,
    ) = doubleArrayOf(x, y)

    private fun live(
        tracker: MarkerTracker,
        x: Double,
        y: Double,
    ) = tracker.update(mapOf(0 to pt(x, y)))

    @Test
    fun `an unknown marker is adopted outright`() {
        val t = MarkerTracker()
        live(t, 100.0, 200.0)
        assertEquals(listOf(100.0, 200.0), t.points().getValue(0).toList())
        assertEquals(MarkerStatus.LIVE, t.status(0))
        assertEquals(1, t.nLive())
    }

    @Test
    fun `dead zone freezes the position but keeps the corner live`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 102.0, 101.0) // L1 = 3 <= moveThreshold 4
        assertEquals(listOf(100.0, 100.0), t.points().getValue(0).toList())
        assertEquals(MarkerStatus.LIVE, t.status(0))
    }

    @Test
    fun `a move exactly on the threshold still freezes`() {
        val t = MarkerTracker()
        live(t, 100.0, 200.0)
        live(t, 104.0, 200.0)
        assertEquals(100.0, t.points().getValue(0)[0], 1e-9, "4,0 ist die Totzone, nicht ihr Ende")
    }

    /** L1, not Euclidean: (2.5 | 2.5) is 5.0 in L1 but 3.54 Euclidean — swapping freezes real motion. */
    @Test
    fun `the dead zone is measured in L1, not euclidean`() {
        val t = MarkerTracker()
        live(t, 100.0, 200.0)
        live(t, 102.5, 202.5)
        assertTrue(abs(t.points().getValue(0)[0] - 100.0) > 1e-9, "L1 5,0 liegt ausserhalb der Totzone")
    }

    @Test
    fun `real movement is EMA smoothed`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 110.0, 100.0)
        assertEquals(100.0 + 0.35 * 10.0, t.points().getValue(0)[0], 1e-12)
        assertEquals(100.0, t.points().getValue(0)[1], 1e-12)
    }

    @Test
    fun `a seeded corner SNAPS on its first live detection`() {
        val t = MarkerTracker()
        t.seed(mapOf(0 to pt(100.0, 100.0)))
        assertEquals(MarkerStatus.SEED, t.status(0))
        assertEquals(0, t.nLive())
        live(t, 130.0, 100.0)
        // EXACTLY the detection — an EMA'd seed leaves the corner 65 % at the seed.
        assertEquals(listOf(130.0, 100.0), t.points().getValue(0).toList())
        assertEquals(MarkerStatus.LIVE, t.status(0))
    }

    @Test
    fun `a jump is rejected until it repeats within jumpRejectPx`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 200.0, 100.0) // L1 = 100 > 60 -> pending, position held
        assertEquals(listOf(100.0, 100.0), t.points().getValue(0).toList())
        assertEquals(MarkerStatus.HELD, t.status(0), "the rejected frame still ages the corner")
        live(t, 205.0, 100.0) // repeats within 60 -> confirmed, then EMA'd
        assertEquals(100.0 + 0.35 * 105.0, t.points().getValue(0)[0], 1e-12)
    }

    @Test
    fun `a different jump restarts the confirmation counter`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 200.0, 100.0) // pending at 200
        live(t, 400.0, 100.0) // 200 px away from the candidate -> counter restarts at 1
        assertEquals(listOf(100.0, 100.0), t.points().getValue(0).toList())
        live(t, 402.0, 100.0) // now confirmed
        assertTrue(t.points().getValue(0)[0] > 100.0)
    }

    /** A candidate from before an occlusion must not count as the first of the CONSECUTIVE frames. */
    @Test
    fun `a gap without any detection invalidates the pending jump candidate`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 200.0, 100.0) // L1 = 100 > 60 -> held, pending
        repeat(500) { t.update(emptyMap()) }
        assertEquals(MarkerStatus.STALE, t.status(0), "500 frames without a detection is stale")

        live(t, 205.0, 100.0)
        assertEquals(listOf(100.0, 100.0), t.points().getValue(0).toList(), "a stale candidate confirmed the jump")
    }

    @Test
    fun `ageing goes live to held to stale`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        assertEquals(MarkerStatus.LIVE, t.status(0))
        t.update(emptyMap())
        assertEquals(MarkerStatus.HELD, t.status(0))
        assertEquals(1, t.nHeld())
        repeat(88) { t.update(emptyMap()) }
        assertEquals(MarkerStatus.HELD, t.status(0), "89 frames is still held")
        t.update(emptyMap())
        assertEquals(MarkerStatus.STALE, t.status(0), "90 frames = maxHeldFrames -> stale")
    }

    @Test
    fun `seed never overwrites a known corner and reports seed before any detection`() {
        val t = MarkerTracker()
        t.seed(mapOf(0 to pt(10.0, 10.0), 1 to pt(20.0, 20.0)))
        t.seed(mapOf(0 to pt(999.0, 999.0)))
        assertEquals(listOf(10.0, 10.0), t.points().getValue(0).toList())
        assertEquals(mapOf(0 to MarkerStatus.SEED, 1 to MarkerStatus.SEED), t.status())
        assertEquals(0, t.nLive())
        assertEquals(0, t.nHeld())
    }

    @Test
    fun `points returns copies`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        t.points().getValue(0)[0] = -1.0
        assertEquals(100.0, t.points().getValue(0)[0])
    }
}
