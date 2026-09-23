package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Die Schwelle darf nur abschalten, wo das Modell eine ANDERE Figur liest als das Brett fuehrt —
 *  bei derselben bleibt das Feld ein Verdecker (`docs/tracker-flow.md`). */
class TaintIdentityTest {
    private fun stateWith(thr: Double): EngineState {
        val state = EngineState(recoveryConfig().copy(taintIdentityThr = thr), STARTPOS, whitePov = true).armed()
        state.nowS = 1000.0
        return state
    }

    private fun filterOn(
        state: EngineState,
        square: String,
        reads: String,
    ): Boolean {
        val obs = obsForBoard(state.board, mapOf(square to reads))
        state.cnnSnap = recoverySnap(state, obs, seq = 1, tsMs = 1_000_000L)
        val bit = 1L shl Squares.ALL.indexOf(square)
        return state.cnnOcclusionFilter(bit) != 0L
    }

    @Test
    fun `eine andere Figur als das Brett fuehrt ist der Zug, kein Verdecker`() {
        // c8 fuehrt das Brett als bB; das Modell liest dort sicher einen weissen Turm.
        assertEquals(true, filterOn(stateWith(0.0), "c8", "wR"), "bei 0 ist die Frage aus: Verdecker")
        assertEquals(false, filterOn(stateWith(0.5), "c8", "wR"), "bei 0,5 ist es der Zug")
    }

    @Test
    fun `dieselbe Figur bleibt ein Verdecker, auch ueber der Schwelle`() {
        // Die Hand liegt ueber c8, das Modell liest trotzdem den bB, den das Brett fuehrt. Hier
        // darf die Schwelle NICHTS aendern — sonst schaltet sie den Verdeckungsschutz ganz ab.
        assertEquals(true, filterOn(stateWith(0.0), "c8", "bB"), "Kontrolle: bei 0 ein Verdecker")
        assertEquals(true, filterOn(stateWith(0.5), "c8", "bB"), "bei 0,5 IMMER NOCH ein Verdecker")
    }
}
