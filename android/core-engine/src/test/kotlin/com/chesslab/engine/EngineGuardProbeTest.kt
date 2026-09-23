package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.clearReferenceState
import com.chesslab.engine.api.commitGates
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Wachen ausserhalb der Leiter, die die Mutationsprobe vom 2026-09-23 ohne Test fand. */
class EngineGuardProbeTest {
    private fun EngineState.move(uci: String) = requireNotNull(legalMoveFor(uci))

    // -- Dispatch / Commit ------------------------------------------------------------------------

    @Test
    fun theAlarmGateDropsTheConfirmerStreak() {
        val state = detectState()
        state.confirmer = Confirmer(2)
        state.confirmer.feed("e2e4")
        state.alarm = TrackerEvent.Alarm(ALARM_ILLEGAL_MOVE, listOf("e4"), null, null)
        state.dispatch(listOf(state.move("e2e4")), grayFrame(), null, false, null, 1)
        assertEquals(0, state.confirmer.count, "sonst reicht nach dem Loesen EIN Frame")
    }

    @Test
    fun dispatchFreezesBothVetoesAtTheLift() {
        // Der echte Weg: `dispatch` friert ein, nicht eine Fixture, die `PendingVerify` selbst baut.
        val state = detectState().also { it.cnnRun = true }
        state.shadowVetoed = bit(Squares.index("g1"))
        state.occludedVetoed = bit(Squares.index("h1"))
        state.dispatch(listOf(state.move("e2e4")), grayFrame(), null, false, null, 1)
        val pend = requireNotNull(state.pending)
        state.shadowVetoed = bit(Squares.index("f1"))
        state.occludedVetoed = bit(Squares.index("f2"))
        state.applyVerdict(VerifyVerdict.For(DECIDER_CNN_OCCUPANCY), pend)
        val row = state.decisionLog.last()
        assertEquals(listOf("g1"), row.shadowVetoed)
        assertEquals(listOf("h1"), row.occludedVetoed)
    }

    @Test
    fun aCommitRestartsTheAnomalyTimers() {
        val state = detectState()
        val a3 = Squares.index("a3")
        state.nowS = 10.0
        state.anomalySince = bit(a3)
        state.anomalyStart[a3] = 1.0
        state.commitMove(state.move("e2e4"), grayFrame(), null)
        state.nowS = 10.5
        state.changed = bit(a3)
        state.trackAnomalies()
        assertEquals(10.5, state.anomalyStart[a3], "der Zeitgeber gehoert zur Referenz, die der Commit verliess")
    }

    // -- Guards / Taint -------------------------------------------------------------------------------

    @Test
    fun aStuckReasonIsLoggedOnceEvenWithARowInBetween() {
        val state = detectState()
        state.markStuck("occluded")
        state.recordRejection("e2e4", "evidence too weak")
        state.markStuck("occluded")
        assertEquals(1, state.decisionLog.count { it.reason == "STUCK occluded" })
    }

    @Test
    fun theVetoSetAloneIsAHandInFrame() {
        val state = detectState()
        state.occludedVetoed = bit(Squares.index("e4"))
        assertTrue(state.handInFrame())
    }

    @Test
    fun aSightExcludesWhatTheModelReadsAsCovered() {
        val state = detectState()
        state.recordSight(snapOf(state, VerifyObs(occluded = setOf("e4"))))
        val visible = state.sights.last().visible
        assertFalse(visible.has(Squares.index("e4")))
    }

    @Test
    fun anUnreadOriginIsNotASettledSight() {
        // Ein unsicheres Feld traegt kein `occupied`-Bit und saehe sonst wie "leer" aus.
        val state = detectState()
        val e2 = Squares.index("e2")
        val e4 = bit(Squares.index("e4"))
        repeat(2) { state.sights.addLast(SquareSight(it.toLong(), visible = -1L, confident = (-1L).without(bit(e2)), occupied = e4)) }
        assertFalse(state.sightSettled(state.board.copy(), state.move("e2e4")))
    }

    @Test
    fun anIdentityReadBelowItsOwnThresholdKeepsTheSquareAnOccluder() {
        val state = EngineState(recoveryConfig().copy(taintIdentityThr = 0.9), STARTPOS, whitePov = true).armed()
        val labels = Squares.ALL.associateWith { state.board.labelAt(it) } + ("c8" to "wR")
        state.cnnSnap = recoverySnap(state, RecoveryObs(labels, confidence = 0.87), seq = 1, tsMs = 1_000_000L)
        assertEquals(bit(Squares.index("c8")), state.cnnOcclusionFilter(bit(Squares.index("c8"))))
    }

    // -- Alarm / CnnTick ------------------------------------------------------------------------------

    @Test
    fun alarmDeferObsPostponesTheLatch() {
        val state = EngineState(recoveryConfig().copy(alarmDeferObs = 2), NF3_NO_CASTLING, whitePov = true).armed().underWay()
        val cnn = RecoveryEvaluator(guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..4L) state.desyncEvidence(cnn, recoverySnap(state, obs, seq), listOf("e1", "g1"))
        assertNull(state.alarm, "desyncObsN + alarmDeferObs = 5")
        state.desyncEvidence(cnn, recoverySnap(state, obs, 5), listOf("e1", "g1"))
        assertNotNull(state.alarm)
    }

    @Test
    fun theDesyncStreakTakesTheResyncStreakWithIt() {
        val state = recoveryState()
        state.resyncFen = NF3_NO_CASTLING
        state.resyncVotes = 2
        state.clearDesyncStreak()
        assertNull(state.resyncFen)
        assertEquals(0, state.resyncVotes)
    }

    @Test
    fun aMatchAfterARejectedVerifyDoesNotReAnchor() {
        val state = recoveryState()
        val ref = grayFrame()
        state.refGray = ref
        val snap = recoverySnap(state, obsForBoard(state.board), 1, grayFrame())
        state.cnnTick(RecoveryEvaluator(match = true), snap, afterRejectedVerify = true)
        assertSame(ref, state.refGray, "der Spruch hat schon auf dem Kandidaten-Frame verankert (Invariante 5)")
    }

    @Test
    fun aMatchWithoutAStuckTrackerPullsNothingForward() {
        val state = recoveryState().also { it.clearStuck() }
        val ref = grayFrame()
        state.refGray = ref
        repeat(2) { state.grayBuf.append(grayFrame()) }
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), 1, grayFrame()))
        assertEquals(1L, state.cnnReadsTaken, "Vorbedingung: die Lesung lief")
        assertSame(ref, state.refGray)
        assertNotEquals(VERIFY_STATE_RESYNCED, state.verifyState)
    }

    @Test
    fun anOpenDesyncStreakIsEvaluatedWithoutAnyOtherGate() {
        val state = recoveryState().also { it.clearStuck() }
        state.desyncObs = 1
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), 1))
        assertEquals(1L, state.cnnReadsTaken)
    }

    @Test
    fun aSingleRawHeadFlagRefusesTheRecoveryVote() {
        // Ohne Formfilter ist EIN Feld moeglich; die Grenze 0 muss dort greifen, nicht erst bei 2.
        val state = EngineState(recoveryConfig().copy(modelHandShapeFilter = false), STARTPOS, whitePov = true).armed()
        val labels = Squares.ALL.associateWith { state.board.labelAt(it) } + mapOf("e2" to LABEL_EMPTY, "e4" to "wP")
        val cnn = RecoveryEvaluator(conflicts = listOf("e2", "e4"), moves = listOf("e2e4"))
        state.cnnTick(cnn, recoverySnap(state, RecoveryObs(labels, occluded = setOf("a7")), 1))
        assertEquals(0, state.recoveryConfirmer.count)
    }

    @Test
    fun aStaleReadDropsTheOpenRecoveryVote() {
        val state = recoveryState()
        state.recoveryConfirmer.feed("e2e4")
        state.cnnTick(RecoveryEvaluator(), recoverySnap(state, obsForBoard(state.board), 1, fen = NF3_NO_CASTLING))
        assertEquals(0, state.recoveryConfirmer.count)
    }

    // -- TrackerEngine / EngineState ------------------------------------------------------------------

    @Test
    fun aLatchedHandBlocksTheQuietReAnchor() {
        val ref = grayFrame()
        val state = detectState(ref = ref)
        val a3 = Squares.index("a3")
        state.nowS = 10.0
        state.tainted = bit(a3)
        state.taintExpiry[a3] = 1e9
        val events = state.tryDetect(grayFrame(), null, seq = 1)
        assertSame(ref, state.refGray, "die Hand darf nicht in die Referenz")
        assertTrue(events.none { it is TrackerEvent.ReAnchored })
        assertEquals("occluded", state.stuckReason)
    }

    @Test
    fun aSnapshotOfAnotherPositionCannotVetoTheReAnchor() {
        val state = detectState().also { it.cnnRun = true }
        state.nowS = 100.0
        state.cnnSnap = snapshotOf(state, movedPieceObs(state)).copy(fen = NF3_NO_CASTLING)
        val events = state.tryDetect(grayFrame(), null, seq = 1)
        assertTrue(events.any { it is TrackerEvent.ReAnchored })
        assertNull(state.stuckReason)
    }

    @Test
    fun clearReferenceStateDropsTheTaintLatch() {
        val state = detectState()
        state.tainted = bit(Squares.index("e4"))
        state.clearReferenceState()
        assertEquals(0L, state.tainted)
    }

    @Test
    fun aDiscardedReferenceDropsTheBuffersAndTheSnapshot() {
        // Gleiche Groesse, andere Ebene (CLAHE, Rektifizierung): `PlaneMean` merkt das nicht selbst.
        val state = detectState()
        state.grayBuf.append(grayFrame())
        state.bgrBuf.append(bgrFrame())
        state.cnnSnap = snapOf(state, VerifyObs())
        state.discardVisualReference()
        assertEquals(0, state.grayBuf.size)
        assertEquals(0, state.bgrBuf.size)
        assertNull(state.cnnSnap)
    }

    @Test
    fun aRefusedStreakRestartsOnADifferentCandidate() {
        val state = detectState()
        state.bestScore = 0.5
        assertFalse(state.commitGates(Candidate(listOf(state.move("e2e4")), priorUsed = false, vote = true)))
        assertFalse(state.commitGates(Candidate(listOf(state.move("d2d4")), priorUsed = false, vote = true)))
        assertEquals(1, state.refusedStreak)
    }

    @Test
    fun setFenDropsTheDesyncStreakWithoutALatch() {
        val engine = TrackerEngine(recoveryConfig())
        engine.state.desyncObs = 2
        engine.setFen(NF3_NO_CASTLING)
        assertEquals(0, engine.state.desyncObs)
    }

    // -- Promotion ------------------------------------------------------------------------------------

    private val promotionFen = "8/P6k/8/8/8/8/7K/8 w - - 0 1"

    private fun promotionPending(): TrackerEngine {
        val engine = TrackerEngine(detectConfig(), promotionFen)
        engine.attachCnn(RecoveryEvaluator())
        engine.state.refGray = grayFrame(listOf("a7"))
        engine.state.refFen = engine.state.board.fen()
        engine.state.tryDetect(grayFrame(listOf("a8")), null, seq = 1)
        check(engine.state.promoPending != null) { "Vorbedingung: die Frage steht" }
        return engine
    }

    private fun a8Reads(
        label: String,
        confidence: Double = 0.99,
        occluded: Set<String> = emptySet(),
    ) = RecoveryObs(Squares.ALL.associateWith { if (it == "a8") label else LABEL_EMPTY }, confidence = confidence, occluded = occluded)

    @Test
    fun aGlanceAtAnotherPositionCannotWithdrawThePrompt() {
        val engine = promotionPending()
        val empty = RecoveryObs(Squares.ALL.associateWith { if (it == "a7") "wP" else LABEL_EMPTY })
        for (seq in 2L..3L) engine.onCnnSnapshot(recoverySnap(engine.state, empty, seq, fen = NF3_NO_CASTLING))
        assertNotNull(engine.state.promoPending)
    }

    @Test
    fun aCoveredTargetCastsNoPromotionVote() {
        val engine = promotionPending()
        for (seq in 2L..3L) engine.onCnnSnapshot(recoverySnap(engine.state, a8Reads("wN", occluded = setOf("a8")), seq))
        assertEquals(emptyList<String>(), engine.state.history)
    }

    @Test
    fun anUnsureIdentityCastsNoPromotionVote() {
        val engine = promotionPending()
        for (seq in 2L..3L) engine.onCnnSnapshot(recoverySnap(engine.state, a8Reads("wN", confidence = 0.87), seq))
        assertEquals(emptyList<String>(), engine.state.history)
    }

    @Test
    fun aPieceReadBreaksTheEmptyStreak() {
        val engine = promotionPending()
        engine.onCnnSnapshot(recoverySnap(engine.state, a8Reads(LABEL_EMPTY), 2))
        engine.onCnnSnapshot(recoverySnap(engine.state, a8Reads("wN"), 3))
        engine.onCnnSnapshot(recoverySnap(engine.state, a8Reads(LABEL_EMPTY), 4))
        assertNotNull(engine.state.promoPending, "leer, Springer, leer sind keine zwei Leer-Stimmen")
    }
}
