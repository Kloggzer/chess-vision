package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TrackerConfigTest {
    @Test
    fun `defaults match Python reference`() {
        val cfg = TrackerConfig()
        assertEquals(0.25, cfg.motionThr, 1e-9)
        // 40 since the black-castle incident: 160 vetoed real dark-on-dark arrivals as shadows.
        assertEquals(40.0, cfg.censusThr, 1e-9)
        assertEquals(1.0, cfg.censusZWeight, 1e-9)
        assertEquals(24.0, cfg.occlCensusThr, 1e-9)
        // 3.0 since c3c2315: the historic 1.5 was tuned while the gamut veto was dead code.
        assertEquals(3.0, cfg.occlusionColorThr, 1e-9)
        assertEquals(6, cfg.maxChanged)
    }
}
