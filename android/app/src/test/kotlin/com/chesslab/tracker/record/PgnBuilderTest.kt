package com.chesslab.tracker.record

import org.junit.jupiter.api.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Tests for [PgnBuilder]: Scholar's mate PGN, result tags, and formatting.
 */
class PgnBuilderTest {
    @Test
    fun `scholars mate produces known PGN string`() {
        val sans =
            listOf(
                "e4",
                "e5",
                "Qh5",
                "Nc6",
                "Bc4",
                "Nf6",
                "Qxf7#",
            )

        val fen = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"
        val pgn = PgnBuilder.build(sans, fen)

        assertContains(pgn, "[Event \"chesslab\"]")
        assertContains(pgn, "[Result \"1-0\"]")
        assertContains(pgn, "1. e4 e5")
        assertContains(pgn, "2. Qh5 Nc6")
        assertContains(pgn, "3. Bc4 Nf6")
        assertContains(pgn, "4. Qxf7#")
        assertTrue(pgn.endsWith("1-0\n"), "PGN should end with the result: $pgn")
    }

    @Test
    fun `draw produces 1 slash 2 result`() {
        // Stalemate FEN: black king a8, white rook b7 (protected by Ka6).
        // King cannot go a7/b8 (rook), b7 (occupied+cannot capture, protected).
        val fen = "k7/1R6/K7/8/8/8/8/8 b - - 0 1"
        val sans = listOf("Rb7")
        val pgn = PgnBuilder.build(sans, fen)
        assertContains(pgn, "[Result \"1/2-1/2\"]")
    }

    @Test
    fun `checkmate black wins produces 0-1`() {
        val fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3"
        val sans = listOf("e4", "e5", "g4", "Qh4#")
        val pgn = PgnBuilder.build(sans, fen)
        assertContains(pgn, "[Result \"0-1\"]")
    }

    @Test
    fun `empty moves produces just headers and star`() {
        val pgn = PgnBuilder.build(emptyList())
        assertContains(pgn, "[Result \"*\"]")
        assertContains(pgn, "*")
    }

    @Test
    fun `formatMoveText pairs whites and blacks`() {
        val sans = listOf("e4", "e5", "Nf3", "Nc6")
        val text = PgnBuilder.formatMoveText(sans)
        assertEquals("1. e4 e5 2. Nf3 Nc6", text)
    }

    @Test
    fun `formatMoveText handles odd number of moves`() {
        val sans = listOf("e4", "e5", "Nf3")
        val text = PgnBuilder.formatMoveText(sans)
        assertEquals("1. e4 e5 2. Nf3", text)
    }

    @Test
    fun `formatMoveText single move`() {
        val sans = listOf("e4")
        val text = PgnBuilder.formatMoveText(sans)
        assertEquals("1. e4", text)
    }

    @Test
    fun `game in progress produces star result`() {
        // Starting position — game just begun.
        val sans = listOf("e4")
        val pgn = PgnBuilder.build(sans) // Uses default start FEN (no checkmate)
        assertContains(pgn, "[Result \"*\"]")
    }

    @Test
    fun `pgn contains all seven tags`() {
        val pgn = PgnBuilder.build(listOf("e4", "e5"))
        assertContains(pgn, "[Event ")
        assertContains(pgn, "[Site ")
        assertContains(pgn, "[Date ")
        assertContains(pgn, "[Round ")
        assertContains(pgn, "[White ")
        assertContains(pgn, "[Black ")
        assertContains(pgn, "[Result ")
    }
}
