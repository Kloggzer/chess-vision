package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/**
 * `fuzz ablate` faellt ein Urteil ("der Fuzzer sieht diese Wache nicht"). Ohne Gegenprobe waere
 * das eine Behauptung: ein Zaehler, der immer dasselbe liefert, meldet JEDE Wache als unsichtbar.
 */
class FuzzAblateTest {
    @Test
    fun `derselbe Knopfsatz liefert denselben Zustandszaehler`() {
        assertEquals(wacheZustaende(TrackerConfig()), wacheZustaende(TrackerConfig()))
    }

    @Test
    fun `eine Wache abzuschalten bewegt Zustaende`() {
        val aus = TrackerConfig().withOverrides(mapOf("baselineOcclusion" to 0.0))

        assertNotEquals(wacheZustaende(TrackerConfig()), wacheZustaende(aus))
    }
}
