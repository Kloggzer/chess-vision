package com.chesslab.tracker.hints

import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.games.HintLedger
import com.chesslab.tracker.games.MoveHint
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Nur was ZUGESTELLT wurde, ist vorgesagt. Jede Absage — verfallene Stellung, gesperrtes Gate,
 *  leeres Kontingent — ist auch eine Absage an den Record, sonst traegt die Partie hinterher eine
 *  Herkunft, die es nie gab. */
class HintLedgerBindingTest {
    @Test
    fun aDeliveredTipIsFiledUnderThePositionItWasComputedFrom() =
        runTest {
            val ledger = HintLedger()
            val controller = HintController(ledger)
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            val tip = controller.request({ moment() })
            assertEquals("e7e5", (tip as HintOutcome.Tip).uci)
            assertNull(ledger.markFor(OTHER_FEN, "e7e5"), "unter einer fremden Stellung liegt nichts")
            assertEquals(MoveHint("e5", "e7e5", followed = true), ledger.markFor(FEN, "e7e5"))
        }

    /** `aResultFromAnotherPositionExpires`, eine Ebene tiefer: der verfallene Tipp faellt nirgends an. */
    @Test
    fun anExpiredTipIsFiledNowhere() =
        runTest {
            val ledger = HintLedger()
            val controller = HintController(ledger)
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            val refused = controller.request({ moment(result = result(OTHER_FEN)) })
            assertEquals(HintOutcome.Refused(HintRefusal.EXPIRED), refused)
            assertNull(ledger.markFor(FEN, "e7e5"))
            assertNull(ledger.markFor(OTHER_FEN, "e7e5"))
        }

    /** Der teure Fall: die Stellung wandert, WAEHREND die Mattlinie gerechnet wird. */
    @Test
    fun aTipOvertakenWhileTheLineIsResolvedIsFiledNowhere() =
        runTest {
            val ledger = HintLedger()
            val controller = HintController(ledger)
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            var fen = FEN
            controller.request(
                moment = { moment(fen = fen, result = result(fen, mate = -2)) },
                resolveLine = { _, _ ->
                    fen = OTHER_FEN
                    HintLine(listOf("Qh4"))
                },
            )
            assertNull(ledger.markFor(FEN, "e7e5"))
            assertEquals(0, ledger.log().delivered)
        }

    @Test
    fun aRefusedRequestNeverReachesTheRecord() =
        runTest {
            val ledger = HintLedger()
            val controller = HintController(ledger)
            controller.startGame(HintPlan(HintSide.BLACK, quota = 1))
            controller.request({ moment(blocked = GateBlock.THERMAL) })
            assertNull(ledger.markFor(FEN, "e7e5"))
            controller.request({ moment() })
            controller.request({ moment() })
            assertEquals(1, ledger.log().delivered, "nur der eine zugestellte Tipp zaehlt")
        }

    /** Der Plan steht im Log, damit die Partie ihr Handicap kennt — und nur der der LAUFENDEN. */
    @Test
    fun thePlanOfTheRunningGameIsWhatTheLogCarries() {
        val ledger = HintLedger()
        val controller = HintController(ledger)
        controller.startGame(HintPlan(HintSide.BLACK, quota = 4))
        assertEquals("BLACK", ledger.log().side)
        assertEquals(4, ledger.log().quota)
        // Das Partie-Ende raeumt den Ledger NICHT: `GameSessionController` liest ihn erst danach.
        controller.endGame()
        assertEquals("BLACK", ledger.log().side)
    }
}
