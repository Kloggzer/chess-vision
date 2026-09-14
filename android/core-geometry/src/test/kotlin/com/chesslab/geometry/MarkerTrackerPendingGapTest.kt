package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * `MarkerTracker`'s KDoc promises a jump is confirmed over `jumpConfirmFrames` **consecutive**
 * frames. `pending` is only cleared by `accept`, never by a frame in which the marker is missing,
 * so a candidate from before an occlusion still counts as the first of the two.
 */
class MarkerTrackerPendingGapTest {
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
    fun `a gap without any detection invalidates the pending jump candidate`() {
        val t = MarkerTracker()
        live(t, 100.0, 100.0)
        live(t, 200.0, 100.0) // L1 = 100 > 60 -> held, pending = ((200,100), 1)
        assertEquals(listOf(100.0, 100.0), t.points().getValue(0).toList())

        // A hand covers the marker for three seconds. The corner ages past maxHeldFrames.
        repeat(500) { t.update(emptyMap()) }
        assertEquals(MarkerStatus.STALE, t.status(0), "500 frames without a detection is stale")

        // The FIRST sighting after the gap. It is a single frame, so it cannot be a confirmation.
        live(t, 205.0, 100.0)

        assertEquals(
            listOf(100.0, 100.0),
            t.points().getValue(0).toList(),
            "a 500-frame-old candidate confirmed a jump on its FIRST sighting after the gap: the corner " +
                "moved to ${t.points().getValue(0).toList()} instead of being held for one more frame. " +
                "`pending` survives every frame in which the marker is not detected, so " +
                "`jumpConfirmFrames` consecutive frames is not what MarkerTracker enforces.",
        )
    }
}
