package com.chesslab.tracker.games

import com.chesslab.tracker.hints.HintSide
import com.chesslab.tracker.hints.sideToMove
import com.chesslab.tracker.ui.tracking.whiteToMove
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"

/** The readers disagree on a broken FEN ON PURPOSE; this pins each answer. */
class FenFieldReadersTest {
    @Test
    fun theHintNamesNoSideForAnUnreadableField() {
        assertEquals(HintSide.WHITE, sideToMove("$PLACEMENT w KQkq - 0 1"))
        assertEquals(HintSide.BLACK, sideToMove("$PLACEMENT b"))
        assertNull(sideToMove(PLACEMENT))
        assertNull(sideToMove("$PLACEMENT x - - 0 1"))
    }

    @Test
    fun thePromotionDialogFallsBackToWhite() {
        assertFalse(whiteToMove("$PLACEMENT b KQkq - 0 1"))
        assertTrue(whiteToMove("$PLACEMENT w KQkq - 0 1"))
        assertTrue(whiteToMove(PLACEMENT))
        assertTrue(whiteToMove("$PLACEMENT x"))
    }

    @Test
    fun theScoreSheetStartsAtTheFullmoveFieldOrAtOne() {
        assertEquals(12, startNumber("$PLACEMENT b KQkq - 0 12"))
        assertEquals(1, startNumber("$PLACEMENT b KQkq - 0 x"))
        assertEquals(1, startNumber("$PLACEMENT w"))
    }
}
