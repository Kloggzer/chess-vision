package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.IllegalMoveException
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

private class RefusingEvaluator(
    private val uci: String,
    delegate: CnnEvaluator = VerifyEvaluator(),
) : CnnEvaluator by delegate {
    override fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int> = throw IllegalMoveException(uci, boardFen)
}

/** Refusal AND propagation: "the board did not move" alone would pass for a silent swallow. */
class IllegalMoveRefusalTest {
    @Test
    fun `push refuses a well-formed but impossible move and names both halves of it`() {
        val game = Game()

        val refused = assertThrows<IllegalMoveException> { game.push(Move("e2e5", Side.WHITE)) }

        assertEquals("e2e5", refused.uci)
        assertEquals(STARTPOS, refused.fen)
        assertEquals(STARTPOS, game.fen(), "the board did not move")
        assertTrue(refused.message!!.contains("e2e5") && refused.message!!.contains(STARTPOS), refused.message!!)
    }

    @Test
    fun `push still applies a legal move`() {
        val game = Game()

        game.push(game.legalMoves().single { uciOf(it) == "e2e4" })

        assertEquals('P', game.pieceCharAt("e4"))
        assertNull(game.pieceCharAt("e2"))
    }

    /** Killing the frame loop would only move the crash one layer up: the refusal arrives as the latch. */
    @Test
    fun `a refusal at the cnn seam becomes a latched alarm naming the move and the position`() {
        val engine = engineWithPending()
        engine.attachCnn(RefusingEvaluator("e2e5"))

        val events = engine.onCnnSnapshot(snapOf(engine.state, VerifyObs()))

        val raised = events.filterIsInstance<TrackerEvent.Alarm>().single()
        assertEquals(ALARM_MOVE_REFUSED, raised.kind)
        assertEquals("e2e5", raised.guess)
        assertEquals(listOf("e2", "e5"), raised.conflicts)
        assertNotNull(engine.status().alarm, "the latch is set — commits stop until a human acts")
        assertTrue(engine.status().note!!.contains("e2e5"), engine.status().note!!)
        assertTrue(engine.status().note!!.contains(STARTPOS), engine.status().note!!)
        assertEquals(STARTPOS, engine.fen(), "nothing was committed")
        assertEquals(emptyList<String>(), engine.state.history)
    }

    @Test
    fun `the refusal is written to the decision log, not only to the screen`() {
        val engine = engineWithPending()
        engine.attachCnn(RefusingEvaluator("e2e5"))

        engine.onCnnSnapshot(snapOf(engine.state, VerifyObs()))

        val row = engine.state.decisionLog.last()
        assertEquals("e2e5", row.move)
        assertTrue(row.reason.contains("REFUSED") && row.reason.contains(STARTPOS), row.reason)
    }

    /** The crash was an ADOPTION, not a move: `cnnAdoptedFen` screened its own, `setFen` nothing. */
    @Test
    fun `setFen refuses a position where the side not to move is in check`() {
        val engine = TrackerEngine(testConfig())
        val enPrise = "4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1"

        val events = engine.setFen(enPrise)

        assertEquals(STARTPOS, engine.fen(), "the position was not adopted")
        assertTrue((events.single() as TrackerEvent.Note).text.contains(enPrise))
    }

    @Test
    fun `setFen refuses an unreadable fen instead of throwing out of the app`() {
        val engine = TrackerEngine(testConfig())

        val events = engine.setFen("not a fen at all")

        assertEquals(STARTPOS, engine.fen())
        assertTrue((events.single() as TrackerEvent.Note).text.contains("not a fen at all"))
    }

    /** Only the king-safety half of `reachable` is a legality rule; "has legal moves" is not. */
    @Test
    fun `a finished position is still a position a user may set up`() {
        val mated = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
        val engine = TrackerEngine(testConfig())

        engine.setFen(mated)

        assertEquals(mated, engine.fen())
        assertNull(engine.status().alarm)
    }
}

private fun engineWithPending(): TrackerEngine {
    val engine = TrackerEngine(testConfig().copy(verifyWindow = 8))
    val donor = pendingState()
    engine.state.cnnRun = true
    engine.state.refGray = donor.refGray
    engine.state.refFen = donor.refFen
    engine.state.verifyState = donor.verifyState
    engine.state.pending = donor.pending
    return engine
}
