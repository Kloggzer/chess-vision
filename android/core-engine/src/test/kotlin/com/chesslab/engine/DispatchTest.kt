package com.chesslab.engine

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.commitGates
import com.chesslab.engine.api.tryDetect
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Shared helpers of the phase-03d tests, mirroring `_make_tracker` (`tests/test_move_tracker.py`).

internal fun detectConfig(
    confirmFrames: Int = 1,
    requireMotion: Boolean = false,
    censusZWeight: Double = 1.0,
    overhang: Double = 0.0,
): TrackerConfig =
    STOPPED_CLOCK_RIG.copy(
        overhang = overhang,
        censusZWeight = censusZWeight,
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
    private val labels: Map<String, String> = emptyMap(),
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

    override fun label(square: String): String? = labels[square]

    override fun conf(square: String): Double = 0.0

    override fun pOccluded(square: String): Double = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

/** Ein LESBARES Brett: seit dem Livelock vom 2026-08-29 verlangt der Desync-Veto `minConfidentBoard` sichere Felder. */
internal fun litObs(
    state: EngineState,
    flips: Map<String, Boolean> = emptyMap(),
    labels: Map<String, String> = emptyMap(),
): FakeObs =
    FakeObs(
        Squares.ALL.associateWith { state.board.pieceCharAt(it) != null } + flips,
        Squares.ALL.toSet(),
        labels,
    )

/** The Bxc3 shape: g1 vacated (believed occupied, read empty) and g3 received. */
internal fun movedPieceObs(state: EngineState): FakeObs =
    litObs(state, mapOf("g1" to false, "g3" to true), mapOf("g1" to "empty", "g3" to "wN"))

internal fun snapshotOf(
    state: EngineState,
    obs: CnnObservation,
    seq: Long = 1,
): CnnSnapshot =
    CnnSnapshot(
        obs = obs,
        seq = seq,
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

/** Step 9 (`_dispatch`) plus gates 6b (LL floor), 7 (motion) and 8 (confirmer). */
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
        // The alarm gate runs before verification, so nothing is queued either.
        val state = detectState(ref = grayFrame(listOf("e2")))
        state.cnnRun = true
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("b1"), null, null)
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertNull(state.pending)
        assertEquals(emptyList<String>(), state.history)
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

    /** `motionRecencyS = 0` means OFF: read as `age > 0` it refused every commit all session (live, 2026-08-01). */
    @Test
    fun aZeroRecencyWindowMeansOffNotAlwaysStale() {
        val config = detectConfig(requireMotion = true).copy(motionRecencyS = 0.0)
        val state = detectState(config, ref = grayFrame(listOf("e2")))
        state.motionSinceRef = true
        state.lastMotionTs = 0.0
        state.nowS = 30.0
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(listOf("e4"), state.history, "note was '${state.note}'")
    }

    @Test
    fun aPositiveRecencyWindowStillGoesStale() {
        val config = detectConfig(requireMotion = true).copy(motionRecencyS = 5.0)
        val state = detectState(config, ref = grayFrame(listOf("e2")))
        state.motionSinceRef = true
        state.lastMotionTs = 0.0
        state.nowS = 30.0
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        assertEquals(emptyList<String>(), state.history)
        assertTrue(state.note.orEmpty().contains("last motion"), "note was '${state.note}'")
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

    // -- the cleanCommitsOnly experiment ---------------------------------------------------------

    /** The strict arm: NO candidate advances while anything reads as a hand — either signal. */
    @Test
    fun cleanCommitsOnlyBlocksWhileAnythingReadsAsAHand() {
        val state = detectState(detectConfig().copy(cleanCommitsOnly = true))
        state.bestScore = 10.0
        val cand = Candidate(listOf(moveOf(state, "e2e4")), priorUsed = false, vote = true)

        state.tainted = ofSquares("a4")
        assertFalse(state.commitGates(cand), "an engine-side occlusion latch is a hand")
        assertTrue(state.note.orEmpty().contains("hand in frame"), "note was '${state.note}'")

        state.tainted = 0L
        state.cnnRun = true
        state.lastMotionTs = state.nowS // the hand arrived — the plausibility filter lets it speak
        val labels = Squares.ALL.associateWith { state.board.labelAt(it) }
        state.cnnSnap = recoverySnap(state, RecoveryObs(labels, occluded = setOf("h4", "h5")), seq = 1)
        assertFalse(state.commitGates(cand), "occluded-reading squares in a fresh glance are a hand")

        state.cnnSnap = recoverySnap(state, RecoveryObs(labels), seq = 2)
        assertTrue(state.commitGates(cand), "clean everywhere — the funnel opens")
    }

    /** AUSGESCHALTET traegt ein Latch nur Felder, nie den ganzen Trichter. Vorgabe ist seit
     *  2026-09-22 AN, der Knopf steht hier also ausdruecklich da. */
    @Test
    fun cleanCommitsOnlyOffLeavesTheFunnelAlone() {
        val state = detectState(detectConfig().copy(cleanCommitsOnly = false))
        state.bestScore = 10.0
        state.tainted = ofSquares("a4")
        assertTrue(
            state.commitGates(Candidate(listOf(moveOf(state, "e2e4")), priorUsed = false, vote = true)),
            "the shipped behaviour tolerates a hand at the funnel",
        )
    }

    /** A hand-glance may neither confirm nor reject a pending — alive, but silent. */
    @Test
    fun cleanCommitsOnlyHandGlanceDoesNotVote() {
        val state = pendingState()
        state.config = state.config.copy(cleanCommitsOnly = true)
        state.nowS = 5.0
        state.lastMotionTs = state.nowS // arrival motion — the filter lets the head speak
        val labels = Squares.ALL.associateWith { state.board.labelAt(it) }
        val hand = RecoveryObs(labels, occluded = setOf("h4", "h5"))

        val events = VerifySingle.tick(state, VerifyEvaluator(), snapOf(state, hand, seq = 1))

        assertTrue(events.isEmpty())
        assertNotNull(state.pending, "the candidate survives — nothing was decided")
        assertEquals(0, state.pending!!.voteCount, "a covered glance is not a vote")
        assertEquals(5.0, state.pending!!.lastTickS, "but the observer is ALIVE — no stall expiry")
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
        // White-on-white: e2 (z 2.5), e4 (z 1.5) keep e2e4 viable at LL -2.0, between the floor (-4) and 0.
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
        // Bxc3 incident: a confident e2 EMPTY against the believed pawn vetoes the quiet re-anchor.
        val ref = grayFrame()
        val state = detectState(ref = ref)
        state.cnnRun = true
        state.cnnSnap = snapshotOf(state, litObs(state, mapOf("e2" to false)))
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

    /** S17-SIM-2: a WRONG CNN leaves recovery nothing to find; named observations alarm, never re-anchor (Bxc3). */
    @Test
    fun persistentCnnMisreadEscalatesVetoToAlarm() {
        val ref = grayFrame()
        // A ply on the record: the alarm may not latch before the first commit (`Alarm.alarmable`).
        val state = detectState(ref = ref).underWay()
        state.cnnRun = true
        val cnn = RecoveryEvaluator(guess = "g1g3")
        val obs = movedPieceObs(state)
        for (seq in 1L..2L) {
            state.cnnSnap = snapshotOf(state, obs, seq)
            state.tryDetect(grayFrame(), null, seq, cnn)
            assertNull(state.alarm)
            assertEquals("cnn_desync", state.stuckReason)
            assertSame(ref, state.refGray, "re-anchored over a CNN-confirmed desync")
            assertTrue(state.note.orEmpty().contains("holding reference for"), "note was '${state.note}'")
        }
        state.cnnSnap = snapshotOf(state, obs, seq = 3)
        val events = state.tryDetect(grayFrame(), null, seq = 3, cnn = cnn)

        assertEquals(listOf("g1", "g3"), state.alarm?.conflicts)
        assertTrue(events.any { it is TrackerEvent.Alarm })
        assertSame(ref, state.refGray, "the alarm must not be an excuse to re-anchor")
    }

    /** The same snapshot re-evaluated must not advance the streak (seq contract, Spec 11). */
    @Test
    fun desyncStreakNeedsDistinctObservations() {
        val state = detectState(ref = grayFrame())
        state.cnnRun = true
        val cnn = RecoveryEvaluator(guess = "g1g3")
        val obs = movedPieceObs(state)
        repeat(5) {
            state.cnnSnap = snapshotOf(state, obs, seq = 7)
            state.tryDetect(grayFrame(), null, seq = 7, cnn = cnn)
        }

        assertNull(state.alarm)
        assertEquals(1, state.desyncObs)
    }

    /** Measured on the clips: unnamed desyncs alarmed falsely (blender-promocapture, blender-shadowsweep). */
    @Test
    fun unnamedDesyncNeverAlarms() {
        val ref = grayFrame()
        val state = detectState(ref = ref)
        state.cnnRun = true
        val cnn = RecoveryEvaluator(guess = null)
        val obs = litObs(state, mapOf("g1" to false), mapOf("g1" to "empty"))
        for (seq in 1L..5L) {
            state.cnnSnap = snapshotOf(state, obs, seq)
            state.tryDetect(grayFrame(), null, seq, cnn)
        }

        assertNull(state.alarm)
        assertEquals("cnn_desync", state.stuckReason)
        assertSame(ref, state.refGray)
    }

    /** Livelock 2026-08-29: EIN sicheres Feld vetote auf dunklem Brett, 25 Minuten `cnn_desync` ohne Alarm. */
    @Test
    fun blindGlanceCannotVetoTheQuietReanchor() {
        val ref = grayFrame()
        val state = detectState(fen = NF3_NO_CASTLING, ref = ref)
        state.history.add("Nf3")
        state.cnnRun = true
        state.nowS = 100.0
        val obs = FakeObs(mapOf("e4" to true), setOf("e4"))
        val cnn = RecoveryEvaluator(match = false, conflicts = listOf("e4")).apply { inconclusive = true }
        var events = emptyList<TrackerEvent>()
        repeat(40) { i ->
            state.nowS += 0.7
            val snap = snapshotOf(state, obs, seq = i + 1L)
            state.cnnSnap = snap
            state.cnnTick(cnn, snap)
            events = state.tryDetect(grayFrame(), null, seq = i + 1L)
        }

        assertNull(state.stuckReason, "one confident square on a dark board must not veto")
        assertTrue(events.any { it is TrackerEvent.ReAnchored }, "the quiet frame must re-anchor")
        assertNotSame(ref, state.refGray)
        assertEquals(0, state.desyncObs)
    }

    /** Die Gegenprobe: ein LESBARES Brett vetot weiter, sonst waere der Bxc3-Schutz weg. */
    @Test
    fun litBoardStillVetoesTheReanchor() {
        val ref = grayFrame()
        val state = detectState(fen = NF3_NO_CASTLING, ref = ref)
        state.cnnRun = true
        state.cnnSnap = snapshotOf(state, litObs(state, mapOf("e4" to true)))
        state.tryDetect(grayFrame(), null, seq = 1)

        assertEquals("cnn_desync", state.stuckReason)
        assertSame(ref, state.refGray)
    }

    @Test
    fun gamutRebuildHappensOnlyOnQuietReanchor() {
        val state = detectState(ref = grayFrame())
        state.refBgr = bgrFrame()
        assertNull(state.refGamut)
        state.tryDetect(grayFrame(), bgrFrame(), seq = 1)
        val rebuilt = requireNotNull(state.refGamut) { "the quiet re-anchor rebuilds the colour gamut" }
        // Invariant 6: a commit-time reference may carry hand residue.
        state.setRef(grayFrame(), bgrFrame(level = 200), fromCommit = true)
        assertSame(rebuilt, state.refGamut)
    }

    @Test
    fun cnnOverruleReplacementMoveIsExpressible() {
        // entry.md invariant 10 / specs/12 D3: the REPLACEMENT move commits in the same cycle.
        val state = detectState()
        val cur = grayFrame()
        val pending = e2e4Pending(state, cur = cur)
        state.pending = pending
        val replacement = listOf(moveOf(state, "d2d4"))
        val events = state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OVERRULE, replacement), pending)
        assertEquals(listOf("d4"), state.history)
        assertEquals("d2d4", state.lastMove)
        assertEquals(DECIDER_CNN_OVERRULE, state.decisionLog.last().decider)
        assertEquals("frame-diff read a different move — CNN occupancy overruled it", state.decisionLog.last().reason)
        assertNull(state.pending)
        assertEquals(1, events.filterIsInstance<TrackerEvent.MoveCommitted>().size)
    }

    @Test
    fun theCommittedRowKeepsTheVetoesFromTheLiftingFrame() {
        // Der echte Weg, nicht `decisionRow` direkt: `applyVerdict` loescht `pending`, BEVOR
        // `commitMove` seine Zeile schreibt (Astra, 2026-09-22).
        val state = detectState()
        state.shadowVetoed = bit(Squares.index("g1"))
        state.occludedVetoed = bit(Squares.index("h1"))
        val pending = e2e4Pending(state, shadowAtLift = state.shadowVetoed, occludedAtLift = state.occludedVetoed)
        state.pending = pending
        state.shadowVetoed = bit(Squares.index("e1")) or bit(Squares.index("f1"))
        state.occludedVetoed = bit(Squares.index("f2"))
        state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pending)
        val row = state.decisionLog.last()
        assertEquals(DECIDER_CNN_OCCUPANCY, row.decider)
        assertEquals(listOf("g1"), row.shadowVetoed)
        assertEquals(listOf("h1"), row.occludedVetoed)
    }

    @Test
    fun theNextRowAfterACommitIsNoLongerTheLiftingFrames() {
        // Genau EINE Zeile erbt den Spruch der Leiter, wie bei `verdictOutcome`.
        val state = detectState()
        state.shadowVetoed = bit(Squares.index("g1"))
        val pending = e2e4Pending(state, shadowAtLift = state.shadowVetoed)
        state.pending = pending
        state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pending)
        state.shadowVetoed = bit(Squares.index("a1"))
        assertEquals(listOf("a1"), state.decisionRow(DECIDER_CNN_OCCUPANCY, "danach").shadowVetoed)
    }

    @Test
    fun withoutAPendingCandidateTheDecisionRowIsThisFrames() {
        val state = detectState()
        state.shadowVetoed = bit(Squares.index("e1"))
        assertEquals(listOf("e1"), state.decisionRow(DECIDER_CNN_OCCUPANCY, "irgendein Grund").shadowVetoed)
    }

    @Test
    fun verdictWithoutReplacementCommitsThePendingMove() {
        val state = detectState()
        val pending = e2e4Pending(state)
        state.pending = pending
        state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pending)
        assertEquals(listOf("e4"), state.history)
        assertEquals(DECIDER_CNN_OCCUPANCY, state.decisionLog.last().decider)
    }

    @Test
    fun verdictAnchorsOnTheCallerSuppliedFrame() {
        // entry.md invariant 5: anchored on the OBSERVED frame, not `lastCur` nor the pending's image.
        val state = detectState()
        val observed = grayFrame()
        val pending = e2e4Pending(state)
        state.lastCur = grayFrame()
        state.applyVerdict(
            VerifyVerdict.For(DECIDER_CNN_RECOVERY),
            pending,
            CommitAnchor(observed, null),
        )
        assertSame(observed, state.refGray)
        assertTrue(state.recoveredLast)
    }

    private fun e2e4Pending(
        state: EngineState,
        cur: GrayImage = grayFrame(),
        shadowAtLift: Long = 0L,
        occludedAtLift: Long = 0L,
    ) = PendingVerify(
        ucis = listOf("e2e4"),
        uci = "e2e4",
        fen = state.board.fen(),
        cur = cur,
        curBgr = null,
        frames = 1,
        priorUsed = false,
        seq = 1,
        shadowVetoedAtLift = shadowAtLift,
        occludedVetoedAtLift = occludedAtLift,
    )
}
