package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private const val OTHER_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/**
 * Die Bindung ist die STELLUNG, nicht die Uhr, und ein nicht befolgter Tipp ist kein vorgesagter
 * Zug. Beides sind Wachen: faellt eine, faellt die Partie hinterher auf eine Behauptung zurueck.
 */
class HintLedgerTest {
    @Test
    fun aTipBindsToThePositionItWasComputedFrom() {
        val ledger = HintLedger()
        ledger.startGame("WHITE", quota = 3)
        ledger.delivered(FEN, "e4", "e2e4")
        assertNull(ledger.markFor(OTHER_FEN, "e2e4"), "eine andere Stellung traegt den Tipp nicht")
        assertEquals(MoveHint("e4", "e2e4", followed = true), ledger.markFor(FEN, "e2e4"))
    }

    /** Genannt ist nicht gespielt: der Vermerk bleibt, die Behauptung "vorgesagt" faellt weg. */
    @Test
    fun aTipThePlayerDidNotFollowIsNotAToldMove() {
        val ledger = HintLedger()
        ledger.startGame("WHITE", quota = 3)
        ledger.delivered(FEN, "e4", "e2e4")
        val mark = ledger.markFor(FEN, "d2d4")
        assertEquals(MoveHint("e4", "e2e4", followed = false), mark)
        assertFalse(hintStatus(recorded = true, hint = mark) == HintStatus.FOLLOWED)
        assertEquals(HintStatus.GIVEN, hintStatus(recorded = true, hint = mark))
    }

    /** Ein Tipp ist mit dem Zug aus seiner Stellung verbraucht — sonst erbt ihn eine Wiederholung. */
    @Test
    fun theSameTipCannotMarkTwoPlies() {
        val ledger = HintLedger()
        ledger.startGame("BLACK", quota = 3)
        ledger.delivered(FEN, "e4", "e2e4")
        assertTrue(ledger.markFor(FEN, "e2e4")?.followed == true)
        assertNull(ledger.markFor(FEN, "e2e4"))
    }

    @Test
    fun aNewGameKeepsNothingFromTheOldOne() {
        val ledger = HintLedger()
        ledger.startGame("BLACK", quota = 2)
        ledger.delivered(FEN, "e4", "e2e4")
        ledger.startGame("WHITE", quota = 5)
        assertNull(ledger.markFor(FEN, "e2e4"))
        assertEquals(HintRecord("WHITE", quota = 5, delivered = 0), ledger.log())
    }

    /** Der Log zaehlt ZUGESTELLTE Tipps, auch die nicht befolgten — er zaehlt keine Absagen. */
    @Test
    fun theLogCountsWhatWasDeliveredAndUnderWhichHandicap() {
        val ledger = HintLedger()
        ledger.startGame("BLACK", quota = 3)
        ledger.delivered(FEN, "e4", "e2e4")
        ledger.delivered(OTHER_FEN, "e5", "e7e5")
        assertEquals(HintRecord("BLACK", quota = 3, delivered = 2), ledger.log())
    }
}
