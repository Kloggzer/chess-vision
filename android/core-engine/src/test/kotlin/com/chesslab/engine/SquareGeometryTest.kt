package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class SquareGeometryTest {
    @Test
    fun canonicalOrder() {
        assertEquals(64, Squares.ALL.size)
        assertEquals("a1", Squares.ALL[0])
        assertEquals("h1", Squares.ALL[7])
        assertEquals("a2", Squares.ALL[8])
        assertEquals("h8", Squares.ALL[63])
        assertEquals(28, Squares.index("e4"))
        assertEquals(-1, Squares.index("z9"))
        assertEquals(-1, Squares.index("E4"))
        assertEquals(Squares.ALL.size, Squares.ALL.toSet().size)
    }

    @Test
    fun colRowMatchesPythonMapping() {
        val a8 = Squares.colRow("a8", whitePov = true)
        assertEquals(0, Squares.colOf(a8))
        assertEquals(0, Squares.rowOf(a8))
        val h1 = Squares.colRow("h1", whitePov = true)
        assertEquals(7, Squares.colOf(h1))
        assertEquals(7, Squares.rowOf(h1))
        val a1Black = Squares.colRow("a1", whitePov = false)
        val h8White = Squares.colRow("h8", whitePov = true)
        assertEquals(h8White, a1Black)
        // Python strips and lowercases before validating.
        assertEquals(Squares.colRow("e4", true), Squares.colRow(" E4 ", true))
    }

    @Test
    fun colRowRejectsMalformedSquares() {
        assertThrows<IllegalArgumentException> { Squares.colRow("e", true) }
        assertThrows<IllegalArgumentException> { Squares.colRow("i4", true) }
        assertThrows<IllegalArgumentException> { Squares.colRow("e9", true) }
        assertThrows<IllegalArgumentException> { Squares.colRow("e0", true) }
        assertThrows<IllegalArgumentException> { Squares.colRow("ee", true) }
    }

    @Test
    fun blackPovIsTheRotationOfWhitePov() {
        val boardSize = 800
        assertArrayEquals(
            squareRegion(Squares.index("h8"), boardSize, whitePov = true),
            squareRegion(Squares.index("a1"), boardSize, whitePov = false),
        )
        assertArrayEquals(
            squareCenter("h8", boardSize, whitePov = true),
            squareCenter("a1", boardSize, whitePov = false),
        )
    }

    @Test
    fun extendUpClampsY0ToZeroAndLeavesXAlone() {
        val boardSize = 800
        val plain = squareRegion(Squares.index("e8"), boardSize, whitePov = true)
        val extended = squareRegion(Squares.index("e8"), boardSize, whitePov = true, extendUp = 0.5)
        assertEquals(0, extended[1], "y0 clamps at 0")
        assertEquals(plain[0], extended[0], "x0 unchanged")
        assertEquals(plain[2], extended[2], "x1 unchanged")
        assertEquals(plain[3], extended[3], "y1 unchanged")
        // y0 moves up by exactly extendUp * cell (truncated), never clamped.
        val cell = boardSize / 8.0
        val e4Plain = squareRegion(Squares.index("e4"), boardSize, whitePov = true)
        val e4Ext = squareRegion(Squares.index("e4"), boardSize, whitePov = true, extendUp = 0.25)
        assertEquals((4 * cell + cell * 0.16 - 0.25 * cell).toInt(), e4Ext[1])
        assertTrue(e4Ext[1] < e4Plain[1])
    }

    @Test
    fun extendedBoxesMayOverlapAndAreNotDeOverlapped() {
        val boardSize = 800
        // extendUp must exceed 2 * inset (0.32) before the boxes actually touch.
        val e4 = squareRegion(Squares.index("e4"), boardSize, whitePov = true, extendUp = 0.5)
        val e5 = squareRegion(Squares.index("e5"), boardSize, whitePov = true, extendUp = 0.5)
        assertTrue(e4[1] < e5[3], "extended boxes overlap by design")
    }

    @Test
    fun degenerateBoxHasZeroAreaAndYieldsZeroMean() {
        val boardSize = 320
        val degenerate = squareRegion(Squares.index("d4"), boardSize, whitePov = true, inset = 0.5)
        assertEquals(degenerate[0], degenerate[2], "inset 0.5 collapses the box horizontally")
        assertEquals(degenerate[1], degenerate[3], "inset 0.5 collapses the box vertically")

        val boxes =
            SquareBoxes(
                x0 = IntArray(64) { degenerate[0] },
                y0 = IntArray(64) { degenerate[1] },
                x1 = IntArray(64) { degenerate[2] },
                y1 = IntArray(64) { degenerate[3] },
                area = IntArray(64),
            )
        val plane = ByteArray(boardSize * boardSize) { 200.toByte() }
        val out = planeMeans(plane, boardSize, boxes, DoubleArray(64))
        for (i in 0 until 64) {
            assertEquals(0.0, out[i], "zero-area box $i must be 0.0, never NaN")
        }
    }

    @Test
    fun squareBoxesAreaMatchesTheBoxItself() {
        val boxes = squareBoxes(800, whitePov = true, extendUp = 0.25)
        for (i in 0 until 64) {
            val expected =
                if (boxes.y1[i] > boxes.y0[i] && boxes.x1[i] > boxes.x0[i]) {
                    (boxes.x1[i] - boxes.x0[i]) * (boxes.y1[i] - boxes.y0[i])
                } else {
                    0
                }
            assertEquals(expected, boxes.area[i], "area of ${Squares.ALL[i]}")
        }
    }

    /** UNSIGNED bytes — a signed read halves every mean. */
    @Test
    fun boxSumsAreUnsignedAndMatchTheBruteForceSum() {
        val w = 8
        val a = ByteArray(w * w) { ((it * 37) % 256).toByte() }
        val b = ByteArray(w * w) { ((it * 91 + 13) % 256).toByte() }
        val whole = SquareBoxes(IntArray(64), IntArray(64), IntArray(64) { w }, IntArray(64) { w }, IntArray(64) { w * w })

        var total = 0L
        for (v in a) total += (v.toInt() and 0xFF).toLong()
        assertEquals(total.toDouble() / (w * w), planeMeans(a, w, whole, DoubleArray(64))[0])

        var absTotal = 0L
        for (i in a.indices) {
            absTotal += kotlin.math.abs((a[i].toInt() and 0xFF) - (b[i].toInt() and 0xFF)).toLong()
        }
        assertEquals(absTotal.toDouble() / (w * w), absDiffMeans(a, b, w, whole, DoubleArray(64))[0])
    }

    @Test
    fun bitboardRoundTrip() {
        val squares = setOf("a1", "e4", "h8", "d2")
        val mask = ofSquares(squares)
        assertEquals(squares.size, mask.countOneBits())
        // `squareNames` is ALL order (rank-major); `sortedSquareNames` is Python's `sorted(set)`.
        assertEquals(listOf("a1", "d2", "e4", "h8"), mask.squareNames())
        assertEquals(listOf("a1", "d2", "e4", "h8"), mask.sortedSquareNames())
        assertEquals(listOf("a1", "a8", "h1"), ofSquares("h1", "a8", "a1").sortedSquareNames())
        assertEquals(listOf("a1", "h1", "a8"), ofSquares("h1", "a8", "a1").squareNames())
        assertEquals(0L, ofSquares("zz"), "unknown names are ignored")
        assertTrue(mask.has(Squares.index("e4")) && !mask.has(Squares.index("e5")))
        assertEquals(ofSquares("a1", "e4"), mask.without(ofSquares("h8", "d2")))
    }

    @Test
    fun normalizeDiffsClampsAtZeroAndDoesNotMutateInput() {
        val values = DoubleArray(64) { 4.25 }
        val copy = values.copyOf()
        val out = normalizeDiffs(values, DoubleArray(64))
        assertArrayEquals(copy, values, 0.0, "input must not be mutated")
        for (v in out) assertEquals(0.0, v)
    }

    @Test
    fun normalizeDiffsUsesTheUpperMedian() {
        // 32 zeros, 32 tens: sorted[32] == 10.0 (upper median), NOT the 5.0 midpoint.
        val values = DoubleArray(64) { if (it < 32) 0.0 else 10.0 }
        val out = normalizeDiffs(values, DoubleArray(64))
        for (v in out) assertEquals(0.0, v, "upper median 10.0 flattens everything")

        val values2 = DoubleArray(64) { if (it < 33) 0.0 else 10.0 }
        val out2 = normalizeDiffs(values2, DoubleArray(64))
        assertEquals(0.0, out2[0])
        assertEquals(10.0, out2[63])
    }

    @Test
    fun normalizeDiffsOnEmptyInput() {
        val out = normalizeDiffs(DoubleArray(0), DoubleArray(0))
        assertEquals(0, out.size)
    }
}
