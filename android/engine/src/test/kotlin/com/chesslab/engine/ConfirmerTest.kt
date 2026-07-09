package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ConfirmerTest {
    @Test
    fun `same key over confirm frames confirms`() {
        val c = Confirmer(2)
        assertFalse(c.feed("e2e4"))
        assertEquals(1, c.count)
        assertTrue(c.feed("e2e4"))
        assertEquals(2, c.count)
    }

    @Test
    fun `different key restarts the count`() {
        val c = Confirmer(2)
        assertFalse(c.feed("e2e4"))
        assertFalse(c.feed("d2d4"))
        assertEquals(1, c.count)
        assertTrue(c.feed("d2d4"))
    }

    @Test
    fun `feeding null clears without confirming`() {
        val c = Confirmer(1)
        assertFalse(c.feed(null))
        assertEquals(0, c.count)
        assertTrue(c.feed("e2e4"))
        c.reset()
        assertEquals(0, c.count)
    }
}
