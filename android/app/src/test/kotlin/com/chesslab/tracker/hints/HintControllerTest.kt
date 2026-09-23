package com.chesslab.tracker.hints

import com.chesslab.tracker.analysis.GateBlock
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Die Nutzerregeln als Wachen: Kontingent pro PARTIE, keine Umkehr der `gateBlock`-Rangordnung, und ein
 *  Tipp verfaellt mit seiner Stellung. */
class HintControllerTest {
    @Test
    fun theQuotaRunsForTheWholeGameAndThenRefuses() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
            repeat(3) { assertTrue(controller.request({ moment() }) is HintOutcome.Tip) }
            assertEquals(0, controller.state.value.remaining)
            assertEquals(HintOutcome.Refused(HintRefusal.SPENT), controller.request({ moment() }))
        }

    @Test
    fun aNewGameRefillsTheQuotaAndNothingElseDoes() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 1))
            controller.request({ moment() })
            assertEquals(HintOutcome.Refused(HintRefusal.SPENT), controller.request({ moment() }))
            controller.startGame(HintPlan(HintSide.BLACK, quota = 1))
            assertTrue(controller.request({ moment() }) is HintOutcome.Tip)
        }

    @Test
    fun aBlockedGateRefusesAndCostsNothing() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            val refused = controller.request({ moment(blocked = GateBlock.THERMAL) })
            assertEquals(HintOutcome.Refused(HintRefusal.GATE), refused)
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun aLatchedAlarmRefusesAndCostsNothing() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            assertEquals(
                HintOutcome.Refused(HintRefusal.UNSETTLED),
                controller.request({ moment(alarmed = true) }),
            )
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun aPositionInsideTheTakeBackWindowIsNotSettled() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            assertEquals(
                HintOutcome.Refused(HintRefusal.UNSETTLED),
                controller.request({ moment(steadyMs = HINT_SETTLE_MS - 1) }),
            )
            assertEquals(2, controller.state.value.remaining)
        }

    /** Ein Rueckzieher in der Bestaetigung: `GameSessionController` entscheidet ihn erst nach einer halben Sekunde. */
    @Test
    fun aRecordThatDisagreesWithTheBoardIsNotSettled() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            assertEquals(
                HintOutcome.Refused(HintRefusal.UNSETTLED),
                controller.request({ moment(recordFen = OTHER_FEN) }),
            )
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun aResultFromAnotherPositionExpires() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            assertEquals(
                HintOutcome.Refused(HintRefusal.EXPIRED),
                controller.request({ moment(result = result(OTHER_FEN)) }),
            )
            assertEquals(2, controller.state.value.remaining)
        }

    /** Der Fall, der echte Partien zerlegt hat: die Stellung wandert, WAEHREND gerechnet wird. */
    @Test
    fun aPositionThatMovesWhileTheLineIsResolvedExpiresForFree() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            var fen = FEN
            val outcome =
                controller.request(
                    moment = { moment(fen = fen, result = result(fen, mate = -2)) },
                    resolveLine = { _, _ ->
                        fen = OTHER_FEN
                        HintLine(listOf("Qh4", "g3", "Qxg3"))
                    },
                )
            assertEquals(HintOutcome.Refused(HintRefusal.EXPIRED), outcome)
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun theSupportedSideOnlyAsksOnItsOwnMove() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.WHITE, quota = 2))
            assertTrue(!controller.offered(FEN))
            assertEquals(
                HintOutcome.Refused(HintRefusal.NOT_YOUR_TURN),
                controller.request({ moment() }),
            )
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun theUnsupportedSideIsOfferedNothing() {
        val controller = HintController()
        controller.startGame(HintPlan(side = null))
        assertTrue(!controller.offered(FEN))
        controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
        assertTrue(controller.offered(FEN))
        assertTrue(!controller.offered(OTHER_FEN))
    }

    @Test
    fun endingTheGameTakesTheButtonAway() {
        val controller = HintController()
        controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
        controller.endGame()
        assertTrue(!controller.offered(FEN))
        assertEquals(0, controller.state.value.remaining)
    }

    @Test
    fun theMateSignIsReadFromTheSupportedSide() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            val mine = controller.request({ moment(result = result(FEN, mate = -3)) }, { _, _ -> HintLine(listOf("Qh4")) })
            assertEquals(3, (mine as HintOutcome.Tip).mateIn)
            val theirs = controller.request({ moment(result = result(FEN, mate = 3)) })
            assertEquals(null, (theirs as HintOutcome.Tip).mateIn)
            assertEquals(BEST_SAN, theirs.san)
        }

    @Test
    fun aFinishedGameIsRefusedForFree() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 2))
            val over = result(FEN).copy(gameOver = true)
            assertEquals(HintOutcome.Refused(HintRefusal.OVER), controller.request({ moment(result = over) }))
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun aSecondPressWhileTheFirstIsRunningIsIgnored() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
            var second: HintOutcome? = null
            controller.request({ moment(result = result(FEN, mate = -2)) }, { _, _ ->
                second = controller.request({ moment() })
                HintLine(listOf("Qh4"))
            })
            assertEquals(HintOutcome.Ignored, second)
            assertEquals(2, controller.state.value.remaining)
        }
}
