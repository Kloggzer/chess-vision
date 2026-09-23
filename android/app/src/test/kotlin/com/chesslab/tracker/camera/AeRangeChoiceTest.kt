package com.chesslab.tracker.camera

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// Die UNTERgrenze entscheidet: `[7,15]` erlaubt der AE jede Periode bis 143 ms (gemessen am 24117RK2CG).
class AeRangeChoiceTest {
    @Test
    fun `the locked range at the target wins`() {
        val got = chooseAeRange(listOf(7 to 15, 15 to 15, 15 to 30, 30 to 30), 15)
        assertEquals(15 to 15, got)
    }

    @Test
    fun `a range whose LOWER is below the target is refused`() {
        assertNull(chooseAeRange(listOf(7 to 15, 10 to 24), 15))
    }

    @Test
    fun `without an exact lock the tightest one above it is taken`() {
        assertEquals(15 to 24, chooseAeRange(listOf(7 to 15, 15 to 24, 15 to 30), 15))
    }

    @Test
    fun `a faster floor is better than none`() {
        assertEquals(30 to 30, chooseAeRange(listOf(7 to 15, 30 to 30), 15))
    }

    @Test
    fun `nothing advertised means nothing pinned`() {
        assertNull(chooseAeRange(emptyList(), 15))
    }
}
