package com.chesslab.tracker.analysis

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.ReviewSegment
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveList
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream

class OpeningBookTest {
    @Test
    fun theLastNamedPositionIsTheOpeningAndTheDurationUsesThePlayedGame() {
        val game = game("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6")
        val book =
            book(
                named =
                    listOf(
                        game.plies[0].fenAfter to Triple("B00", "King's Pawn Game", 1),
                        game.plies[4].fenAfter to Triple("C60", "Ruy Lopez", 5),
                    ),
            )

        assertEquals(OpeningSummary("C60", "Ruy Lopez", 5, false), book.identify(game))
    }

    @Test
    fun knownAlternativesBecomeBoundedCandidatePositions() {
        val game = game("1. e4 e5 2. Nf3 Nc6 3. Bb5")
        val root = game.plies.last().fenAfter
        val book =
            book(
                named = listOf(root to Triple("C60", "Ruy Lopez", 5)),
                moves = listOf(root to ("a7a6" to 20), root to ("g8f6" to 10)),
            )

        val candidates = book.likelyContinuationFens(game, horizonPlies = 1)
        assertEquals(listOf("a6"), book.identify(game)?.continuation)
        assertEquals(listOf("a7a6"), book.identify(game)?.continuationUci)
        val afterA6 =
            Board()
                .apply {
                    loadFromFen(root)
                    doMove(Move("a7a6", sideToMove))
                }.fen

        assertEquals(2, candidates.size)
        assertTrue(candidates.any { canonicalEnginePosition(it) == canonicalEnginePosition(afterA6) })
        assertFalse(candidates.any { candidate -> game.plies.any { it.fenAfter == candidate } })
    }

    private fun book(
        named: List<Pair<String, Triple<String, String, Int>>>,
        moves: List<Pair<String, Pair<String, Int>>> = emptyList(),
    ): OpeningBook {
        val openings =
            buildString {
                appendLine("position\teco\tname\tcanonicalPlies")
                named.forEach { (fen, entry) ->
                    appendLine("${openingPositionKey(fen)}\t${entry.first}\t${entry.second}\t${entry.third}")
                }
            }
        val continuations =
            buildString {
                appendLine("position\tuci\treferences")
                moves.forEach { (fen, move) -> appendLine("${openingPositionKey(fen)}\t${move.first}\t${move.second}") }
            }
        return OpeningBook.load(openings.bytes(), continuations.bytes())
    }

    private fun String.bytes() = ByteArrayInputStream(toByteArray())

    private fun game(san: String): GameView {
        val moves = MoveList().apply { loadFromSan(san) }
        val sans = moves.toSanArray()
        val board = Board()
        val plies =
            moves.mapIndexed { index, move ->
                board.doMove(move)
                ReviewPly(index + 1, sans[index], move.toString(), board.fen, null)
            }
        return GameView("g", false, STARTPOS, "*", listOf(ReviewSegment(STARTPOS, plies, null)))
    }
}
