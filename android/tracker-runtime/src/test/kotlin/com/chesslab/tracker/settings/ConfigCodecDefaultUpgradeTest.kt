package com.chesslab.tracker.settings

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class ConfigCodecDefaultUpgradeTest {
    @Test
    fun `commitHoldS default 0_067 reaches an upgraded phone after schema bump from 5 to 6`() {
        val oldJson = """{"version":5,"values":{"commitHoldS":NaN}}"""

        val decoded = ConfigCodec.decode(oldJson)

        assertEquals(
            0.067,
            decoded.config.commitHoldS,
            "Upgraded phone with old schema 5 should get new default 0.067, not null",
        )
        assertNotNull(
            decoded.note,
            "Upgrade should return a note explaining the reset",
        )
    }
}
