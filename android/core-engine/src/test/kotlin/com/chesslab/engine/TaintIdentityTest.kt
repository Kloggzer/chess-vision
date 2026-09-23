package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Nur abschalten, wo das Modell eine ANDERE Figur liest als das Brett — bei derselben bleibt es ein Verdecker. */
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
        assertEquals(true, filterOn(stateWith(0.0), "c8", "wR"), "bei 0 ist die Frage aus: Verdecker")
        assertEquals(false, filterOn(stateWith(0.5), "c8", "wR"), "bei 0,5 ist es der Zug")
    }

    @Test
    fun `dieselbe Figur bleibt ein Verdecker, auch ueber der Schwelle`() {
        // Hier darf die Schwelle NICHTS aendern — sonst schaltet sie den Verdeckungsschutz ganz ab.
        assertEquals(true, filterOn(stateWith(0.0), "c8", "bB"), "Kontrolle: bei 0 ein Verdecker")
        assertEquals(true, filterOn(stateWith(0.5), "c8", "bB"), "bei 0,5 IMMER NOCH ein Verdecker")
    }
}
