package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_pair_candidate`.
 *
 * Mirrors `tests/test_move_tracker.py::TestPairScores` plus the named invariant tests of
 * `specs/17-android-rewrite/03c-hypothesis.md`.
 */
class PairCandidateTest {
    /** `test_pair_explains_two_moves` — both half-moves fully evidenced. */
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

    /**
     * Drei Schlaege auf DASSELBE Feld in einem Blick: `f3xe5 c6xe5 d4xe5` leert f3, c6 und d4 und
     * stellt einen weissen Bauern auf e5. Als Paar gelesen gewann `f3e5 c6d4`, weil es alle vier
     * beruehrten Felder erklaert — und dabei einen Springer auf d4 erfindet (2026-08-30 live).
     */
    @Test
    fun threeCapturesOntoOneSquareAreASequence() {
        val state = hypothesisState("r1bqkbnr/ppp2ppp/2n5/3pp3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
        val z = zOf("f3" to HOT, "c6" to HOT, "d4" to HOT, "e5" to HOT)

        val found =
            loglikSequenceScores(state.board, z, state.config.zThr, LL_K, maxPlies = 3)
                .map { (seq, _) -> seq.map { uciOf(it) } }

        assertTrue(listOf("f3e5", "c6e5", "d4e5") in found, "der Dreifachschlag muss gebildet werden")
    }

    /**
     * Und warum er den Blick allein nicht gewinnt: `f3e5 c6d4` beruehrt DIESELBEN vier Felder und
     * scort damit gleich. Der Diff kann die beiden nicht trennen — das kann nur das Modell, und
     * das tut es eine Stufe spaeter (`VerifyPair.pairColourConflicts`).
     */
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

    /** `test_pair_requires_endpoint_evidence` — only one half has evidence -> no pair at all. */
    @Test
    fun pairRequiresEndpointEvidence() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT)

        assertNull(state.pairCandidate(z, NO_SCORE))
    }

    /**
     * The second half is evaluated on the INTERMEDIATE board.
     *
     * White pushes `e5e6`; Black recaptures `f7xe6`. On the PRE-push board `e6` is still empty, so
     * `f7e6` would be classified as an en-passant capture and would drag the cold square `e7` into
     * the touched set — which fails the `z >= soft` gate and would kill a real pair. On the
     * intermediate board `e6` is occupied, the move is an ordinary capture, and the pair survives.
     */
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

    /** `best - max(second, bestSingle) >= ambiguityMarginLl` — reject below, accept at the margin. */
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

    /** The pair's scores replace the single's; the absolute LL floor reads them. */
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

    /** `specs/09`: a DESTINATION in the shadow veto kills the pair; a shadowed origin does not. */
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

    /** A pair is only a candidate when its best score is net positive (`best < 0.0` -> null). */
    @Test
    fun negativePairIsRejected() {
        val state = hypothesisState()
        // Both endpoints just above the soft gate, but every logit is negative.
        val weak = state.config.zThr * PAIR_SOFT_FACTOR
        val z = zOf("e2" to weak, "e4" to weak, "e7" to weak, "e5" to weak)

        assertNull(state.pairCandidate(z, NO_SCORE))
    }

    private companion object {
        const val STEP = 0.01
    }
}

// -- shared helpers for the phase-03c test classes -------------------------------------------

/** A clearly-changed square (`z = 8`, well above `zThr = 3`). */
internal const val HOT = 8.0

/** All 64 squares at 0.0, with the named ones overridden — Python's `_z(...)` test helper. */
internal fun zOf(vararg hot: Pair<String, Double>): DoubleArray {
    val out = DoubleArray(Squares.COUNT)
    for ((square, value) in hot) out[Squares.index(square)] = value
    return out
}

/** A fresh engine state on [fen] with the CNN off, exactly like the fixture replays. */
internal fun hypothesisState(
    fen: String = STARTPOS,
    config: TrackerConfig = TrackerConfig(),
): EngineState = EngineState(config, fen, whitePov = true)

/** `generateHypothesis` never reads these pixels; only the anomaly patcher would. */
internal val DUMMY_GRAY = GrayImage(1, 1, ByteArray(1))

/**
 * Arms the per-frame state steps 5 and 6 read off [EngineState]: the post-veto `changed` set, the
 * shadow veto, and [blockedN] occlusion latches (invariant 4 counts them, never names them — the
 * highest squares are used so they cannot collide with a named candidate).
 */
internal fun EngineState.armDetection(
    changed: Set<String> = emptySet(),
    shadowVeto: Set<String> = emptySet(),
    blockedN: Int = 0,
) {
    this.changed = ofSquares(changed)
    shadowVetoed = ofSquares(shadowVeto)
    tainted = if (blockedN == 0) 0L else -1L shl (Squares.COUNT - blockedN)
}
