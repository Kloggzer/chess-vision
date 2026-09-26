package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class Refine20260926CodexTest {
    @Test
    fun `a video without a declared container rate keeps the reference motion threshold`() {
        val engineFps = replayEngineFps(sourceFps = 0.0, stride = 1, live = false)
        val config = ReplayOptions().trackerConfig(BoardGeometry(boardSize = 928), live = false, engineFps = engineFps)

        assertTrue(config.motionThr.isFinite(), "a missing container rate must not produce an infinite threshold")
        assertEquals(TrackerConfig().motionThr, config.motionThr)
    }
}
