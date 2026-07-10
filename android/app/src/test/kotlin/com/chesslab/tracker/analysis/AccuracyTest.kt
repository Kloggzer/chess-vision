package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/**
 * Tests for [classify]: every threshold boundary of the centipawn-loss grading
 * (<10 best, <50 good, <100 inaccuracy, <250 mistake, else blunder) plus the
 * book-ply override.
 */
class AccuracyTest {
    @Test
    fun `book ply overrides any loss`() {
        assertEquals(MoveQuality.BOOK, classify(0, isBookPly = true))
        assertEquals(MoveQuality.BOOK, classify(500, isBookPly = true))
    }

    @Test
    fun `zero and negative loss are best`() {
        assertEquals(MoveQuality.BEST, classify(0, isBookPly = false))
        assertEquals(MoveQuality.BEST, classify(-30, isBookPly = false))
    }

    @Test
    fun `best to good boundary at 10`() {
        assertEquals(MoveQuality.BEST, classify(9, isBookPly = false))
        assertEquals(MoveQuality.GOOD, classify(10, isBookPly = false))
    }

    @Test
    fun `good to inaccuracy boundary at 50`() {
        assertEquals(MoveQuality.GOOD, classify(49, isBookPly = false))
        assertEquals(MoveQuality.INACCURACY, classify(50, isBookPly = false))
    }

    @Test
    fun `inaccuracy to mistake boundary at 100`() {
        assertEquals(MoveQuality.INACCURACY, classify(99, isBookPly = false))
        assertEquals(MoveQuality.MISTAKE, classify(100, isBookPly = false))
    }

    @Test
    fun `mistake to blunder boundary at 250`() {
        assertEquals(MoveQuality.MISTAKE, classify(249, isBookPly = false))
        assertEquals(MoveQuality.BLUNDER, classify(250, isBookPly = false))
    }

    @Test
    fun `huge loss is blunder`() {
        assertEquals(MoveQuality.BLUNDER, classify(1200, isBookPly = false))
    }
}
