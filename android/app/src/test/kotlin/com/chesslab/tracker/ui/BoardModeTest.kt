package com.chesslab.tracker.ui

import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.service.OverlayView
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The two-level board switch is resolved by the pure [resolveBoardRender] / [VIDEO_SUBVIEWS]
 * so the mapping is unit-testable without a Compose harness (`:app` has no `ui-test-junit4`).
 */
class BoardModeTest {
    @Test
    fun `video sub-views map to overlay views in picker order`() {
        assertEquals(OverlayView.CAMERA, VIDEO_SUBVIEWS[0], "Raw")
        assertEquals(OverlayView.BOARD, VIDEO_SUBVIEWS[1], "Warped")
        assertEquals(OverlayView.DIFF, VIDEO_SUBVIEWS[2], "Diff")
        assertEquals(OverlayView.SHADOW, VIDEO_SUBVIEWS[3], "Shadow")
        assertEquals(OverlayView.OCCLUSION, VIDEO_SUBVIEWS[4], "Occlusion")
        assertEquals(OverlayView.MOTION, VIDEO_SUBVIEWS[5], "Motion")
    }

    @Test
    fun `rendered mode draws the synthetic board even when a warped board exists`() {
        val render = resolveBoardRender(BoardMode.RENDERED, OverlayView.BOARD, hasBoard = true, state = TrackerState.TRACKING)
        assertTrue(render.rendered)
    }

    @Test
    fun `video mode draws the selected sub-view`() {
        val render = resolveBoardRender(BoardMode.VIDEO, OverlayView.DIFF, hasBoard = true, state = TrackerState.TRACKING)
        assertFalse(render.rendered)
        assertEquals(OverlayView.DIFF, render.view)
    }

    @Test
    fun `waiting with no board falls back to the camera regardless of mode`() {
        val rendered =
            resolveBoardRender(BoardMode.RENDERED, OverlayView.BOARD, hasBoard = false, state = TrackerState.WAITING_BOARD)
        assertFalse(rendered.rendered)
        assertEquals(OverlayView.CAMERA, rendered.view)

        val video =
            resolveBoardRender(BoardMode.VIDEO, OverlayView.DIFF, hasBoard = false, state = TrackerState.WAITING_BOARD)
        assertFalse(video.rendered)
        assertEquals(OverlayView.CAMERA, video.view)
    }

    @Test
    fun `rendered is honored when the board is still null but the tracker is not waiting`() {
        val render = resolveBoardRender(BoardMode.RENDERED, OverlayView.BOARD, hasBoard = false, state = TrackerState.TRACKING)
        assertTrue(render.rendered)
    }
}
