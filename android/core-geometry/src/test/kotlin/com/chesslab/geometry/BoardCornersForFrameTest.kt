package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticMarkers
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf

/** Tier C — port check for `calibration.py board_corners_for_frame`. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class BoardCornersForFrameTest {
    private val geom = BoardGeometry(boardSize = 640)

    @Test
    fun `detect scale one half stays within two pixels of the full resolution result`() {
        val frame = SyntheticMarkers.frame()
        val full = boardCornersForFrame(frame, geom, MarkerTracker(), detectScale = 1.0)
        val half = boardCornersForFrame(frame, geom, MarkerTracker(), detectScale = 0.5)
        assertNotNull(full)
        assertNotNull(half)
        val a = requireNotNull(full)
        val b = requireNotNull(half)
        for (i in a.indices) {
            assertEquals(a[i][0], b[i][0], 2.0, "corner $i x")
            assertEquals(a[i][1], b[i][1], 2.0, "corner $i y")
        }
    }

    @Test
    fun `the resolved corners are the four marker centres`() {
        val corners = requireNotNull(boardCornersForFrame(SyntheticMarkers.frame(), geom, MarkerTracker()))
        for (id in 0..3) {
            val expected = SyntheticMarkers.center(id)
            assertEquals(expected[0], corners[id][0], 1.5, "corner $id x")
            assertEquals(expected[1], corners[id][1], 1.5, "corner $id y")
        }
    }

    @Test
    fun `fewer known corners than minMarkers returns null`() {
        val tracker = MarkerTracker()
        assertNull(boardCornersForFrame(SyntheticMarkers.blank(), geom, tracker, minMarkers = 2))
        // One live marker is still below the default minimum of 2.
        assertNull(boardCornersForFrame(SyntheticMarkers.frame(listOf(0)), geom, tracker))
    }

    @Test
    fun `a single seeded corner is completed as prev plus next minus opp`() {
        val tracker = MarkerTracker()
        // Seed all four, then confirm three of them live so exactly id 3 stays `seed`.
        tracker.seed(
            (0..3).associateWith { id -> SyntheticMarkers.center(id).let { doubleArrayOf(it[0] + 30.0, it[1] + 30.0) } },
        )
        boardCornersForFrame(SyntheticMarkers.frame(listOf(0, 1, 2)), geom, tracker)
        assertEquals(MarkerStatus.SEED, tracker.status(3))
        // Now a frame without any marker: the seeded corner must be reconstructed, not used.
        val corners = requireNotNull(boardCornersForFrame(SyntheticMarkers.blank(), geom, tracker))
        val pts = tracker.points()
        val expectedX = pts.getValue(2)[0] + pts.getValue(0)[0] - pts.getValue(1)[0]
        val expectedY = pts.getValue(2)[1] + pts.getValue(0)[1] - pts.getValue(1)[1]
        assertEquals(expectedX, corners[3][0], 0.05, "a1 = h1 + a8 - h8")
        assertEquals(expectedY, corners[3][1], 0.05)
    }
}
