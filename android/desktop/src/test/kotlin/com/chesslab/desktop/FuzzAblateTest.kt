package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/** Ein Zaehler, der immer dasselbe liefert, meldet JEDE Wache als unsichtbar. */
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
