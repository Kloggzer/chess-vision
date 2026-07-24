package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.STARTPOS
import com.chesslab.engine.uciOf
import com.chesslab.tracker.cnn.ObservationFixtures.obsOf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CnnRecoveryTest {
    private val recovery = CnnRecovery()

    private fun gameAfter(vararg ucis: String): Game {
        val g = Game()
        for (u in ucis) g.push(g.legalMoves().first { uciOf(it) == u })
        return g
    }

    /** Identity observation of a position (labels from the position itself). */
    private fun identityObs(
        game: Game,
        occluded: Set<String> = emptySet(),
    ): OccupancyObservation = obsOf(game, occluded)

    @Test
    fun `board matching the believed state is BoardUnchanged`() {
        val outcome = recovery.evaluate(STARTPOS, identityObs(Game()))
        assertEquals(RecoveryOutcome.BoardUnchanged, outcome)
    }

    @Test
    fun `recovers a single missed move`() {
        val outcome = recovery.evaluate(STARTPOS, identityObs(gameAfter("e2e4")))
        val moves = outcome as RecoveryOutcome.Moves
        assertEquals(listOf("e2e4"), moves.ucis)
        assertTrue(moves.agreement >= 0.97)
    }

    @Test
    fun `recovers a capture`() {
        val before = gameAfter("e2e4", "d7d5")
        val observed = gameAfter("e2e4", "d7d5", "e4d5")
        val outcome = recovery.evaluate(before.fen(), identityObs(observed))
        assertEquals(listOf("e4d5"), (outcome as RecoveryOutcome.Moves).ucis)
    }

    @Test
    fun `bridges multiple plies while play continued`() {
        // Tracker believes startpos; three half-moves already happened.
        val observed = gameAfter("e2e4", "e7e5", "g1f3")
        val outcome = recovery.evaluate(STARTPOS, identityObs(observed))
        val moves = outcome as RecoveryOutcome.Moves
        // Transpositions to the same placement are one hypothesis; assert the
        // recovered sequence reproduces the observed placement in 3 plies.
        assertEquals(3, moves.ucis.size)
        assertEquals(
            observed.fen().substringBefore(' '),
            gameAfter(*moves.ucis.toTypedArray()).fen().substringBefore(' '),
        )
    }

    @Test
    fun `recovers castling as one hypothesis`() {
        val before = gameAfter("e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5")
        val observed = gameAfter("e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1")
        val outcome = recovery.evaluate(before.fen(), identityObs(observed))
        assertEquals(listOf("e1g1"), (outcome as RecoveryOutcome.Moves).ucis)
    }

    @Test
    fun `too few confident squares is inconclusive`() {
        // Hand over the board: fewer than minConfidentRecovery readable squares.
        val occluded = ALL_SQUARES.drop(4).toSet()
        val outcome = recovery.evaluate(STARTPOS, identityObs(gameAfter("e2e4"), occluded))
        assertEquals(RecoveryOutcome.Inconclusive, outcome)
    }

    @Test
    fun `unexplainable deviation reports conflicts`() {
        // A rook teleported to the middle of the board: no legal sequence explains it.
        val obs =
            obsOf(Game(), overrides = mapOf("d4" to true, "a1" to false))
        val outcome = recovery.evaluate(STARTPOS, obs)
        val conflicts = outcome as RecoveryOutcome.Conflicts
        assertTrue("d4" in conflicts.squares || "a1" in conflicts.squares)
    }

    // -- illegal-move helpers (ports tests/test_cnn_recovery.py guess/occupancy tests) --

    @Test
    fun `guessIllegalMove reconstructs a single source-destination pair`() {
        // King picked up from e1 and put on e4 (illegal): exactly one source (e1
        // observed empty) and one destination (e4 observed holding a piece).
        val obs = obsOf(Game(), overrides = mapOf("e1" to false, "e4" to true), labelOverrides = mapOf("e4" to "wK"))
        assertEquals("e1e4", recovery.guessIllegalMove(Game(), obs))
    }

    @Test
    fun `guessIllegalMove is null for ambiguous patterns`() {
        // Two sources -> no unambiguous reconstruction.
        val obs = obsOf(Game(), overrides = mapOf("e1" to false, "d1" to false, "e4" to true))
        assertEquals(null, recovery.guessIllegalMove(Game(), obs))
    }

    @Test
    fun `guessIllegalMove is null without conflicts`() {
        assertEquals(null, recovery.guessIllegalMove(Game(), obsOf(Game())))
    }

    @Test
    fun `identity-only conflict is not an occupancy conflict`() {
        val game = Game()
        val misread = obsOf(game, labelOverrides = mapOf("b1" to "wB"))
        assertTrue(recovery.hasOccupancyConflict(game, misread, listOf("b1")).not())
        val vacated = obsOf(game, overrides = mapOf("b1" to false))
        assertTrue(recovery.hasOccupancyConflict(game, vacated, listOf("b1")))
    }

    @Test
    fun `occupancy match short-circuits identity mismatch to BoardUnchanged`() {
        val outcome = recovery.evaluate(STARTPOS, obsOf(Game(), labelOverrides = mapOf("b1" to "wB")))
        assertEquals(RecoveryOutcome.BoardUnchanged, outcome)
    }

    @Test
    fun `partial occlusion still recovers (minConfidentRecovery split)`() {
        // Half the board covered, the move endpoints readable.
        val occluded = ALL_SQUARES.filter { it[1] in "5678" }.toSet()
        val outcome = recovery.evaluate(STARTPOS, identityObs(gameAfter("e2e4"), occluded))
        assertEquals(listOf("e2e4"), (outcome as RecoveryOutcome.Moves).ucis)
    }
}
