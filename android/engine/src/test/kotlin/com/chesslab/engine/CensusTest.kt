package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python `census_transform` / `per_square_census_change`. */
class CensusTest {
    @Test
    fun `census codes match python on the 8x8 golden block`() {
        val d = ByteArray(64)
        for (y in 0 until 8) for (x in 0 until 8) d[y * 8 + x] = ((x * 31 + y * 17) % 256).toByte()
        val codes = Census.transform(GrayImage(8, 8, d))
        val expected =
            (
                "0 41 41 41 41 41 41 41 " +
                    "3 43 43 43 43 43 43 47 " +
                    "3 43 43 43 43 43 171 239 " +
                    "3 43 43 43 43 43 187 0 " +
                    "3 43 43 43 43 171 255 38 " +
                    "3 43 43 43 171 251 32 46 " +
                    "3 43 43 43 187 0 42 47 " +
                    "3 43 43 43 191 2 43 47"
            ).split(" ").map { it.toInt() }.toIntArray()
        assertArrayEquals(expected, IntArray(codes.size) { codes[it].px() })
    }

    @Test
    fun `per square census change matches python golden values`() {
        val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)
        val cc = Census.perSquareChange(TestImages.grayA(), TestImages.grayB(), geom)
        assertEquals(20.946429, cc.getValue("e4"), 1e-6)
        assertEquals(0.0, cc.getValue("e2"), 1e-6) // monotone +60 inside the cell: census-invariant
        assertEquals(0.0, cc.getValue("a8"), 1e-6)
        assertEquals(0.0, cc.getValue("d5"), 1e-6)
    }

    @Test
    fun `precomputed ref codes give identical results`() {
        val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = 0.25)
        val ref = TestImages.grayA()
        val codes = Census.transform(ref)
        val a = Census.perSquareChange(ref, TestImages.grayB(), geom)
        val b = Census.perSquareChange(ref, TestImages.grayB(), geom, refCodes = codes)
        assertEquals(a, b)
    }
}
