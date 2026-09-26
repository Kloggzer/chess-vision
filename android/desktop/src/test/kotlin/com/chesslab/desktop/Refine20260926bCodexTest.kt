package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class Refine20260926bCodexTest {
    @Test
    fun `a very low but valid video rate still scales the replay`() {
        val sourceFps = 0.4
        val engineFps = replayEngineFps(sourceFps, stride = 1, live = false)
        val config = ReplayOptions().trackerConfig(BoardGeometry(boardSize = 928), live = false, engineFps = engineFps)

        assertEquals(sourceFps, engineFps)
        assertEquals(TrackerConfig().motionThr * 30.0 / sourceFps, config.motionThr)
    }
}
