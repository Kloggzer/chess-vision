package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/** Tier A — pure math, no OpenCV. Port checks for `calibration.py` and `labeling.py`. */
class CornersTest {
    @Test
    fun `square to col row maps files and ranks white pov`() {
        assertEquals(0 to 0, squareToColRow("a8", whitePov = true))
        assertEquals(7 to 7, squareToColRow("h1", whitePov = true))
        assertEquals(4 to 4, squareToColRow("e4", whitePov = true))
        assertEquals(0 to 7, squareToColRow("a1", whitePov = true))
        assertEquals(7 to 0, squareToColRow("h8", whitePov = true))
    }

    @Test
    fun `black pov mirrors both axes`() {
        assertEquals(7 to 7, squareToColRow("a8", whitePov = false))
        assertEquals(0 to 0, squareToColRow("h1", whitePov = false))
        assertEquals(3 to 3, squareToColRow("e4", whitePov = false))
    }

    @Test
    fun `malformed squares throw`() {
        for (bad in listOf("", "a", "a9", "i4", "44", "e0", "abc")) {
            assertThrows(IllegalArgumentException::class.java, { squareToColRow(bad, true) }, "expected throw for '$bad'")
        }
    }

    @Test
    fun `square strings are normalized like python`() {
        assertEquals(squareToColRow("e4", true), squareToColRow(" E4 ", true))
    }

    @Test
    fun `all squares is rank major from rank one`() {
        val squares = allSquares()
        assertEquals(64, squares.size)
        assertEquals(64, squares.toSet().size)
        assertEquals("a1", squares[0])
        assertEquals("h1", squares[7])
        assertEquals("a2", squares[8])
        assertEquals("h8", squares[63])
    }

    @Test
    fun `flat float array round trips through the corner list`() {
        val flat = floatArrayOf(10f, 20f, 630f, 25f, 640f, 610f, 5f, 600f)
        val corners = cornersFromFlat(flat)
        assertEquals(4, corners.size)
        assertArrayEquals(doubleArrayOf(10.0, 20.0), corners[0], 0.0)
        assertArrayEquals(doubleArrayOf(5.0, 600.0), corners[3], 0.0)
        assertArrayEquals(flat, cornersToFlat(corners), 0f)
    }

    @Test
    fun `flat corner converters reject the wrong length`() {
        assertThrows(IllegalArgumentException::class.java) { cornersFromFlat(FloatArray(6)) }
        assertThrows(IllegalArgumentException::class.java) { cornersToFlat(listOf(doubleArrayOf(0.0, 0.0))) }
    }
}
