package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ConfigCodecDefaultUpgradeTest {
    @Test
    fun `commitHoldS default 0_067 reaches an upgraded phone without schema bump`() {
        val oldPhone = TrackerConfig(commitHoldS = null)
        val encoded = ConfigCodec.encode(oldPhone)

        val decoded = ConfigCodec.decode(encoded)

        assertEquals(
            0.067,
            decoded.config.commitHoldS,
            "Upgraded phone with schema 5 stored commitHoldS=null should get new default 0.067, not null",
        )
    }
}
