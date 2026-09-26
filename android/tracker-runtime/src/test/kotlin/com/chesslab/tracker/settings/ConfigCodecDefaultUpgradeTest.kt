package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ConfigCodecDefaultUpgradeTest {
    @Test
    fun `der commitHoldS-Vorgabewert erreicht ein aktualisiertes Telefon nach dem Schemasprung 5 auf 6`() {
        val oldJson = """{"version":5,"values":{"commitHoldS":NaN}}"""

        val decoded = ConfigCodec.decode(oldJson)

        // Gegen die VORGABE: geprueft wird der Sprung, nicht der Wert.
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

    /** Schema 6 trug `taintIdentityThr = 0`, das die Bedienung nie fuhr: nur dieser Knopf faellt, der Rest bleibt. */
    @Test
    fun `schema 6 drops only its unserved taintIdentityThr`() {
        val decoded = ConfigCodec.decode("""{"version":6,"values":{"taintIdentityThr":0.0,"censusThr":41.0}}""")

        assertEquals(TrackerConfig().taintIdentityThr, decoded.config.taintIdentityThr)
        assertEquals(41.0, decoded.config.censusThr)
        assertNull(decoded.note, "kein Zuruecksetzen, also keine Meldung")
    }
}
