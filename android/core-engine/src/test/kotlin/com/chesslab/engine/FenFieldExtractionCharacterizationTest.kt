package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.confirmPromotionFromCnn
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class FenFieldExtractionCharacterizationTest {
    @Test
    fun gameExtractsThePlacementWithOrWithoutCastlingFields() {
        assertEquals(PLACEMENT, Game("$PLACEMENT w KQkq - 0 1").boardFen())
        assertEquals(PLACEMENT, Game("$PLACEMENT w").boardFen())
    }

    @Test
    fun gameRejectsAPlacementWithoutTheSideAndAnInvalidFen() {
        assertThrows(RuntimeException::class.java) { Game(PLACEMENT).boardFen() }
        assertThrows(RuntimeException::class.java) { Game("not a fen").boardFen() }
    }

    @Test
    fun adoptionAcceptsAnOmittedCastlingFieldButRejectsMissingSideAndInvalidFen() {
        assertTrue(reachable("$PLACEMENT w KQkq - 0 1"))
        assertTrue(reachable("$PLACEMENT w"))
        assertFalse(reachable(PLACEMENT))
        assertFalse(reachable("not a fen"))
    }

    @Test
    fun promotionDefaultsMissingOrInvalidSideFieldsToWhite() {
        assertEquals('n', promotionChoice("$PLACEMENT b KQkq - 0 1", "bN"))
        assertEquals('n', promotionChoice("$PLACEMENT b", "bN"))
        assertEquals('n', promotionChoice(PLACEMENT, "wN"))
        assertEquals('n', promotionChoice("not a fen", "wN"))
    }

    private fun promotionChoice(
        fen: String,
        label: String,
    ): Char? {
        val state = EngineState(testConfig())
        state.promoPending = PromoPending("a7", "a8", grayFrame(), null, fen)
        val obs = RecoveryObs(Squares.ALL.associateWith { if (it == "a8") label else LABEL_EMPTY })
        var choice: Char? = null
        for (seq in 1L..2L) {
            confirmPromotionFromCnn(state, recoverySnap(state, obs, seq, fen = fen)) {
                choice = it
                emptyList<TrackerEvent>()
            }
        }
        return choice
    }

    private companion object {
        const val PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
    }
}
