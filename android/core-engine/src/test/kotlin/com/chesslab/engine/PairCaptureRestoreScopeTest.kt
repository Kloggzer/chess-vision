package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** `captureTargetsRestored` las `freshSnapshot()` ohne FEN-Wache — auf einem Pfad, der Paar-Evidenz HINZUFUEGT. */
class PairCaptureRestoreScopeTest {
    @Test
    fun matchingSnapshotRestoresTheCaptureTarget() {
        val state = armed(AFTER_D5)
        state.cnnSnap = snapshotOf(state, occupiedD5(), seq = 7L)

        assertNotNull(state.pairCandidate(coldTarget(), NO_SCORE), "Vorbedingung: der Restore traegt das Paar")
    }

    @Test
    fun staleSnapshotMustNotRestoreCaptureEvidence() {
        val state = armed(AFTER_D5)
        state.cnnSnap = snapshotOf(state, occupiedD5(), seq = 7L).copy(fen = STARTPOS)

        assertNull(
            state.pairCandidate(coldTarget(), NO_SCORE),
            "ein Schnappschuss aus einer anderen Stellung darf keine Paar-Evidenz erfinden",
        )
    }

    private fun armed(fen: String): EngineState {
        val state = EngineState(TrackerConfig(), fen, whitePov = true)
        state.nowS = 1.0
        state.cnnRun = true
        state.keepaliveTainted = ofSquares("d5")
        return state
    }

    private fun occupiedD5() = PairObs(occupancy = mapOf("d5" to true), sure = setOf("d5"))

    private fun coldTarget() = zOf("e4" to HOT, "d8" to HOT)

    private companion object {
        const val AFTER_D5 = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    }
}
