package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class ReplayTraceOptionsTest {
    @Test
    fun diagnosticsAreExplicitAndBounded() {
        val options = ReplayOptions.parse(listOf("limit=1200", "trace=trace.jsonl"))
        assertEquals(1200, options.limitFrames)
        assertEquals("trace.jsonl", options.trace)
        assertNull(ReplayOptions.parse(emptyList()).limitFrames)
        assertNull(ReplayOptions.parse(emptyList()).trace)
        assertThrows(IllegalArgumentException::class.java) { ReplayOptions.parse(listOf("limit=0")) }
        assertThrows(IllegalArgumentException::class.java) { ReplayOptions.parse(listOf("trace=")) }
    }
}

/** Eines, nicht alle: 64 Felder mal 725 Frames waeren 139 200 Zahlen fuer eine Frage. */
class ProbeSquareOptionTest {
    @Test
    fun aProbedSquareIsParsedAndNormalised() {
        assertEquals("c8", ReplayOptions.parse(listOf("probe=C8")).probeSquare)
        assertNull(ReplayOptions.parse(emptyList()).probeSquare)
    }

    @Test
    fun nonsenseIsRefusedRatherThanSilentlyIgnored() {
        // Eine leere Spalte saehe aus wie ein Messergebnis.
        assertThrows(IllegalArgumentException::class.java) { ReplayOptions.parse(listOf("probe=z9")) }
        assertThrows(IllegalArgumentException::class.java) { ReplayOptions.parse(listOf("probe=")) }
    }
}
