package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** A resync keeps the history and appends NOTHING: the gap is the record. The latching observation is also
 *  the FIRST vote, so with `desyncObsN = 3` `autoResyncObsN = n` resyncs on seq `3 + n - 1`. */
class ResyncTest {
    private fun alarmedAutoState(votes: Int): Triple<EngineState, RecoveryEvaluator, RecoveryObs> {
        val state =
            EngineState(recoveryConfig().copy(autoResyncObsN = votes), NF3_NO_CASTLING, whitePov = true).armed().underWay()
        val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
        val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
        for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
        check(state.alarm != null) { "precondition: the alarm must be latched" }
        return Triple(state, cnn, obs)
    }

    @Test
    fun autoResyncFiresAfterNConsistentLooksAndKeepsTheHistory() {
        val (state, cnn, obs) = alarmedAutoState(votes = 3)
        val abandoned = state.board.fen()
        val expected = state.cnnAdoptedFen(obs, state.config.cnnConfThr)

        state.cnnTick(cnn, recoverySnap(state, obs, 4))
        assertNotNull(state.alarm, "latch + one more look are two votes, not three")
        assertEquals(abandoned, state.board.fen())

        state.cnnTick(cnn, recoverySnap(state, obs, 5))
        assertNull(state.alarm, "the third consistent look resyncs and releases the latch")
        assertEquals(expected, state.board.fen())
        assertEquals(listOf("Nf3"), state.history, "history is KEPT — the gap is the record")
        // `clearAlarm` appends its own row after the resync's — find ours, exactly one.
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
    fun aPositionWithTheOpponentInCheckIsNeverAdopted() {
        // White to move with BLACK already in check: `legalMoves()` works, the old guard passed it, and the deep
        // search then captured the king — the NEXT move generation died with `Index 64`.
        val state = recoveryState("4k3/8/8/8/8/8/8/4K2R w - - 0 1")
        val obs = obsForBoard(state.board, mapOf("e7" to "wR"))
        assertNull(
            state.cnnAdoptedFen(obs, state.config.cnnConfThr),
            "the side not to move must not be in check — that board is unreachable",
        )
    }

    /** A finished game is still a position the board shows; refusing it stranded the app one ply early. */
    @Test
    fun aMateCanBeAdopted() {
        val state = recoveryState("R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1")
        val fen = state.cnnAdoptedFen(obsForBoard(state.board), state.config.cnnConfThr)
        assertEquals(state.board.fen(), fen)
    }

    @Test
    fun whateverIsAdoptedCanBePlayed() {
        // Chesslib ACCEPTS such a FEN and throws plies later (`Index 64`). The contract is that anything returned
        // can generate moves — asserted over many readings, not one chesslib quirk.
        val state = recoveryState(NF3_NO_CASTLING)
        val readings =
            listOf(
                mapOf("e1" to LABEL_EMPTY, "g1" to "wK"),
                mapOf("e8" to LABEL_EMPTY, "a8" to "bK", "e2" to "wQ"),
                mapOf("d1" to "wK", "e1" to LABEL_EMPTY, "d8" to "bK", "e8" to LABEL_EMPTY),
                mapOf("h1" to "wK", "e1" to LABEL_EMPTY, "h8" to "bK", "e8" to LABEL_EMPTY),
            )
        for (overrides in readings) {
            val fen = state.cnnAdoptedFen(obsForBoard(state.board, overrides), state.config.cnnConfThr)
            if (fen != null) Game(fen).legalMoves() // must not throw — that is the whole guard
        }
    }

    @Test
    fun zeroKeepsTheDoorShut() {
        val state = recoveryState(NF3_NO_CASTLING).underWay()
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

    @Test
    fun aLookThatAgreesWithTheBoardRestartsTheStreak() {
        val (state, cnn, obs) = alarmedAutoState(votes = 4)
        state.cnnTick(cnn, recoverySnap(state, obs, 4))
        assertEquals(2, state.resyncVotes)
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), 5))
        assertEquals(0, state.resyncVotes, "die Stellung, die die App schon fuehrt, widerspricht dem Kandidaten")
    }

    private companion object {
        const val STARTPOS_TEST = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}
