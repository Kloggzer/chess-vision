package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.commitGates
import com.chesslab.engine.api.quietOutcome
import com.chesslab.engine.api.tryDetect
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Shared helpers for the phase-03d tests. They mirror `_make_tracker`
// (`tests/test_move_tracker.py:776`): a 400 px identity profile, `avg_frames = 1`,
// `confirm_frames = 1`, `require_motion_for_move = False` and detection at full resolution.

internal fun detectConfig(
    confirmFrames: Int = 1,
    requireMotion: Boolean = false,
    censusZWeight: Double = 1.0,
    overhang: Double = 0.0,
): TrackerConfig =
    TrackerConfig(
        boardSize = TEST_BOARD_SIZE,
        detectScale = 1.0,
        overhang = overhang,
        censusZWeight = censusZWeight,
        minGridLineCoverage = 0.0,
        requireMotionForMove = requireMotion,
        settleFramesOverride = 1,
        avgFramesOverride = 1,
        confirmFramesOverride = confirmFrames,
    )

/** A state whose base truth is already `(ref, current FEN)`, ready for a direct `tryDetect`. */
internal fun detectState(
    config: TrackerConfig = detectConfig(),
    fen: String = STARTPOS,
    ref: GrayImage = grayFrame(),
): EngineState {
    val state = EngineState(config, fen, whitePov = true)
    state.refGray = ref
    state.refFen = state.board.fen()
    return state
}

/** A minimal [CnnObservation]: only the occupancy axis the desync veto reads. */
internal class FakeObs(
    private val occupancy: Map<String, Boolean> = emptyMap(),
    private val sure: Set<String> = emptySet(),
) : CnnObservation {
    override fun occupied(square: String): Boolean = occupancy[square] ?: false

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = square in sure

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = false

    override fun label(square: String): String? = null

    override fun conf(square: String): Double = 0.0

    override fun pOccluded(square: String): Double = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

internal fun snapshotOf(
    state: EngineState,
    obs: CnnObservation,
): CnnSnapshot =
    CnnSnapshot(
        obs = obs,
        seq = 1,
        tsMs = (state.nowS * 1000.0).toLong(),
        inferMs = 0.0,
        warped = null,
        gray = null,
        fen = state.board.fen(),
    )

internal fun moveOf(
    state: EngineState,
    uci: String,
): Move = state.board.legalMoves().first { uciOf(it) == uci }

/**
 * Step 9 (`_dispatch`) plus the three gates in front of it (6b LL floor, 7 motion, 8 confirmer).
 *
 * Python reference: `tests/test_move_tracker.py::TestCnnVerify`, `TestMotionPrerequisite`,
 * `TestWeakEvidenceHold` and `test_quiet_reanchor_vetoed_by_confident_cnn_conflict`.
 */
class DispatchTest {
    @Test
    fun noCnnCommitsDirectly() {
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)
        assertEquals(DECIDER_DIFF, state.decisionLog.last().decider)
    }

    @Test
    fun alarmBlocksDispatchCommits() {
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1", "d4"), null, null)
        state.motionSinceRef = true
        val events = state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note.orEmpty().contains("desynced"), "note was '${state.note}'")
        assertTrue(events.none { it is TrackerEvent.MoveCommitted })
    }

    @Test
    fun alarmBlocksCommitReanchorAndPending() {
        // entry.md invariant 9: no commit, no pending, and NO re-anchor while the latch is set.
        val ref = grayFrame()
        val state = detectState(ref = ref)
        state.cnnRun = true
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1"), null, null)
        val moving = state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        val quiet = state.tryDetect(grayFrame(), null, seq = 2)
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        assertSame(ref, state.refGray, "reference pulled forward despite the alarm")
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
        assertTrue((moving + quiet).none { it is TrackerEvent.ReAnchored })
    }

    @Test
    fun alarmDiscardsPendingCandidate() {
        // With CNN verify on, a clean candidate would normally become `pending` — the alarm gate
        // runs first, so nothing is queued for verification either.
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.cnnRun = true
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1"), null, null)
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertNull(state.pending)
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun cnnUnavailableCommitsPending() {
        // `_ensure_cnn` returned None (model gone) -> `cnn_on` is false -> commit directly
        // instead of waiting for a verification that can never arrive.
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.cnnRun = true
        state.cnnFailed = true
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(listOf("e4"), state.history)
        assertNull(state.pending)
    }

    @Test
    fun cnnVerifyPendsInsteadOfCommitting() {
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.cnnRun = true
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 7)
        assertEquals(emptyList<String>(), state.history)
        val pending = requireNotNull(state.pending)
        assertEquals(listOf("e2e4"), pending.ucis)
        assertEquals(7L, pending.seq, "the pending candidate carries the decision's frame signature")
        assertEquals(VERIFY_STATE_VERIFYING, state.verifyState)
    }

    @Test
    fun pairRespectsMotionGate() {
        val config = detectConfig(requireMotion = true)
        val state = detectState(config, ref = grayFrame(listOf("e2", "e7")))
        // pair + 3 residue squares: 7 > max_changed 6 -> only the pair escape can explain it.
        val cur = grayFrame(listOf("e4", "e5", "a3", "b3", "h3"))
        assertFalse(state.motionSinceRef)
        state.tryDetect(cur, null, seq = 1)
        assertEquals(emptyList<String>(), state.history)
        assertNull(state.pending)
        state.motionSinceRef = true
        state.lastMotionTs = state.nowS
        state.tryDetect(cur, null, seq = 2)
        assertEquals(listOf("e4", "e5"), state.history)
        assertEquals(DECIDER_DIFF_PAIR, state.decisionLog.last().decider)
    }

    @Test
    fun motionGateBlocksWithoutMotion() {
        val state = detectState(detectConfig(requireMotion = true), ref = grayFrame(listOf("e2")))
        state.motionSinceRef = false
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note.orEmpty().contains("no motion"), "note was '${state.note}'")
    }

    @Test
    fun motionGateAllowsAfterMotion() {
        val state = detectState(detectConfig(requireMotion = true), ref = grayFrame(listOf("e2")))
        state.motionSinceRef = true
        state.lastMotionTs = state.nowS
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(listOf("e4"), state.history)
    }

    @Test
    fun motionGateBlocksStaleMotion() {
        // One old wobble spike must not license a commit two minutes later.
        val state = detectState(detectConfig(requireMotion = true), ref = grayFrame(listOf("e2")))
        state.nowS = 120.0
        state.motionSinceRef = true
        state.lastMotionTs = 0.0
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note.orEmpty().contains("ago"), "note was '${state.note}'")
    }

    @Test
    fun motionGateResetOnCommit() {
        val state = detectState(detectConfig(requireMotion = true), ref = grayFrame(listOf("e2")))
        state.motionSinceRef = true
        state.lastMotionTs = state.nowS
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(listOf("e4"), state.history)
        // `_set_ref` cleared it: the NEXT move needs a new hand.
        assertFalse(state.motionSinceRef)
    }

    @Test
    fun commitLlFloorExemptsEndpointCandidates() {
        val state = detectState()
        state.bestScore = 0.44
        val move = moveOf(state, "e2e4")
        assertFalse(
            state.commitGates(Candidate(listOf(move), priorUsed = false, vote = true)),
            "a 0.44 phantom must not pass the absolute LL floor",
        )
        assertTrue(state.note.orEmpty().contains("evidence too weak"), "note was '${state.note}'")
        assertTrue(
            state.commitGates(Candidate(listOf(move), priorUsed = false, vote = false)),
            "endpoint candidates are CNN-verified by design and stay exempt",
        )
    }

    @Test
    fun weakCandidateHoldsReference() {
        // White-on-white: e2 (z 2.5) and e4 (z 1.5) are BOTH below z_thr but above z_thr/2, so
        // e2e4 stays viable at best-LL -2.0 — between the floor (-4) and 0 -> HOLD.
        val ref = grayFrame(blobs = listOf("e2"), blobLevel = TEST_BASE_LEVEL + 15)
        val cur = grayFrame(blobs = listOf("e4"), blobLevel = TEST_BASE_LEVEL + 9)
        val state = detectState(detectConfig(censusZWeight = 0.0), ref = ref)
        state.tryDetect(cur, null, seq = 1)
        assertSame(ref, state.refGray, "weak but move-consistent evidence must NOT re-anchor")
        assertNull(state.stuckReason)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note.orEmpty().contains("weak move evidence"), "note was '${state.note}'")
    }

    @Test
    fun cnnDesyncVetoesReanchor() {
        // Bxc3 incident: the CNN confidently sees e2 EMPTY while the start position believes a
        // pawn there -> the quiet re-anchor is vetoed and the standoff goes to the recovery.
        val ref = grayFrame()
        val state = detectState(ref = ref)
        state.cnnRun = true
        state.cnnSnap = snapshotOf(state, FakeObs(mapOf("e2" to false), setOf("e2")))
        state.tryDetect(grayFrame(), null, seq = 1)
        assertSame(ref, state.refGray, "re-anchored over a CNN-confirmed desync")
        assertEquals("cnn_desync", state.stuckReason)
        // The same quiet frame WITHOUT a conflicting observation -> the re-anchor proceeds.
        state.clearStuck()
        state.cnnSnap = snapshotOf(state, FakeObs())
        val cur = grayFrame()
        val events = state.tryDetect(cur, null, seq = 2)
        assertNull(state.stuckReason)
        assertSame(cur, state.refGray)
        assertTrue(events.any { it is TrackerEvent.ReAnchored })
    }

    @Test
    fun reanchorFloorScalesWithTouchedSquares() {
        // best = -6.0 is BELOW the -4.0 floor of a two-square move but ABOVE the -8.0 a castling
        // move (4 touched squares) is measured against.
        val state = detectState(fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
        val castleEvents = mutableListOf<TrackerEvent>()
        val handledCastle =
            state.quietOutcome(viableOnly(moveOf(state, "e1g1"), -6.0), grayFrame(), null, castleEvents)
        assertTrue(handledCastle)
        assertTrue(castleEvents.none { it is TrackerEvent.ReAnchored }, "castling must clear the scaled floor")
        assertNull(state.stuckReason)

        val plainEvents = mutableListOf<TrackerEvent>()
        state.quietOutcome(viableOnly(moveOf(state, "e1f1"), -6.0), grayFrame(), null, plainEvents)
        assertTrue(plainEvents.any { it is TrackerEvent.ReAnchored }, "a normal move at -6.0 is below -4.0")
    }

    @Test
    fun gamutRebuildHappensOnlyOnQuietReanchor() {
        val state = detectState(ref = grayFrame())
        state.refBgr = bgrFrame()
        assertNull(state.refGamut)
        state.tryDetect(grayFrame(), bgrFrame(), seq = 1)
        val rebuilt = requireNotNull(state.refGamut) { "the quiet re-anchor rebuilds the colour gamut" }
        // A commit-time reference may carry hand residue and must NOT touch the gamut (invariant 6).
        state.setRef(grayFrame(), bgrFrame(level = 200), fromCommit = true)
        assertSame(rebuilt, state.refGamut)
    }

    @Test
    fun cnnOverruleReplacementMoveIsExpressible() {
        // entry.md invariant 10 / legacy specs/12 D3: the verdict carries a REPLACEMENT move, so
        // the real move commits in the same cycle instead of a cycle later.
        val state = detectState()
        val cur = grayFrame()
        val pending =
            PendingVerify(
                ucis = listOf("e2e4"),
                uci = "e2e4",
                fen = state.board.fen(),
                cur = cur,
                curBgr = null,
                frames = 1,
                priorUsed = false,
                seq = 1,
            )
        state.pending = pending
        val replacement = listOf(moveOf(state, "d2d4"))
        val events = state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OVERRULE, replacement), pending)
        assertEquals(listOf("d4"), state.history)
        assertEquals("d2d4", state.lastMove)
        assertEquals(DECIDER_CNN_OVERRULE, state.decisionLog.last().decider)
        assertEquals("CNN overruled the diff move", state.decisionLog.last().reason)
        assertNull(state.pending)
        assertEquals(1, events.filterIsInstance<TrackerEvent.MoveCommitted>().size)
    }

    @Test
    fun verdictWithoutReplacementCommitsThePendingMove() {
        val state = detectState()
        val pending =
            PendingVerify(
                ucis = listOf("e2e4"),
                uci = "e2e4",
                fen = state.board.fen(),
                cur = grayFrame(),
                curBgr = null,
                frames = 1,
                priorUsed = false,
                seq = 1,
            )
        state.pending = pending
        state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pending)
        assertEquals(listOf("e4"), state.history)
        assertEquals(DECIDER_CNN_OCCUPANCY, state.decisionLog.last().decider)
    }

    @Test
    fun verdictAnchorsOnTheCallerSuppliedFrame() {
        // entry.md invariant 5: the recovery path anchors on the OBSERVED frame, never on
        // `lastCur` and not necessarily on the pending candidate's own image.
        val state = detectState()
        val observed = grayFrame()
        val pending =
            PendingVerify(
                ucis = listOf("e2e4"),
                uci = "e2e4",
                fen = state.board.fen(),
                cur = grayFrame(),
                curBgr = null,
                frames = 1,
                priorUsed = false,
                seq = 1,
            )
        state.lastCur = grayFrame()
        state.applyVerdict(
            VerifyVerdict.For(DECIDER_CNN_RECOVERY),
            pending,
            CommitAnchor(observed, null),
        )
        assertSame(observed, state.refGray)
        assertTrue(state.recoveredLast)
    }
}

/** A [ViableMoves] with a single viable candidate at [best] — the shape the quiet branch reads. */
private fun viableOnly(
    move: Move,
    best: Double,
): ViableMoves =
    ViableMoves(
        scored = listOf(move to best),
        viableRaw = listOf(move to best),
        viable = listOf(move to best),
        obsMove = move,
        best = best,
        second = NO_SCORE,
    )
