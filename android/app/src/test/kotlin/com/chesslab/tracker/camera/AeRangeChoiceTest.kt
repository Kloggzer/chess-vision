package com.chesslab.tracker.camera

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// Die UNTERgrenze entscheidet, nicht die obere: `[7,15]` erfuellt `upper == 15`, laesst der
// Auto-Belichtung aber jede Periode bis 143 ms. Gemessen 2026-09-19 auf dem 24117RK2CG.
class AeRangeChoiceTest {
    @Test
    fun `the locked range at the target wins`() {
        val got = chooseAeRange(listOf(7 to 15, 15 to 15, 15 to 30, 30 to 30), 15)
        assertEquals(15 to 15, got)
    }

    @Test
    fun `a range whose LOWER is below the target is refused`() {
        // Genau der gemessene Fall: `[7,15]` haelt 15 nicht zu, es erlaubt sie nur.
        assertNull(chooseAeRange(listOf(7 to 15, 10 to 24), 15))
    }

    @Test
    fun `without an exact lock the tightest one above it is taken`() {
        assertEquals(15 to 24, chooseAeRange(listOf(7 to 15, 15 to 24, 15 to 30), 15))
    }

    @Test
    fun `a faster floor is better than none`() {
        // `[30,30]` kostet Rechenzeit, haelt aber die Zusage. Ein Brett, das nie ruhig wird,
        // kostet mehr.
        assertEquals(30 to 30, chooseAeRange(listOf(7 to 15, 30 to 30), 15))
    }

    @Test
    fun `nothing advertised means nothing pinned`() {
        assertNull(chooseAeRange(emptyList(), 15))
    }
}
