package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

/**
 * The ring's SHAPE only; the depth invariant itself (running mean corrupted at depth 1) is asserted in
 * `:core-engine`'s `FrameLoopTest.theBufferRingNeverHandsBackAPlaneTheRunningMeanStillHolds`.
 */
class PlaneRingTest {
    @Test
    fun theDepthCoversTheWidestAveragingWindowTheCnnCanAskFor() {
        // Defaults: 2 with the CNN, 3 without. The pipeline is built long before the CNN attaches,
        // so the ring has to be sized for the larger of the two from the start.
        assertEquals(AVG_FRAMES_NO_CNN + HEADROOM, ringDepth(TrackerConfig()))
        // `avgFramesOverride` is a live knob (0..10), which is why the depth is derived and not 5.
        assertEquals(WIDE_WINDOW + HEADROOM, ringDepth(TrackerConfig(avgFramesOverride = WIDE_WINDOW)))
    }

    @Test
    fun theRingCyclesThroughDepthDistinctBuffers() {
        val ring = PlaneRing(DEPTH)
        val first = List(DEPTH) { ring.next(SIZE) }

        for (i in 0 until DEPTH) {
            for (j in i + 1 until DEPTH) assertNotSame(first[i], first[j], "slots $i and $j are the same array")
        }
        repeat(DEPTH) { assertSame(first[it], ring.next(SIZE), "the ring must come back round to slot $it") }
    }

    /** A relayout at a new `detSize`: the slot is replaced, never handed back at the wrong length. */
    @Test
    fun aPlaneSizeChangeReplacesTheSlot() {
        val ring = PlaneRing(DEPTH)
        val small = ring.next(SIZE)
        repeat(DEPTH - 1) { ring.next(SIZE) }

        val large = ring.next(SIZE * 2)

        assertEquals(SIZE * 2, large.size)
        assertNotSame(small, large)
        assertEquals(SIZE, small.size, "the plane the engine may still hold is untouched")
    }

    /** A depth change drops every slot: the old buffers are still live in the engine. */
    @Test
    fun aResizeNeverRecyclesTheOldSlots() {
        val ring = PlaneRing(DEPTH)
        val old = List(DEPTH) { ring.next(SIZE) }

        ring.resize(DEPTH + 1)

        assertEquals(DEPTH + 1, ring.depth)
        val fresh = List(DEPTH + 1) { ring.next(SIZE) }
        for (buffer in fresh) assertEquals(0, old.count { it === buffer }, "a re-handed old slot would alias the engine")
    }

    private companion object {
        const val AVG_FRAMES_NO_CNN = 3
        const val HEADROOM = 3
        const val WIDE_WINDOW = 10
        const val DEPTH = 6
        const val SIZE = 32
    }
}
