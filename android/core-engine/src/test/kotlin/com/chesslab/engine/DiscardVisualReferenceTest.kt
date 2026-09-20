package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Eine Geometrieaenderung nimmt die Pixel-Referenz — und muss den laufenden Kandidaten mitnehmen.
 *
 * Sonst wird er gegen einen Warp der ALTEN Geometrie verifiziert und committet mit `pend.cur` als
 * neue Referenz; `setRef` paart dieses alte Bild mit den aktuellen `lastCorners`, also kann
 * `cornersJumped` den Bruch nie bemerken.
 */
class DiscardVisualReferenceTest {
    @Test
    fun `a discarded reference takes the pending candidate with it`() {
        val state = pendingAfterDetect()

        state.discardVisualReference()

        assertNull(state.pending)
        assertNull(state.verifyState)
        assertEquals(0, state.confirmer.count)
        val events = VerifySingle.tick(state, PairRecovery(match = true), snapshotOf(state, PairObs()))
        assertTrue(events.isEmpty(), "ein Tick darf nichts mehr committen: $events")
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun `a changed rectification takes the pending candidate with it`() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        state.cnnRun = true
        state.refGray = grayFrame(listOf("e2"))
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertNotNull(state.pending)

        engine.rectificationChanged()

        assertNull(state.pending)
        assertNull(state.verifyState)
        assertEquals(emptyList<String>(), state.history)
    }

    /** Der WEICHERE Vorfall raeumt die Bruecken-Stimme, der haertere nicht: Stimme eins fiel
     *  durch die alte Rektifizierung und committete mit der ersten neuen einen Halbzug. */
    @Test
    fun `a discarded reference drops the open recovery vote`() {
        val state = recoveryState()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        val obs = obsForBoard(state.board)
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 1))
        assertEquals(emptyList<String>(), state.history, "precondition: one vote stands, nothing committed")

        state.discardVisualReference()
        state.cnnTick(cnn, recoverySnap(state, obs, seq = 2))

        assertEquals(emptyList<String>(), state.history, "a vote taken through the old geometry may not count")
    }

    @Test
    fun `a discarded reference takes the promotion prompt with it`() {
        val engine = TrackerEngine(detectConfig(), "8/P6k/8/8/8/8/7K/8 w - - 0 1")
        val state = engine.state
        state.refGray = grayFrame(listOf("a7"))
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("a8")), null, seq = 1)
        assertNotNull(state.promoPending)

        engine.rectificationChanged()

        assertNull(state.promoPending)
        assertEquals(TrackerEvent.Note("no promotion pending"), engine.choosePromotion('q').single())
        assertEquals(emptyList<String>(), state.history)
    }

    private fun pendingAfterDetect(): EngineState {
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.cnnRun = true
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        checkNotNull(state.pending) { "Vorbedingung: ein Kandidat wartet auf die Verifikation" }
        state.confirmer.feed("e2e4")
        return state
    }
}
