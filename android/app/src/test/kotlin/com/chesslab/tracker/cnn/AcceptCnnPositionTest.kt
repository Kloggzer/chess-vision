package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.tracker.cnn.ObservationFixtures.obsOf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Pure accept-CNN-position core (ports the Python tests around
 * `accept_cnn_position`, de6f84c + 779fb86): the believed position still has the
 * white king on e1 while the physical board (the CNN view) has it on g1 — the
 * illegal-move-alarm scenario of `_alarmed_tracker`.
 */
class AcceptCnnPositionTest {
    // Believed: king e1; black to move so side-preservation is observable.
    private val believedFen = "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQK2R b KQkq - 0 1"

    // Physical: the king "moved" e1 -> g1 (illegal, rook stays on h1).
    private val physicalFen = "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQ2KR b - - 0 1"

    @Test
    fun `preview changes nothing and lists the per-square edits`() {
        val game = Game(believedFen)
        val fenBefore = game.fen()
        val outcome = acceptCnnPosition(game, obsOf(Game(physicalFen)), ObservationFixtures.CONF_LO)
        val accepted = outcome as AcceptOutcome.Accepted
        assertEquals(setOf("e1", "g1"), accepted.changes.map { it.square }.toSet())
        val bySquare = accepted.changes.associateBy { it.square }
        assertEquals("wK", bySquare.getValue("e1").from)
        assertEquals("empty", bySquare.getValue("e1").to)
        assertEquals("empty", bySquare.getValue("g1").from)
        assertEquals("wK", bySquare.getValue("g1").to)
        assertEquals(fenBefore, game.fen(), "preview mutated the board")
    }

    @Test
    fun `adopts the observed board and preserves the side to move`() {
        val game = Game(believedFen)
        val outcome = acceptCnnPosition(game, obsOf(Game(physicalFen)), ObservationFixtures.CONF_LO)
        val adopted = Game((outcome as AcceptOutcome.Accepted).fen)
        assertNull(adopted.pieceCharAt("e1"))
        assertEquals('K', adopted.pieceCharAt("g1"))
        assertEquals('N', adopted.pieceCharAt("f3"), "untouched squares kept")
        assertEquals(false, adopted.whiteToMove, "side to move must be preserved")
        // King off e1 -> white castling rights are gone; black's stay.
        assertTrue(outcome.fen.split(" ")[2] == "kq", "castling must be pruned to ${outcome.fen}")
    }

    @Test
    fun `rejects a position with a missing king`() {
        val game = Game(believedFen)
        val fenBefore = game.fen()
        // e1 confidently read EMPTY, no king seen anywhere else for white.
        val obs = obsOf(Game(believedFen), overrides = mapOf("e1" to false))
        val outcome = acceptCnnPosition(game, obs, ObservationFixtures.CONF_LO)
        val rejected = outcome as AcceptOutcome.Rejected
        assertTrue("king" in rejected.reason.lowercase())
        assertEquals(fenBefore, game.fen(), "rejection must not touch the board")
    }
}
