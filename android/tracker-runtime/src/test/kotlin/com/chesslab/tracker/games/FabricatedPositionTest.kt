package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Der Record haelt nur Stellungen, auf denen die Partie stand. chesslib wendet `e2e5` auch unter
 * `fullValidation` an (gemessen 2026-08-03) — `GameView.replay` haelt das fest, `LiveGame.positionsAfter` nicht.
 */
class FabricatedPositionTest {
    @Test
    fun `an unplayable ply inside a sequence produces no position the game never stood on`() {
        val game = LiveGame(STARTPOS, 0L, "p")

        // Halbzug eins ist echt, Halbzug zwei ist der gemessene Teleport-Fall.
        game.onCommitted(listOf("e2e5", "e7e6"), listOf("??", "e6"), AFTER_SEQUENCE, 0L, null)

        val fens =
            game
                .view()
                .segments
                .flatMap { it.plies }
                .map { it.fenAfter }
        assertEquals(
            listOf(STARTPOS, AFTER_SEQUENCE),
            fens,
            "ein unspielbarer Halbzug haelt das Brett an, statt eine Stellung zu erfinden",
        )
    }

    @Test
    fun `a corrupt start fen does not replay the game from the standard position`() {
        val stored =
            StoredGame(
                id = "g",
                startFen = BROKEN,
                startedAtEpochMs = 0L,
                finishedAtEpochMs = 0L,
                profileName = "p",
                result = "*",
                moves = listOf(StoredMove(ply = 1, san = "e4", uci = "e2e4", tsEpochMs = 0L)),
            )

        val plies =
            stored
                .reviewView()
                .segments
                .single()
                .plies

        assertEquals(
            listOf(BROKEN),
            plies.map { it.fenAfter },
            "aus einem unlesbaren Start darf keine Grundstellungs-Partie werden",
        )
    }

    /** `TrackerEngine.undo` pops `lastCommitSize` plies; the record once checked only one ply back. */
    @Test
    fun `an undo of a pair is seen by the record`() {
        val game = LiveGame(STARTPOS, 0L, "p")
        game.onCommitted(listOf("e2e4", "e7e5"), listOf("e4", "e5"), AFTER_E5, 0L, null)
        assertEquals(2, game.moveCount)

        assertTrue(game.wouldUndo(STARTPOS), "the record must see a two-ply take-back")
        assertTrue(game.onFen(STARTPOS), "and act on it")
        assertEquals(0, game.moveCount, "a taken-back pair must not survive in the record")
    }

    private companion object {
        const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
        const val AFTER_SEQUENCE = "rnbqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3"
        const val BROKEN = "nicht-einmal-ein-fen"
    }
}
