package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_generate_hypothesis` and the step-5 viability filter it consumes.
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
        val moves = state.scoreViableMoves(zOf("e2" to HOT, "e4" to soft))

        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
        assertTrue(moves.best > 0.0, "the evidence speaks net FOR the move")
    }

    /** Just BELOW the soft gate the same move is not viable at all. */
    @Test
    fun targetBelowTheSoftGateIsNotViable() {
        val state = hypothesisState()
        val soft = state.config.zThr * PAIR_SOFT_FACTOR
        val z = zOf("e2" to HOT, "e4" to soft - 0.01)
        state.armDetection(changed = setOf("e2"))

        val moves = state.scoreViableMoves(z)

        assertNull(moves.obsMove)
        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
    }

    /** `test_castling_signature_wins` — all four castling squares hot -> `O-O`. */
    @Test
    fun castlingSignature() {
        val state = hypothesisState(CASTLING_FEN)
        val z = zOf("e1" to HOT, "f1" to HOT, "g1" to HOT, "h1" to HOT)
        state.armDetection(changed = setOf("e1", "f1", "g1", "h1"))
        val moves = state.scoreViableMoves(z)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertEquals(listOf("e1g1"), cand?.moves?.map { uciOf(it) })
        assertEquals(true, cand?.vote)
    }

    /** `test_en_passant_signature_wins` — the captured pawn's square is part of the signature. */
    @Test
    fun enPassantSignature() {
        val state = hypothesisState(EN_PASSANT_FEN)
        val z = zOf("e5" to HOT, "f5" to HOT, "f6" to HOT)
        state.armDetection(changed = setOf("e5", "f5", "f6"))
        val moves = state.scoreViableMoves(z)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertEquals(listOf("e5f6"), cand?.moves?.map { uciOf(it) })
    }

    /** `test_unexplained_hot_square_penalizes_noncovering_moves`. */
    @Test
    fun hotUntouchedSquarePenalizes() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "a3" to HOT)
        val scored = loglikScores(state.board, z, state.config.zThr, LL_K).associate { uciOf(it.first) to it.second }

        assertTrue(scored.getValue("e2e4") > scored.getValue("d2d4"), "d2d4 explains nothing hot")
        // a3 is hot but only a2a3 / b1a3 cover it — and their other endpoint is cold, so neither is
        // viable. The candidate is still e2e4.
        val moves = state.scoreViableMoves(z)
        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
    }

    /** `test_shadow_destination_blocks_phantom_move` (specs/09) — destination-only veto. */
    @Test
    fun shadowDestinationBlocksPhantomMove() {
        val state = hypothesisState(ROOK_H1_FEN)
        val z = zOf("h1" to HOT, "g1" to HOT)
        state.shadowVetoed = ofSquares("g1")

        val moves = state.scoreViableMoves(z)

        assertEquals(listOf("h1g1"), state.shadowBlocked)
        assertTrue(moves.viableRaw.any { uciOf(it.first) == "h1g1" }, "raw viability still sees it")
        assertTrue(moves.viable.none { uciOf(it.first) == "h1g1" }, "the shadow filter drops it")
        assertEquals("Rg1? destination shadow-vetoed — not a move", state.note)
    }

    /** `test_shadow_on_from_square_still_allows_move` — invariant 2 seen from the scoring side. */
    @Test
    fun shadowOnFromSquareStillAllowsMove() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT)
        state.shadowVetoed = ofSquares("e2")

        val moves = state.scoreViableMoves(z)

        assertEquals("e2e4", moves.obsMove?.let { uciOf(it) })
        assertTrue(state.shadowBlocked.isEmpty())
    }

    // -- step 6: the too-much-change gate --------------------------------------------------------

    /** entry.md invariant 4 — latched squares count, and a pair is never tried while they do. */
    @Test
    fun taintedSquaresCountTowardMaxChanged() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)
        val singleBest = state.bestScore
        state.armDetection(changed = setOf("e2", "e4", "e5"), blockedN = 4)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

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
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("e2", "e4", "e5", "e7", "a3", "b3", "h3"))

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertEquals(listOf("e2e4", "e7e5"), cand?.moves?.map { uciOf(it) })
        assertNull(state.stuckReason)
    }

    /** Beyond `maxChanged + 2` even a perfect pair is refused. */
    @Test
    fun beyondMaxChangedPlusTwoNoPairIsTried() {
        val state = hypothesisState()
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("e2", "e4", "e5", "e7", "a3", "b3", "h3", "a6", "b6"))

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
    }

    // -- step 6: the CNN-confirmed-unchanged discount ---------------------------------------------

    /**
     * The Qxe2 frame of rec-20260808-003957 (@~6800): one true move plus a crown-overhang bleed
     * cloud read as 8 changed squares while the observer read the cloud as unchanged at full
     * confidence — the gate refused on evidence the CNN had already contradicted. Confirmed
     * squares stop COUNTING; z and `changed` stay, and every later gate still stands.
     */
    @Test
    fun cnnConfirmedUnchangedSquaresStopCounting() {
        val state = hypothesisState()
        state.cnnRun = true
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("e2", "e4", "d1", "e1", "b2", "d2", "f1", "c3"))
        // The observation contradicts the BLEED cloud only: the move squares read as moved
        // (e2 empty, e4 occupied — disagreeing with the still-unmoved board), the cloud matches.
        val obs = obsForBoard(state.board, mapOf("e2" to LABEL_EMPTY, "e4" to "wP"))
        state.cnnSnap = recoverySnap(state, obs, seq = 1)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertEquals(listOf("e2e4"), cand?.moves?.map { uciOf(it) })
        assertNull(state.stuckReason, "six cloud squares are CNN-confirmed unchanged — 2 count, the gate stays open")
    }

    /** A square can read confident AND occluded; a resting hand must not unlock the ceiling. */
    @Test
    fun aRestingHandCannotTalkItselfOutOfTheCeiling() {
        val state = hypothesisState()
        state.cnnRun = true
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        val cloud = setOf("d1", "e1", "b2", "d2", "f1", "c3")
        state.armDetection(changed = setOf("e2", "e4", "a6") + cloud)
        // The cloud MATCHES the board (a hand over undisturbed squares) but reads occluded; the
        // three genuinely-moved squares disagree, so nothing outside the hand can be discounted.
        val labels =
            Squares.ALL.associateWith { state.board.labelAt(it) } +
                mapOf("e2" to LABEL_EMPTY, "e4" to "wP", "a6" to "bP")
        state.cnnSnap = recoverySnap(state, RecoveryObs(labels, occluded = cloud), seq = 1)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
        assertEquals(
            "Much change (9 squares + 0 occluded) — occluded/unstable, no move committed " +
                "(base truth unchanged)",
            state.note,
            "occluded-reading squares are refused by the discount — no suffix, nothing discounted",
        )
    }

    /** Squares the observation reads as CHANGED keep counting — a board that is really behind stays stuck. */
    @Test
    fun squaresTheCnnReadsAsChangedKeepCounting() {
        val state = hypothesisState()
        state.cnnRun = true
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        // The observation agrees the whole set changed: occupied squares read empty and vice versa.
        val flips =
            mapOf(
                "e2" to LABEL_EMPTY,
                "e4" to "wP",
                "d1" to LABEL_EMPTY,
                "e1" to LABEL_EMPTY,
                "b2" to LABEL_EMPTY,
                "d2" to LABEL_EMPTY,
                "f1" to LABEL_EMPTY,
                "c3" to "wN",
            )
        state.armDetection(changed = flips.keys)
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board, flips), seq = 1)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
        assertEquals(
            "Much change (8 squares + 0 occluded) — occluded/unstable, no move committed " +
                "(base truth unchanged)",
            state.note,
            "the observation confirms the change — nothing to discount, the old note byte for byte",
        )
    }

    /** A discount that is too small to open the gate is still visible in the note. */
    @Test
    fun aPartialDiscountIsVisibleInTheNote() {
        val state = hypothesisState()
        state.cnnRun = true
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        // 9 changed; only d1/e1 match the board in the observation -> 2 discounted, 7 still count.
        val flips =
            mapOf(
                "e2" to LABEL_EMPTY,
                "e4" to "wP",
                "b2" to LABEL_EMPTY,
                "d2" to LABEL_EMPTY,
                "f1" to LABEL_EMPTY,
                "c3" to "wN",
                "a6" to "bP",
            )
        state.armDetection(changed = flips.keys + setOf("d1", "e1"))
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board, flips), seq = 1)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
        assertEquals(
            "Much change (9 squares + 0 occluded) — occluded/unstable, no move committed " +
                "(base truth unchanged) (2 CNN-confirmed unchanged)",
            state.note,
        )
    }

    /** A snapshot of ANOTHER position must not vouch for this one (the `cnnDesync` pattern). */
    @Test
    fun aSnapshotOfAnotherPositionDiscountsNothing() {
        val state = hypothesisState()
        state.cnnRun = true
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("e2", "e4", "d1", "e1", "b2", "d2", "f1", "c3"))
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board), seq = 1, fen = NF3_NO_CASTLING)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
        assertEquals(
            "Much change (8 squares + 0 occluded) — occluded/unstable, no move committed " +
                "(base truth unchanged)",
            state.note,
            "a position-mismatched snapshot is no evidence — the old note, byte for byte",
        )
    }

    /** Same for a snapshot older than the freshness bound. */
    @Test
    fun aStaleSnapshotDiscountsNothing() {
        val state = hypothesisState()
        state.cnnRun = true
        state.nowS = OBS_MAX_AGE_S + 1.0
        val z = zOf("e2" to HOT, "e4" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("e2", "e4", "d1", "e1", "b2", "d2", "f1", "c3"))
        state.cnnSnap = recoverySnap(state, obsForBoard(state.board), seq = 1)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(STUCK_TOO_MANY_CHANGED, state.stuckReason)
    }

    // -- step 6: the CNN-conditional order -------------------------------------------------------

    /** The load-bearing ordering: pair BEFORE single with CNN, single first without. */
    @Test
    fun pairOrderIsCnnConditional() {
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val changed = setOf("e2", "e4", "e5", "e7")

        val without = hypothesisState()
        val withoutMoves = without.scoreViableMoves(z)
        without.armDetection(changed = changed)
        val withoutCand = without.generateHypothesis(z, withoutMoves, DUMMY_GRAY, null)
        assertEquals(listOf("e2e4"), withoutCand?.moves?.map { uciOf(it) })

        val with = cnnState()
        val withMoves = with.scoreViableMoves(z)
        with.armDetection(changed = changed)
        val withCand = with.generateHypothesis(z, withMoves, DUMMY_GRAY, null)
        assertEquals(listOf("e2e4", "e7e5"), withCand?.moves?.map { uciOf(it) })
    }

    // -- step 6: ambiguity, promotion, prior ------------------------------------------------------

    /** `test_ambiguity_two_knights_small_margin` — the prior cannot close a 1.2 LL gap. */
    @Test
    fun twoKnightsAmbiguous() {
        val state = hypothesisState(TWO_KNIGHTS_FEN)
        val z = zOf("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        val moves = state.scoreViableMoves(z)
        assertEquals("b1d2", moves.obsMove?.let { uciOf(it) })
        assertTrue(moves.best - moves.second < state.config.ambiguityMarginLl)
        state.armDetection(changed = setOf("b1", "f3", "d2"))

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

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
        val zShort = zOf("b1" to HOT, "f3" to 6.21, "d2" to HOT)
        val shortMoves = short.scoreViableMoves(zShort)
        short.armDetection(changed = setOf("b1", "d2"))
        assertNull(short.generateHypothesis(zShort, shortMoves, DUMMY_GRAY, null))
        assertTrue(short.note!!.startsWith("ambiguous: "))

        val ok = hypothesisState(TWO_KNIGHTS_FEN)
        val zOk = zOf("b1" to HOT, "f3" to 6.19, "d2" to HOT)
        val okMoves = ok.scoreViableMoves(zOk)
        ok.armDetection(changed = setOf("b1", "d2"))
        val cand = ok.generateHypothesis(zOk, okMoves, DUMMY_GRAY, null)

        assertEquals(listOf("b1d2"), cand?.moves?.map { uciOf(it) })
        assertEquals(true, cand?.priorUsed)
    }

    /** `test_promotion_waits_for_user_choice` — without CNN the UI is asked. */
    @Test
    fun promotionWithoutCnnYieldsPromoPending() {
        val state = hypothesisState(PROMOTION_FEN)
        state.confirmer.feed("a7a8q")
        val z = zOf("a7" to HOT, "a8" to HOT)
        state.armDetection(changed = setOf("a7", "a8"))
        val moves = state.scoreViableMoves(z)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertNull(cand)
        assertNotNull(state.promoPending)
        assertEquals("a7", state.promoPending!!.from)
        assertEquals("a8", state.promoPending!!.to)
        assertEquals(PROMOTION_FEN, state.promoPending!!.fen, "the FEN at detection time is recorded")
        assertEquals(NOTE_PROMOTION_PENDING, state.note)
        assertEquals("a7a8q", state.confirmer.key, "the promotion branch does not touch the confirmer")
    }

    /** With CNN the prompt still opens; identity observations may answer it later. */
    @Test
    fun promotionWithCnnStillYieldsPromoPending() {
        val state = cnnState(PROMOTION_FEN)
        val z = zOf("a7" to HOT, "a8" to HOT)
        state.armDetection(changed = setOf("a7", "a8"))
        val moves = state.scoreViableMoves(z)

        val cand = state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertNull(cand)
        assertNotNull(state.promoPending)
        assertEquals("a7", state.promoPending!!.from)
        assertEquals("a8", state.promoPending!!.to)
    }

    /** No prior at all -> the plain ambiguity note. */
    @Test
    fun withoutPriorAnAmbiguousFrameGetsThePlainNote() {
        val state = hypothesisState(TWO_KNIGHTS_FEN, NO_PRIOR_CONFIG)
        val z = zOf("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        state.armDetection(changed = setOf("b1", "f3", "d2"))
        val moves = state.scoreViableMoves(z)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(NOTE_AMBIGUOUS_PLAIN, state.note)
    }

    // -- step 6: the quiet edge ----------------------------------------------------------------------

    /**
     * The silent exit, made visible: evidence, no candidate, no stuck — and until this row existed,
     * no trace either. A replay that commits nothing where the live phone committed something has to
     * say WHICH of the two it was, and only `markStuck` used to say it.
     */
    @Test
    fun anAmbiguousFrameLeavesExactlyOneFoldedQuietEdgeRow() {
        val state = hypothesisState(TWO_KNIGHTS_FEN)
        val z = zOf("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        state.armDetection(changed = setOf("b1", "f3", "d2"))
        val moves = state.scoreViableMoves(z)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))

        assertNull(state.stuckReason, "the ambiguity arm never marks stuck — that is why it was silent")
        val row = state.decisionLog.single()
        assertFalse(row.accepted)
        assertEquals(DECIDER_REJECTED, row.decider)
        assertEquals(REASON_QUIET_EDGE, row.reason)
        assertEquals("", row.move, "no candidate formed, so there is no uci to name")
        assertEquals(listOf("b1", "d2", "f3"), row.changed, "the row carries the evidence set")

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))
        assertEquals(1, state.decisionLog.size, "an identical quiet frame folds into the row at the tail")
    }

    /** A different evidence set is a different event — the fold must not swallow it. */
    @Test
    fun aQuietEdgeOnAnotherChangedSetGetsItsOwnRow() {
        val state = hypothesisState(TWO_KNIGHTS_FEN)
        val z = zOf("b1" to HOT, "f3" to 7.0, "d2" to HOT)
        val moves = state.scoreViableMoves(z)
        state.armDetection(changed = setOf("b1", "f3", "d2"))
        state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        state.armDetection(changed = setOf("b1", "f3", "d2", "a3"))
        state.generateHypothesis(z, moves, DUMMY_GRAY, null)

        assertEquals(2, state.decisionLog.size)
        assertEquals(listOf("a3", "b1", "d2", "f3"), state.decisionLog.last().changed)
    }

    /** The promotion prompt is the loudest state there is; it does not also need a row. */
    @Test
    fun aPendingPromotionWritesNoQuietEdgeRow() {
        val state = hypothesisState(PROMOTION_FEN)
        val z = zOf("a7" to HOT, "a8" to HOT)
        state.armDetection(changed = setOf("a7", "a8"))
        val moves = state.scoreViableMoves(z)

        assertNull(state.generateHypothesis(z, moves, DUMMY_GRAY, null))

        assertNotNull(state.promoPending)
        assertTrue(state.decisionLog.isEmpty(), "the pending promotion IS the provenance")
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
        val z = DoubleArray(Squares.COUNT) { tierA.zFused.getValue(Squares.ALL[it]) }
        state.shadowVetoed = ofSquares(tierB.shadowVeto)
        val moves = state.scoreViableMoves(z)
        var asserted = false
        if (tierB.changed.isNotEmpty()) {
            state.armDetection(
                changed = tierB.changed.toSet(),
                shadowVeto = tierB.shadowVeto.toSet(),
                blockedN = tierB.tainted.size,
            )
            state.generateHypothesis(z, moves, DUMMY_GRAY, null)
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
