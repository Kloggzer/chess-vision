package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Mirrors `tests/test_move_tracker.py::TestPairScores`. */
class PairCandidateTest {
    @Test
    fun pairExplainsTwoMoves() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)

        val pair = state.pairCandidate(z, moves.best)

        assertNotNull(pair)
        assertEquals(listOf("e2e4", "e7e5"), pair!!.moves.map { uciOf(it) })
        assertTrue(pair.vote, "a diff pair still votes through the confirmer")
        assertEquals(false, pair.priorUsed)
    }

    /** Drei Schlaege auf DASSELBE Feld: als Paar gewann `f3e5 c6d4`, das alle vier Felder erklaert und einen
     *  Springer auf d4 erfindet. */
    @Test
    fun threeCapturesOntoOneSquareAreASequence() {
        val state = hypothesisState("r1bqkbnr/ppp2ppp/2n5/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
        val z = zOf("f3" to HOT, "c6" to HOT, "d4" to HOT, "e5" to HOT)

        val found =
            loglikSequenceScores(state.board, z, state.config.zThr, LL_K, maxPlies = 3)
                .map { (seq, _) -> seq.map { uciOf(it) } }

        assertTrue(listOf("f3e5", "c6e5", "d4e5") in found, "der Dreifachschlag muss gebildet werden")
    }

    /** `f3e5 c6d4` beruehrt DIESELBEN vier Felder: der Diff trennt sie nicht, erst `VerifyPair.pairColourConflicts`. */
    @Test
    fun theWrongPairScoresTheSameAsTheRightTriple() {
        val state = hypothesisState("r1bqkbnr/ppp2ppp/2n5/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
        val z = zOf("f3" to HOT, "c6" to HOT, "d4" to HOT, "e5" to HOT)
        val scored = loglikSequenceScores(state.board, z, state.config.zThr, LL_K, maxPlies = 3)

        fun scoreOf(vararg ucis: String) = scored.first { (s, _) -> s.map { uciOf(it) } == ucis.toList() }.second

        assertEquals(scoreOf("f3e5", "c6e5", "d4e5"), scoreOf("f3e5", "c6d4"), 1e-9)
    }

    /** Ohne gemeinsames Zielfeld bleibt es bei zwei — sonst erfindet die dritte Ebene Zuege. */
    @Test
    fun aThirdPlyNeedsTheSameTargetSquare() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT, "g1" to HOT, "f3" to HOT)

        val candidate = state.pairCandidate(z, NO_SCORE)

        assertTrue(candidate == null || candidate.moves.size <= 2, "drei Ziele, drei Felder: kein Tripel")
    }

    @Test
    fun pairRequiresEndpointEvidence() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT)

        assertNull(state.pairCandidate(z, NO_SCORE))
    }

    /** On the PRE-push board `f7e6` after `e5e6` would classify as en passant and drag the cold `e7` in, killing a
     *  real pair; on the INTERMEDIATE board it is an ordinary capture. */
    @Test
    fun secondHalfEvaluatedOnIntermediateBoard() {
        val state = hypothesisState("4k3/5p2/8/4P3/8/8/8/4K3 w - - 0 1")
        val z = zOf("e5" to HOT, "e6" to HOT, "f7" to HOT)
        val moves = state.scoreViableMoves(z)
        assertEquals(0.0, z[Squares.index("e7")], "e7 must stay cold for this test to mean anything")

        val pair = state.pairCandidate(z, moves.best)

        assertNotNull(pair)
        assertEquals(listOf("e5e6", "f7e6"), pair!!.moves.map { uciOf(it) })
    }

    @Test
    fun pairMarginBeatsBestSingleAndSecondPair() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        assertNotNull(state.pairCandidate(z, NO_SCORE))
        val best = state.bestScore

        assertNull(
            state.pairCandidate(z, best - state.config.ambiguityMarginLl + STEP),
            "a single 0.01 LL inside the margin must block the pair",
        )
        assertNotNull(
            state.pairCandidate(z, best - state.config.ambiguityMarginLl),
            "exactly at the margin the pair is accepted",
        )
    }

    @Test
    fun pairWritesBackBestAndSecondScore() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)
        val singleBest = state.bestScore

        val pair = state.pairCandidate(z, moves.best)

        assertNotNull(pair)
        assertTrue(state.bestScore > singleBest, "bestScore must be the pair's, not the single's")
        assertEquals(singleBest, state.secondScore, 1e-9, "secondScore = max(secondPair, bestSingle)")
    }

    @Test
    fun shadowVetoedDestinationBlocksThePairButAShadowedOriginDoesNot() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)

        state.shadowVetoed = ofSquares("e5")
        assertNull(state.pairCandidate(z, moves.best), "e5 is the second half's destination")
        state.shadowVetoed = ofSquares("e7")
        assertNotNull(
            state.pairCandidate(z, moves.best),
            "e7 is the second half's ORIGIN — vacate evidence, never a block",
        )
    }

    @Test
    fun negativePairIsRejected() {
        val state = hypothesisState()
        val weak = state.config.zThr * PAIR_SOFT_FACTOR
        val z = zOf("e2" to weak, "e4" to weak, "e7" to weak, "e5" to weak)

        assertNull(state.pairCandidate(z, NO_SCORE))
    }

    private companion object {
        const val STEP = 0.01
    }
}

internal const val HOT = 8.0

internal fun zOf(vararg hot: Pair<String, Double>): DoubleArray {
    val out = DoubleArray(Squares.COUNT)
    for ((square, value) in hot) out[Squares.index(square)] = value
    return out
}

internal fun hypothesisState(
    fen: String = STARTPOS,
    config: TrackerConfig = TrackerConfig(),
): EngineState = EngineState(config, fen, whitePov = true)

/** `generateHypothesis` never reads these pixels; only the anomaly patcher would. */
internal val DUMMY_GRAY = GrayImage(1, 1, ByteArray(1))

/** The post-veto `changed` set, the shadow veto and [blockedN] latches (invariant 4 counts them, never names
 *  them — the highest squares are used so they cannot collide with a named candidate). */
internal fun EngineState.armDetection(
    changed: Set<String> = emptySet(),
    shadowVeto: Set<String> = emptySet(),
    blockedN: Int = 0,
) {
    this.changed = ofSquares(changed)
    shadowVetoed = ofSquares(shadowVeto)
    tainted = if (blockedN == 0) 0L else -1L shl (Squares.COUNT - blockedN)
}
