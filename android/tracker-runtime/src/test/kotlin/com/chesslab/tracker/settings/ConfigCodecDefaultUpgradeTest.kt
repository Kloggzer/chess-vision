package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class ConfigCodecDefaultUpgradeTest {
    @Test
    fun `der commitHoldS-Vorgabewert erreicht ein aktualisiertes Telefon nach dem Schemasprung 5 auf 6`() {
        val oldJson = """{"version":5,"values":{"commitHoldS":NaN}}"""

        val decoded = ConfigCodec.decode(oldJson)

        // Gegen die VORGABE, nicht gegen 0.067: geprueft wird der Sprung, nicht der Wert.
        assertEquals(
            TrackerConfig().commitHoldS,
            decoded.config.commitHoldS,
            "Upgraded phone with old schema 5 should get the current default, not null",
        )
        assertNotNull(
            decoded.note,
            "Upgrade should return a note explaining the reset",
        )
    }
}
