package com.chesslab.engine

import com.chesslab.engine.api.cnnAdoptedFen
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * specs/37 phase 02 — a resync adopts the observed position, keeps the history, and appends
 * NOTHING: the gap is the record. The auto arm is a replay instrument (`autoResyncObsN`, 0 = off
 * everywhere by default) and these tests drive it through `cnnTick`, the path a replay uses.
 *
 * Timing contract (see `maybeAutoResync`'s KDoc): the observation that latches the alarm is also
 * the FIRST vote — latch and vote run in the same tick. With `desyncObsN = 3` the latch lands on
 * seq 3, so `autoResyncObsN = n` resyncs on seq `3 + n - 1`.
 */
class ResyncTest {
    /** Alarm latched at seq 3 (`desyncObsN`), auto arm set to [votes] consistent looks. */
    private fun alarmedAutoState(votes: Int): Triple<EngineState, RecoveryEvaluator, RecoveryObs> {
        val state =
            EngineState(recoveryConfig().copy(autoResyncObsN = votes), NF3_NO_CASTLING, whitePov = true).armed()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        check(state.alarm != null) { "precondition: the alarm must be latched" }
        return Triple(state, cnn, obs)
    }

    @Test
    fun autoResyncFiresAfterNConsistentLooksAndKeepsTheHistory() {
        val (state, cnn, obs) = alarmedAutoState(votes = 3)
        state.history.add("Nf3")
        val abandoned = state.board.fen()
        val expected = state.cnnAdoptedFen(obs, state.config.cnnConfThr)

        state.cnnTick(cnn, recoverySnap(state, obs, 4))
        assertNotNull(state.alarm, "latch + one more look are two votes, not three")
        assertEquals(abandoned, state.board.fen())

        state.cnnTick(cnn, recoverySnap(state, obs, 5))
        assertNull(state.alarm, "the third consistent look resyncs and releases the latch")
        assertEquals(expected, state.board.fen())
        assertEquals(listOf("Nf3"), state.history, "history is KEPT — the gap is the record")
        // `clearAlarm` appends its own provenance row after the resync's — find ours, exactly one.
        val row = state.decisionLog.single { it.decider == DECIDER_CNN_RESYNC }
        assertNull(row.san, "a resync is not a ply — no consumer may count it as one")
        assertEquals(abandoned, row.fenBefore)
        assertEquals(expected, row.fenAfter)
        assertTrue(row.accepted)
        assertNull(state.refGray, "the reference is stale by definition after a resync")
    }

    @Test
    fun aHandSignalPausesTheStreakInsteadOfResettingIt() {
        val (state, cnn, obs) = alarmedAutoState(votes = 4)
        state.cnnTick(cnn, recoverySnap(state, obs, 4))
        assertEquals(2, state.resyncVotes, "latch vote + one")

        state.tainted = 1L
        state.cnnTick(cnn, recoverySnap(state, obs, 5))
        assertEquals(2, state.resyncVotes, "a covered board is a NON-observation — the streak pauses")
        state.tainted = 0L

        state.cnnTick(cnn, recoverySnap(state, obs, 6))
        assertNotNull(state.alarm, "three votes are not four")
        state.cnnTick(cnn, recoverySnap(state, obs, 7))
        assertNull(state.alarm, "the paused streak resumes and completes")
    }

    @Test
    fun aDifferentCleanCandidateRestartsTheStreakAtOne() {
        val (state, cnn, obs) = alarmedAutoState(votes = 4)
        state.cnnTick(cnn, recoverySnap(state, obs, 4))
        assertEquals(2, state.resyncVotes)
        val other = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK", "a2" to LABEL_EMPTY))
        state.cnnTick(cnn, recoverySnap(state, other, 5))
        assertEquals(1, state.resyncVotes, "a DIFFERENT clean candidate is contradiction — restart at one")
    }

    @Test
    fun oneSnapshotOneVote() {
        val (state, cnn, obs) = alarmedAutoState(votes = 3)
        repeat(5) { state.cnnTick(cnn, recoverySnap(state, obs, 3)) }
        assertEquals(1, state.resyncVotes, "a re-fed snapshot must not vote twice")
        assertNotNull(state.alarm)
    }

    @Test
    fun anObservationWithoutIdentityNeverVotes() {
        val (state, cnn, _) = alarmedAutoState(votes = 3)
        val blind = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"), identity = false)
        for (seq in 10L..20L) state.cnnTick(cnn, recoverySnap(state, blind, seq))
        assertNotNull(state.alarm, "silently resyncing to an occupancy-only reading is forbidden (specs/37-02)")
        assertEquals(NF3_NO_CASTLING, state.board.fen())
    }

    @Test
    fun zeroKeepsTheDoorShut() {
        val state = recoveryState(NF3_NO_CASTLING)
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        val before = state.board.fen()
        for (seq in 1L..20L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        assertNotNull(state.alarm, "the default is a DOOR: no auto-resync ever, however long the standoff")
        assertEquals(before, state.board.fen())
    }

    @Test
    fun performResyncMirrorsSetFenExceptTheTwoThatAreThePhase() {
        val state = recoveryState(NF3_NO_CASTLING)
        state.history.add("e4")
        state.history.add("d5")
        state.recordRejection("x", "seed row")
        val rows = state.decisionLog.size
        state.performResync(STARTPOS_TEST, how = "user")
        assertEquals(listOf("e4", "d5"), state.history)
        assertEquals(rows + 1, state.decisionLog.size, "exactly one row records the resync")
        assertNotEquals(NF3_NO_CASTLING, state.board.fen())
        assertNull(state.stuckReason, "a resync clears the stuck latch")
        assertTrue(state.note!!.contains("RESYNC"), state.note!!)
    }

    private companion object {
        const val STARTPOS_TEST = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}
