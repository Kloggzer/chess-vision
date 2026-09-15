package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * `adoptableCnnFen` read `cnnSnap` raw while every other reader in the module goes through
 * `freshSnapshot()` — so a glance from minutes ago could overwrite the user's position.
 */
class AdoptedFenFreshnessTest {
    private fun state(): EngineState =
        EngineState(TrackerConfig(), STARTPOS, whitePov = true).also {
            it.nowS = 1.0
            it.cnnRun = true
        }

    @Test
    fun aFreshGlanceIsStillAdopted() {
        val state = state()
        state.cnnSnap = snapshotOf(state, StartposObs, seq = 1L)

        assertNotNull(state.adoptableCnnFen(THR), "the precondition: a fresh look adopts")
    }

    @Test
    fun aStaleGlanceAdoptsNothing() {
        val state = state()
        state.cnnSnap = snapshotOf(state, StartposObs, seq = 1L)
        state.nowS = 61.0

        assertNull(state.adoptableCnnFen(THR), "a 60 s old look must not rewrite the user's position")
    }

    @Test
    fun theRefusalIsWhatTheUserIsTold() {
        val state = state()
        state.cnnSnap = snapshotOf(state, StartposObs, seq = 1L)
        state.nowS = 61.0
        state.adoptableCnnFen(THR)

        assertEquals(NOTE_CNN_STALE, state.note)
    }

    /** Reads the start position, every square label-confident — an adoption that must succeed. */
    private object StartposObs : CnnObservation {
        private val board = Game(STARTPOS)

        override fun occupied(square: String) = board.pieceCharAt(Squares.index(square)) != null

        override fun confident(
            square: String,
            thr: Double,
        ) = true

        override fun labelConfident(
            square: String,
            thr: Double,
        ) = true

        override fun label(square: String): String {
            val piece = board.pieceCharAt(Squares.index(square)) ?: return "empty"
            return (if (piece.isUpperCase()) "w" else "b") + piece.uppercaseChar()
        }

        override fun conf(square: String) = 1.0

        override fun pOccluded(square: String) = 0.0

        override fun occupancyOnly(): CnnObservation = this
    }

    private companion object {
        const val THR = 0.5
    }
}
