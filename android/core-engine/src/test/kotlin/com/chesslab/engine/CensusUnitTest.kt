package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.random.Random

/**
 * Hand-written guards for the properties the census channel exists for. These do not need a
 * fixture: they encode invariants (replicate padding, `eps == 0`, the 255/8 scaling) that a
 * refactor must never break.
 */
class CensusUnitTest {
    @Test
    fun popcountTable() {
        assertEquals(0, POPCOUNT8[0])
        assertEquals(8, POPCOUNT8[0xFF])
        assertEquals(1, POPCOUNT8[0x80])
        assertEquals(256, POPCOUNT8.size)
        assertEquals(0, CENSUS_EPS, "eps must stay 0 (entry.md invariant 7)")
    }

    @Test
    fun constantImageHasZeroCodesAndZeroChange() {
        val gray = GrayImage(SIZE, SIZE, ByteArray(SIZE * SIZE) { 137.toByte() })
        val codes = censusTransform(gray, out = ByteArray(SIZE * SIZE))
        assertTrue(codes.all { it.toInt() == 0 }, "a constant image has no strictly-brighter centre")

        val out = DoubleArray(Squares.COUNT)
        perSquareCensusChange(codes, gray, squareBoxes(SIZE, true), out)
        for (i in 0 until Squares.COUNT) {
            assertEquals(0.0, out[i], "change[${Squares.ALL[i]}]")
        }
    }

    @Test
    fun monotoneDarkeningLeavesTheChannelFarBelowCensusThr() {
        val ref = texture()
        val dark =
            GrayImage(
                SIZE,
                SIZE,
                ByteArray(SIZE * SIZE) { i -> ((ref.data[i].toInt() and MASK) * DARKEN).toInt().toByte() },
            )
        val refCodes = censusTransform(ref, out = ByteArray(SIZE * SIZE))
        val out = DoubleArray(Squares.COUNT)
        perSquareCensusChange(refCodes, dark, squareBoxes(SIZE, true), out)
        for (i in 0 until Squares.COUNT) {
            assertTrue(
                out[i] < CENSUS_THR,
                "shadow invariance broken at ${Squares.ALL[i]}: ${out[i]} >= $CENSUS_THR " +
                    "(this is the test any eps > 0 fails)",
            )
        }
    }

    @Test
    fun paddingIsReplicateNotRoll() {
        // A bright top half over a dark bottom half: with wrap/roll padding the first row would be
        // compared against the last row and the whole top rank would light up.
        val data = ByteArray(SIZE * SIZE)
        for (y in 0 until SIZE) {
            val v = if (y < SIZE / 2) BRIGHT else DARK
            for (x in 0 until SIZE) {
                data[y * SIZE + x] = v.toByte()
            }
        }
        val split = GrayImage(SIZE, SIZE, data)
        val codes = censusTransform(split, out = ByteArray(SIZE * SIZE))
        for (x in 0 until SIZE) {
            assertEquals(0, codes[x].toInt() and MASK, "row 0 col $x must see its replicated self")
        }
        // Only the last bright row (the step edge) is hot; the rank-8 squares stay cold.
        val out = DoubleArray(Squares.COUNT)
        perSquareCensusChange(ByteArray(SIZE * SIZE), split, squareBoxes(SIZE, true), out)
        for (file in Squares.FILES) {
            val i = Squares.index("${file}8")
            assertEquals(0.0, out[i], "top-rank square ${file}8 must not be hot")
        }
    }

    @Test
    fun fullyDifferentCodesScaleTo255() {
        val gray = texture()
        val codes = censusTransform(gray, out = ByteArray(SIZE * SIZE))
        val inverted = ByteArray(SIZE * SIZE) { i -> codes[i].toInt().inv().toByte() }
        val out = DoubleArray(Squares.COUNT)
        perSquareCensusChange(inverted, gray, squareBoxes(SIZE, true), out)
        for (i in 0 until Squares.COUNT) {
            assertEquals(MAX_CHANGE, out[i], 1e-9, "max change at ${Squares.ALL[i]}")
        }
    }

    @Test
    fun zeroAreaBoxesAndEmptyBandsAreZero() {
        val gray = texture()
        val codes = censusTransform(gray, out = ByteArray(SIZE * SIZE))
        val out = DoubleArray(Squares.COUNT)

        val boxes = squareBoxes(SIZE, true)
        val degenerate = SquareBoxes(boxes.x0, boxes.y0, boxes.x0, boxes.y0, IntArray(Squares.COUNT))
        perSquareCensusChange(codes, gray, degenerate, out)
        assertTrue(out.all { it == 0.0 }, "zero-area boxes must read 0.0")

        out.fill(Double.NaN)
        perSquareCensusChange(codes, gray, boxes, out, intArrayOf(HALF, HALF))
        assertTrue(out.all { it == 0.0 }, "an empty band must read 0.0")

        out.fill(Double.NaN)
        perSquareCensusChange(codes, gray, boxes, out, intArrayOf(HALF + 4, HALF))
        assertTrue(out.all { it == 0.0 }, "an inverted band must read 0.0")
    }

    @Test
    fun bandTransformReplicatesAtTheBandEdge() {
        val gray = texture()
        val bandRows = HALF
        val band = censusTransform(gray, yLo = HALF, yHi = HALF + bandRows, out = ByteArray(SIZE * bandRows))
        val full = censusTransform(gray, out = ByteArray(SIZE * SIZE))
        // Interior rows are identical to the full transform...
        for (j in 1 until bandRows - 1) {
            for (x in 0 until SIZE) {
                assertEquals(
                    full[(HALF + j) * SIZE + x].toInt() and MASK,
                    band[j * SIZE + x].toInt() and MASK,
                    "band interior row $j col $x",
                )
            }
        }
        // ...and the band's first row is the transform of a plane that STARTS there, i.e. its top
        // neighbours are its own row. That is why the halo guard exists.
        val standalone =
            censusTransform(
                GrayImage(SIZE, bandRows, gray.data.copyOfRange(HALF * SIZE, (HALF + bandRows) * SIZE)),
                out = ByteArray(SIZE * bandRows),
            )
        assertTrue(band.contentEquals(standalone), "the band must equal the transform of the slice")
    }

    private fun texture(): GrayImage {
        val random = Random(SEED)
        return GrayImage(SIZE, SIZE, ByteArray(SIZE * SIZE) { random.nextInt(LO, HI).toByte() })
    }

    private companion object {
        const val SIZE = 320
        const val HALF = 160
        const val MASK = 0xFF
        const val SEED = 20260724
        const val LO = 20
        const val HI = 230
        const val BRIGHT = 220
        const val DARK = 30
        const val DARKEN = 0.6
        const val CENSUS_THR = 40.0
        const val MAX_CHANGE = 255.0
    }
}
