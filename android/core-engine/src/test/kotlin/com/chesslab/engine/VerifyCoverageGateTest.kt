package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `onCnnSnapshot` nimmt die gemessene `coverage_gate` NUR auf `rawSnap`. Der Verifikations-Pfad und
 * die Umwandlungs-Abfrage bekommen weiter `snap` — also die stellungsbedingte Sicht OHNE die
 * Schwelle, und `confident` gatet dort wieder mit `1.0 - cnnConfThr`.
 */
class VerifyCoverageGateTest {
    private class GateSpy(
        private val inner: CnnObservation,
        private val gated: Boolean,
        private val seen: MutableList<Boolean>,
    ) : CnnObservation by inner {
        override fun withCoverageThr(thr: Double): CnnObservation = GateSpy(inner, true, seen)

        override fun rawObservation(): CnnObservation = this

        override fun confident(
            square: String,
            thr: Double,
        ): Boolean {
            seen += gated
            return inner.confident(square, thr)
        }

        override fun labelConfident(
            square: String,
            thr: Double,
        ): Boolean {
            seen += gated
            return inner.labelConfident(square, thr)
        }
    }

    @Test
    fun theVerifyLadderIsGatedWithTheModelsThreshold() {
        val seen = mutableListOf<Boolean>()
        val engine =
            TrackerEngine(detectConfig().copy(windowEndBothEnds = true)).also {
                it.attachCnn(VerifyEvaluator())
                it.state.refGray = grayFrame(listOf("e2", "e7"))
                it.state.refFen = STARTPOS
                it.state.state = STATE_WAITING
                it.state.grayBuf.append(grayFrame(listOf("e4", "e7")))
            }
        val state = engine.state
        val base = PairObs(Squares.ALL.associateWith { true }, Squares.ALL.toSet())
        state.dispatch(pairMoves(state, listOf("e2e4", "e7e5")), grayFrame(listOf("e4", "e5")), null, false, null, 1L)
        state.nowS += 0.13
        engine.onCnnSnapshot(snapOf(state, GateSpy(base, gated = false, seen = seen), seq = 1L))

        assertTrue(seen.isNotEmpty(), "der Verifikations-Pfad muss `confident` ueberhaupt fragen")
        assertEquals(
            setOf(true),
            seen.toSet(),
            "der Verifikations-Pfad fragte eine Beobachtung OHNE die gemessene Verdeckungsschwelle — " +
                "dieselbe Zelle gilt dort als sichtbar, die die Hintergrund-Tore als verdeckt verwerfen",
        )
    }
}
