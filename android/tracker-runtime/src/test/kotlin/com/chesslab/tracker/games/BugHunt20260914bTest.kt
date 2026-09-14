package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

/**
 * `TrackerEngine.undo` pops `lastCommitSize` plies — a fast-play pair and a CNN recovery bridge are
 * taken back as ONE unit. The record only ever checks the position one ply back, so the position
 * the engine actually publishes after such an undo is not recognised as a take-back at all.
 */
class BugHunt20260914bTest {
    @Test
    fun `an undo of a pair is seen by the record`() {
        val game = LiveGame(STARTPOS, 0L, "p")
        game.onCommitted(
            ucis = listOf("e2e4", "e7e5"),
            sans = listOf("e4", "e5"),
            fenAfter = AFTER_E5,
            tsEpochMs = 0L,
            decision = null,
        )
        assertEquals(2, game.moveCount)
        // What `TrackerEngine.undo` leaves on the board: BOTH plies popped, back to the start.
        assertTrue(game.wouldUndo(STARTPOS), "the record must see a two-ply take-back")
        assertTrue(game.onFen(STARTPOS), "and act on it")
        assertEquals(0, game.moveCount, "a taken-back pair must not survive in the record")
    }
}
