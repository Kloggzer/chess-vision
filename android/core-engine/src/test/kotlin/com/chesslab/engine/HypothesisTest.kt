package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_generate_hypothesis` (`tracker.py:3188-3277`) and the step-5 viability filter it consumes
 * (`:2995-3011`).
 *
 * Mirrors the scenario tests of `tests/test_move_tracker.py` named in
 * `specs/17-android-rewrite/03c-hypothesis.md` plus the parity replay over the phase-00b Tier-B
 * fixtures.
 */
class HypothesisTest {
    // -- step 5: viability + the shadow-destination rule ---------------------------------------

    /** `test_weak_target_still_wins` — a target just AT the soft gate keeps the move viable. */
    @Test
    fun weakTargetStillViable() {
        val state = hypothesisState()
        val soft = state.config.zThr * PAIR_SOFT_FACTOR
        val moves = state.scoreViableMoves(zMap("e2" to HOT, "e4" to soft), emptySet())

        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
        assertTrue(moves.best > 0.0, "the evidence speaks net FOR the move")
    }

    /** Just BELOW the soft gate the same move is not viable at all. */
    @Test
    fun targetBelowTheSoftGateIsNotViable() {
        val state = hypothesisState()
        val soft = state.config.zThr * PAIR_SOFT_FACTOR
        val z = zMap("e2" to HOT, "e4" to soft - 0.01)

        val moves = state.scoreViableMoves(z, emptySet())

        assertNull(moves.obsMove)
        assertNull(state.generateHypothesis(z, moves, detectContext(setOf("e2"))))
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
    }

    /** `test_castling_signature_wins` — all four castling squares hot -> `O-O`. */
    @Test
    fun castlingSignature() {
        val state = hypothesisState(CASTLING_FEN)
        val z = zMap("e1" to HOT, "f1" to HOT, "g1" to HOT, "h1" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())

        val cand = state.generateHypothesis(z, moves, detectContext(setOf("e1", "f1", "g1", "h1")))

        assertEquals(listOf("e1g1"), cand?.moves?.map { uciOf(it) })
        assertEquals(true, cand?.vote)
    }

    /** `test_en_passant_signature_wins` — the captured pawn's square is part of the signature. */
    @Test
    fun enPassantSignature() {
        val state = hypothesisState(EN_PASSANT_FEN)
        val z = zMap("e5" to HOT, "f5" to HOT, "f6" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())

        val cand = state.generateHypothesis(z, moves, detectContext(setOf("e5", "f5", "f6")))

        assertEquals(listOf("e5f6"), cand?.moves?.map { uciOf(it) })
    }

    /** `test_unexplained_hot_square_penalizes_noncovering_moves`. */
    @Test
    fun hotUntouchedSquarePenalizes() {
        val state = hypothesisState()
        val z = zMap("e2" to HOT, "e4" to HOT, "a3" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, state.config.llK).associate { uciOf(it.first) to it.second }

        assertTrue(scored.getValue("e2e4") > scored.getValue("d2d4"), "d2d4 explains nothing hot")
        // a3 is hot but only a2a3 / b1a3 cover it — and their other endpoint is cold, so neither is
        // viable. The candidate is still e2e4.
        val moves = state.scoreViableMoves(z, emptySet())
        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
    }

    /** `test_shadow_destination_blocks_phantom_move` (specs/09) — destination-only veto. */
    @Test
    fun shadowDestinationBlocksPhantomMove() {
        val state = hypothesisState(ROOK_H1_FEN)
        val z = zMap("h1" to HOT, "g1" to HOT)

        val moves = state.scoreViableMoves(z, setOf("g1"))

        assertEquals(listOf("h1g1"), state.shadowBlocked)
        assertTrue(moves.viableRaw.any { uciOf(it.first) == "h1g1" }, "raw viability still sees it")
        assertTrue(moves.viable.none { uciOf(it.first) == "h1g1" }, "the shadow filter drops it")
        assertEquals("Rg1? destination shadow-vetoed — not a move", state.note)
    }

    /** `test_shadow_on_from_square_still_allows_move` — invariant 2 seen from the scoring side. */
    @Test
    fun shadowOnFromSquareStillAllowsMove() {
        val state = hypothesisState()
        val z = zMap("e2" to HOT, "e4" to HOT)

        val moves = state.scoreViableMoves(z, setOf("e2"))

        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
        assertTrue(state.shadowBlocked.isEmpty())
    }

    // -- step 6: the too-much-change gate --------------------------------------------------------

    /** entry.md invariant 4 — latched squares count, and a pair is never tried while they do. */
    @Test
    fun taintedSquaresCountTowardMaxChanged() {
        val state = hypothesisState()
        val z = zMap("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())
        val singleBest = state.bestScore

        val cand =
            state.generateHypothesis(
                z,
                moves,
                detectContext(changed = setOf("e2", "e4", "e5"), blockedN = 4),
            )

        assertNull(cand)
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
        assertEquals(
            singleBest,
            state.bestScore,
            1e-9,
            "no pair may be attempted while squares are tainted (it would rewrite bestScore)",
        )
        assertEquals(
            "Much change (3 squares + 4 occluded) — occluded/unstable, no move committed " +
                "(base truth unchanged)",
            state.note,
        )
    }

    /** With nothing tainted and at most `maxChanged + 2` squares, the pair IS tried. */
    @Test
    fun pairRescuesTooMuchChangeWhenNothingIsTainted() {
        val state = hypothesisState()
        val z = zMap("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())
        val changed = setOf("e2", "e4", "e5", "e7", "a3", "b3", "h3")

        val cand = state.generateHypothesis(z, moves, detectContext(changed))

        assertEquals(listOf("e2e4", "e7e5"), cand?.moves?.map { uciOf(it) })
        assertNull(state.stuckReason)
    }

    /** Beyond `maxChanged + 2` even a perfect pair is refused. */
    @Test
    fun beyondMaxChangedPlusTwoNoPairIsTried() {
        val state = hypothesisState()
        val z = zMap("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())
        val changed = setOf("e2", "e4", "e5", "e7", "a3", "b3", "h3", "a6", "b6")

        assertNull(state.generateHypothesis(z, moves, detectContext(changed)))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
    }

    // -- step 6: the CNN-conditional order -------------------------------------------------------

    /** The load-bearing ordering: pair BEFORE single with CNN, single first without. */
    @Test
    fun pairOrderIsCnnConditional() {
        val z = zMap("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val changed = setOf("e2", "e4", "e5", "e7")

        val without = hypothesisState()
        val withoutMoves = without.scoreViableMoves(z, emptySet())
        val withoutCand = without.generateHypothesis(z, withoutMoves, detectContext(changed))
        assertEquals(listOf("e2e4"), withoutCand?.moves?.map { uciOf(it) })

        val with = cnnState()
        val withMoves = with.scoreViableMoves(z, emptySet())
        val withCand = with.generateHypothesis(z, withMoves, detectContext(changed))
        assertEquals(listOf("e2e4", "e7e5"), withCand?.moves?.map { uciOf(it) })
    }

    // -- step 6: ambiguity, promotion, prior ------------------------------------------------------

    /** `test_ambiguity_two_knights_small_margin` — the prior cannot close a 1.2 LL gap. */
    @Test
    fun twoKnightsAmbiguous() {
        val state = hypothesisState(TWO_KNIGHTS_FEN)
        val z = zMap("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())
        assertEquals("b1d2", moves.obsMove?.let { uciOf(it) })
        assertTrue(moves.best - moves.second < state.config.ambiguityMarginLl)

        val cand = state.generateHypothesis(z, moves, detectContext(setOf("b1", "f3", "d2")))

        assertNull(cand)
        assertTrue(state.note!!.startsWith("ambiguous: "), state.note!!)
        assertTrue(state.note!!.contains("(+10.0)"), state.note!!)
        assertTrue(state.note!!.contains("(+9.0)"), state.note!!)
        assertTrue(state.note!!.endsWith(" — please move cleanly / wait briefly"))
    }

    /** The rerank must clear the FULL margin — 0.01 short is still ambiguous. */
    @Test
    fun priorRerankNeedsTheFullMargin() {
        // b1d2 gains +0.2 (forward), f3d2 gains nothing: the reranked gap is z[b1] - z[f3] + 0.2.
        val short = hypothesisState(TWO_KNIGHTS_FEN)
        val zShort = zMap("b1" to HOT, "f3" to 6.21, "d2" to HOT)
        val shortMoves = short.scoreViableMoves(zShort, emptySet())
        assertNull(short.generateHypothesis(zShort, shortMoves, detectContext(setOf("b1", "d2"))))
        assertTrue(short.note!!.startsWith("ambiguous: "))

        val ok = hypothesisState(TWO_KNIGHTS_FEN)
        val zOk = zMap("b1" to HOT, "f3" to 6.19, "d2" to HOT)
        val okMoves = ok.scoreViableMoves(zOk, emptySet())
        val cand = ok.generateHypothesis(zOk, okMoves, detectContext(setOf("b1", "d2")))

        assertEquals(listOf("b1d2"), cand?.moves?.map { uciOf(it) })
        assertEquals(true, cand?.priorUsed)
    }

    /** `test_promotion_waits_for_user_choice` — without CNN the UI is asked. */
    @Test
    fun promotionWithoutCnnYieldsPromoPending() {
        val state = hypothesisState(PROMOTION_FEN)
        state.confirmer.feed("a7a8q")
        val z = zMap("a7" to HOT, "a8" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())

        val cand = state.generateHypothesis(z, moves, detectContext(setOf("a7", "a8")))

        assertNull(cand)
        assertNotNull(state.promoPending)
        assertEquals("a7", state.promoPending!!.from)
        assertEquals("a8", state.promoPending!!.to)
        assertEquals(PROMOTION_FEN, state.promoPending!!.fen, "the FEN at detection time is recorded")
        assertEquals(NOTE_PROMOTION_PENDING, state.note)
        assertEquals("a7a8q", state.confirmer.key, "the promotion branch does not touch the confirmer")
    }

    /** With CNN the best variant is passed through and verify corrects it via the label. */
    @Test
    fun promotionWithCnnPassesQueenVariant() {
        val state = cnnState(PROMOTION_FEN)
        val z = zMap("a7" to HOT, "a8" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())

        val cand = state.generateHypothesis(z, moves, detectContext(setOf("a7", "a8")))

        assertNotNull(cand)
        assertEquals(1, cand!!.moves.size)
        assertEquals(true, cand.vote)
        // The four variants tie exactly, so WHICH one leads is legal-move-generation order and is
        // not order-comparable against python-chess (STATUS D03c-4). from/to and "is a promotion"
        // are the load-bearing part.
        assertTrue(uciOf(cand.moves[0]).startsWith("a7a8"), uciOf(cand.moves[0]))
        assertEquals(PROMOTION_UCI_LENGTH, uciOf(cand.moves[0]).length, "a promotion variant, not the bare push")
        assertNull(state.promoPending)
    }

    /** No prior at all -> the plain ambiguity note. */
    @Test
    fun withoutPriorAnAmbiguousFrameGetsThePlainNote() {
        val state = hypothesisState(TWO_KNIGHTS_FEN, NO_PRIOR_CONFIG)
        val z = zMap("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        val moves = state.scoreViableMoves(z, emptySet())

        assertNull(state.generateHypothesis(z, moves, detectContext(setOf("b1", "f3", "d2"))))
        assertEquals(NOTE_AMBIGUOUS_PLAIN, state.note)
    }

    // -- parity ------------------------------------------------------------------------------------

    /**
     * Replays step 5 + step 6 over every Tier-A frame of every clip and compares against the
     * recorded Python decision state.
     *
     * Frames that COMMITTED are skipped: `frame.fen` is then the position AFTER the move
     * (STATUS D02a-3), so the board the decision was made on is not recoverable from the fixture.
     */
    @Test
    fun hypothesisMatchesPythonOnEveryTierAFrame() {
        var frames = 0
        var stuckAsserted = 0
        for (clip in ParityFixtures.clips()) {
            val fixture = ParityFixtures.load(clip)
            val config = fixture.meta.effectiveConfig.toTrackerConfig()
            for (frame in fixture.tierAFrames()) {
                // One `continue` per loop (detekt LoopWithTooManyJumpStatements): a frame without a
                // tierB block and a frame that COMMITTED are skipped by the same condition.
                val tierB = frame.tierB
                if (tierB == null || tierB.commit != null) continue
                val state = EngineState(config, frame.fen!!, whitePov = fixture.meta.whitePov)
                if (replayFrame(state, frame)) stuckAsserted++
                assertClose(tierB.bestLl, state.bestScore, "$clip/${frame.frame} bestLl")
                assertClose(tierB.secondLl, state.secondScore, "$clip/${frame.frame} secondLl")
                // `candidateUci` is written at step 5 and only rewritten by 03d's step 8, where a
                // single move produces the identical string; a pair key (two ucis) is out of scope.
                if (tierB.candidateUci?.contains(' ') != true) {
                    assertEquals(tierB.candidateUci, state.candidateUci, "$clip/${frame.frame} candidateUci")
                }
                frames++
            }
        }
        val coverage = "$frames tier-A frames, $stuckAsserted of them through the stuck path"
        assertTrue(frames > MIN_PARITY_FRAMES, "too few frames replayed: $coverage")
        assertTrue(stuckAsserted > 0, "the replay is toothless: $coverage")
    }

    /** Runs step 5 + step 6 on [frame]; returns true when the stuck path was asserted. */
    private fun replayFrame(
        state: EngineState,
        frame: ParityFrame,
    ): Boolean {
        val tierA = frame.tierA!!
        val tierB = frame.tierB!!
        val shadowVeto = tierB.shadowVeto.toSet()
        val moves = state.scoreViableMoves(tierA.zFused, shadowVeto)
        var asserted = false
        if (tierB.changed.isNotEmpty()) {
            val ctx =
                DetectContext(
                    changed = tierB.changed.toSet(),
                    shadowVeto = shadowVeto,
                    blockedN = tierB.tainted.size,
                    cur = GrayImage(1, 1, ByteArray(1)),
                    curBgr = null,
                )
            state.generateHypothesis(tierA.zFused, moves, ctx)
            if (state.stuckReason != null) {
                assertEquals(tierB.stuckReason, state.stuckReason, "${frame.frame} stuckReason")
                assertEquals(tierB.note, state.note, "${frame.frame} note")
                asserted = true
            }
            val promo = state.promoPending
            if (promo != null) {
                val pending = tierB.promotionPending
                assertNotNull(pending, "${frame.frame} promotionPending")
                assertEquals(pending!!.from, promo.from)
                assertEquals(pending.to, promo.to)
            }
        }
        return asserted
    }

    private companion object {
        const val CASTLING_FEN = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5"
        const val EN_PASSANT_FEN = "rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3"
        const val ROOK_H1_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R w KQkq - 0 1"
        const val TWO_KNIGHTS_FEN = "rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4"
        const val PROMOTION_FEN = "8/P6k/8/8/8/8/7K/8 w - - 0 1"
        const val MIN_PARITY_FRAMES = 150

        /** `"a7a8q"` — four square characters plus the promotion piece. */
        const val PROMOTION_UCI_LENGTH = 5

        val NO_PRIOR_CONFIG = TrackerConfig(usePrior = false)
    }
}
