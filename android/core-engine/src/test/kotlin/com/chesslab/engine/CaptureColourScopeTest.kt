package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `capturesConfirmedColour` las `cnnSnap?.obs` roh, ohne Alters- und FEN-Wache — die einzige Stelle, die
 *  einen Zug allein aus einer Modellfarbe viabel macht. */
class CaptureColourScopeTest {
    @Test
    fun freshMatchingSnapshotCarriesTheSilentCapture() {
        val state = armed()
        state.cnnSnap = snapshotOf(state, ColourObs, seq = 3L)

        assertTrue(state.touchedReadable(exd5(state), coldTarget(), soft(state)))
    }

    @Test
    fun snapshotFromAnotherPositionMustNotCarryTheCapture() {
        val state = armed()
        state.cnnSnap = snapshotOf(state, ColourObs, seq = 3L).copy(fen = STARTPOS)

        assertFalse(
            state.touchedReadable(exd5(state), coldTarget(), soft(state)),
            "eine Figurfarbe aus einer fremden Stellung ist keine Evidenz fuer diesen Schlag",
        )
    }

    @Test
    fun snapshotOlderThanTheFreshnessWindowMustNotCarryTheCapture() {
        val state = armed()
        state.cnnSnap = snapshotOf(state, ColourObs, seq = 3L)
        state.nowS = 61.0

        assertFalse(
            state.touchedReadable(exd5(state), coldTarget(), soft(state)),
            "ein 60 s alter Blick ist ueberall sonst im Modul wertlos",
        )
    }

    private fun armed(): EngineState {
        val state = EngineState(TrackerConfig(), AFTER_D5, whitePov = true)
        state.nowS = 1.0
        state.cnnRun = true
        return state
    }

    private fun exd5(state: EngineState) = requireNotNull(state.legalMoveFor("e4d5"))

    private fun soft(state: EngineState) = state.config.zThr * PAIR_SOFT_FACTOR

    private fun coldTarget() = zOf("e4" to HOT)

    private object ColourObs : CnnObservation {
        override fun occupied(square: String) = square == "d5"

        override fun confident(
            square: String,
            thr: Double,
        ) = square == "d5"

        override fun labelConfident(
            square: String,
            thr: Double,
        ) = square == "d5"

        override fun label(square: String) = if (square == "d5") "wP" else null

        override fun conf(square: String) = if (square == "d5") 1.0 else 0.0

        override fun pOccluded(square: String) = 0.0

        override fun occupancyOnly(): CnnObservation = this
    }

    private companion object {
        const val AFTER_D5 = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    }
}
