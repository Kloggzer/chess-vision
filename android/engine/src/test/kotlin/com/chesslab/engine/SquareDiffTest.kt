package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python reference (tracker.py) via `uv run python`. */
class SquareDiffTest {
    private val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)

    @Test
    fun `square regions match python square_region`() {
        assertEquals(Box(1, 0, 6, 6), Squares.region("a8", geom))
        assertEquals(Box(33, 31, 38, 38), Squares.region("e4", geom))
        assertEquals(Box(33, 47, 38, 54), Squares.region("e2", geom))
        assertEquals(Box(57, 55, 62, 62), Squares.region("h1", geom))
        assertEquals(Box(33, 33, 38, 38), Squares.region("e4", geom.copy(extendUp = 0.0)))
    }

    @Test
    fun `per square diff matches python golden values`() {
        val d = SquareDiff.perSquareDiff(TestImages.grayA(), TestImages.grayB(), geom)
        assertEquals(0.0, d.getValue("a8"), 1e-6)
        assertEquals(47.4, d.getValue("e4"), 1e-6)
        assertEquals(51.428571, d.getValue("e2"), 1e-6)
        assertEquals(0.0, d.getValue("h1"), 1e-6)
        assertEquals(0.0, d.getValue("d5"), 1e-6)
    }

    @Test
    fun `normalize subtracts the upper median and clamps at zero`() {
        val d = SquareDiff.perSquareDiff(TestImages.grayA(), TestImages.grayB(), geom)
        val nd = SquareDiff.normalizeDiffs(d)
        assertEquals(47.4, nd.getValue("e4"), 1e-6)
        assertEquals(0.0, nd.getValue("a8"), 1e-6)
        // Global offset: median removes it entirely.
        val shifted = d.mapValues { (_, v) -> v + 5.0 }
        val norm = SquareDiff.normalizeDiffs(shifted)
        assertEquals(47.4, norm.getValue("e4"), 1e-6)
        assertEquals(0.0, norm.getValue("h1"), 1e-6)
    }

    @Test
    fun `colRow rotates 180 degrees for black pov`() {
        assertEquals(4 to 4, Squares.colRow("e4", true))
        assertEquals(3 to 3, Squares.colRow("e4", false))
        assertEquals(0 to 0, Squares.colRow("a8", true))
        assertEquals(7 to 7, Squares.colRow("a8", false))
    }
}
