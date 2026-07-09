package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TrackerConfigTest {
    @Test
    fun `defaults match Python reference`() {
        val cfg = TrackerConfig()
        assertEquals(0.25, cfg.motionThr, 1e-9)
        assertEquals(160.0, cfg.censusThr, 1e-9)
        assertEquals(1.5, cfg.occlusionColorThr, 1e-9)
        assertEquals(6, cfg.maxChanged)
    }
}
