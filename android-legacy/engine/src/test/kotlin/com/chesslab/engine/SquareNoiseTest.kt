package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python `SquareNoise` (tracker.py:388). */
class SquareNoiseTest {
    @Test
    fun `ema mean-std and z match python`() {
        val n = SquareNoise()
        val d1 = Squares.all.associateWith { 0.0 }.toMutableMap()
        d1["e4"] = 10.0
        n.update(d1)
        n.update(Squares.all.associateWith { 2.0 }, exclude = setOf("a1"))
        val z = n.z(Squares.all.associateWith { 6.0 })
        assertEquals(0.909472, z.getValue("e4"), 1e-6)
        assertEquals(1.052632, z.getValue("a1"), 1e-6)
        assertEquals(1.06981, z.getValue("b2"), 1e-6)
        assertEquals(0.575, n.mean.getValue("e4"), 1e-6)
        assertEquals(5.965, n.std.getValue("e4"), 1e-6)
    }

    @Test
    fun `std never collapses below the floor`() {
        val n = SquareNoise()
        repeat(500) { n.update(Squares.all.associateWith { 0.0 }) }
        assertEquals(SquareNoise.DEFAULT_STD_FLOOR, n.std.getValue("e4"), 1e-9)
        assertEquals(0.0, n.mean.getValue("e4"), 1e-9)
    }

    @Test
    fun `excluded squares do not learn`() {
        val n = SquareNoise()
        repeat(20) { n.update(Squares.all.associateWith { 50.0 }, exclude = setOf("e4")) }
        assertEquals(0.0, n.mean.getValue("e4"), 1e-9)
        assertEquals(SquareNoise.DEFAULT_INIT_STD, n.std.getValue("e4"), 1e-9)
    }

    @Test
    fun `reset forgets statistics from an old calibration`() {
        val n = SquareNoise()
        repeat(20) { n.update(Squares.all.associateWith { 50.0 }) }
        n.reset()
        assertEquals(0.0, n.mean.getValue("e4"), 1e-9)
        assertEquals(SquareNoise.DEFAULT_INIT_STD, n.std.getValue("e4"), 1e-9)
    }
}
