package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val SCHOLARS_FEN = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"

private fun movesOf(vararg sans: String) = sans.mapIndexed { index, san -> StoredMove(index + 1, san, "0000", 0L) }

private fun game(
    startFen: String = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    moves: List<StoredMove>,
    result: String = "*",
) = StoredGame("2026-07-24_1822", startFen, 1_700_000_000_000L, 0L, "default", result, moves)

class PgnBuilderTest {
    @Test
    fun pgnMatchesAKnownGame() {
        val pgn =
            buildPgn(
                game(moves = movesOf("e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"), result = "1-0"),
            )
        assertTrue(pgn.contains("[Result \"1-0\"]"), pgn)
        assertEquals("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0", pgn.trim().lines().last())
    }

    @Test
    fun pgnWithoutProvenanceHasNoComments() {
        val withProvenance = movesOf("e4").map { it.copy(provenance = sampleProvenance()) }
        assertEquals(buildPgn(game(moves = movesOf("e4"))), buildPgn(game(moves = withProvenance)))
        assertFalse(buildPgn(game(moves = withProvenance)).contains("{"))
    }

    @Test
    fun provenanceCommentsAppearWhenEnabled() {
        val pgn = buildPgn(game(moves = movesOf("e4").map { it.copy(provenance = sampleProvenance()) }), provenance = true)
        assertTrue(pgn.contains("{cl: diff_after_verify; LL 18.42/3.10 (m 15.32); changed e2,e4"), pgn)
    }

    @Test
    fun pgnFromCustomFenHasSetUpAndFenTags() {
        val pgn = buildPgn(game(startFen = SCHOLARS_FEN, moves = movesOf("Kxf7"), result = "*"))
        assertTrue(pgn.contains("[SetUp \"1\"]"), pgn)
        assertTrue(pgn.contains("[FEN \"$SCHOLARS_FEN\"]"), pgn)
        // Black to move on move 4: the ellipsis form, or every later move number is off by a ply.
        assertEquals("4... Kxf7 *", pgn.trim().lines().last())
    }

    @Test
    fun startPositionHasNoSetUpTags() {
        val pgn = buildPgn(game(moves = movesOf("e4")))
        assertFalse(pgn.contains("SetUp"), pgn)
        assertFalse(pgn.contains("[FEN"), pgn)
    }

    @Test
    fun promotionSanSurvivesUnchanged() {
        val pgn = buildPgn(game(startFen = "8/P6k/8/8/8/8/8/7K w - - 0 60", moves = movesOf("a8=Q+"), result = "1-0"))
        assertTrue(pgn.contains("60. a8=Q+"), pgn)
        assertTrue(pgn.contains("[FEN \"8/P6k/8/8/8/8/8/7K w - - 0 60\"]"), pgn)
    }

    @Test
    fun pgnCommentsAreSanitized() {
        val hostile = sampleProvenance().copy(reason = "why", decider = "weird}decider{\nnewline")
        val pgn = buildPgn(game(moves = movesOf("e4").map { it.copy(provenance = hostile) }), provenance = true)
        val comment = pgn.substringAfter("{").substringBefore("}")
        assertFalse(comment.contains("{"), pgn)
        assertFalse(comment.contains("\n"), pgn)
        assertEquals(1, pgn.count { it == '{' })
    }

    @Test
    fun moveTextWrapsAtEightyColumns() {
        val pgn = buildPgn(game(moves = movesOf(*Array(60) { "Nf3" })))
        val body = pgn.substringAfter("\n\n").trim().lines()
        assertTrue(body.all { it.length <= 80 }, body.joinToString("|"))
        assertTrue(body.size > 1)
    }
}
