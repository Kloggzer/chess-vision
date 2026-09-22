package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Das Tor waehlt die Bilder, gegen die ALLES danach gemessen wird. Ohne die "noch nicht
 *  erreicht"-Sperre nimmt es die ersten n statt der aufgezeichneten: ein anderer Film, lautlos,
 *  weil die ANZAHL stimmt. */
class RecordedFrameGateTest {
    @Test
    fun `ein Bild vor der Zielzeit geht nicht durch`() {
        val gate = RecordedFrameGate(listOf(100.0, 200.0))

        assertFalse(gate.accept(0.0), "0 ms liegt vor dem ersten Ziel (100 ms)")
        assertFalse(gate.accept(99.9))
        assertTrue(gate.accept(100.0), "das erste Bild, das das Ziel erreicht, nimmt es ein")
        assertEquals(1, gate.taken)
    }

    /** Greedy und einmal vorwaerts: ueberholte Ziele verfallen, statt spaeter Bilder zu ziehen. */
    @Test
    fun `ein Bild verfaellt die Ziele, die es ueberholt hat`() {
        val gate = RecordedFrameGate(listOf(100.0, 110.0, 120.0, 500.0))

        assertTrue(gate.accept(300.0), "nimmt Ziel 1 ein und ueberholt 2 und 3")
        assertFalse(gate.accept(400.0), "das naechste offene Ziel ist 500")
        assertTrue(gate.accept(500.0))
        assertEquals(2, gate.taken, "vier Ziele, aber nur zwei Bilder trugen sie")
    }

    @Test
    fun `nach dem letzten Ziel geht nichts mehr durch`() {
        val gate = RecordedFrameGate(listOf(10.0))

        assertTrue(gate.accept(10.0))
        assertFalse(gate.accept(11.0))
        assertEquals(1, gate.taken)
    }
}
