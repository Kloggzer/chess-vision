package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Sprossen-Wachen, die die Mutationsprobe vom 2026-09-23 ohne Test fand. */
class VerifyLadderGuardTest {
    private fun EngineState.glance(
        cnn: CnnEvaluator,
        obs: CnnObservation,
        seq: Long = 0,
    ): List<TrackerEvent> = VerifySingle.tick(this, cnn, snapOf(this, obs, seq))

    private val exd5Fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

    @Test
    fun anOccupiedCaptureTargetIsNoArrival() {
        // Das Schlagfeld ist vorher wie nachher besetzt: `d5` sicher besetzt beweist nichts.
        val state = pendingState(uci = "e4d5", fen = exd5Fen)
        repeat(2) { state.glance(VerifyEvaluator(), VerifyObs(mapOf("d5" to true), mapOf("d5" to true))) }
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
    }

    @Test
    fun oneReadableTouchedSquareIsNoLocalAgreement() {
        val state = pendingState()
        state.glance(VerifyEvaluator(occAgree = 1.0, occN = 1), VerifyObs(emptyMap(), emptyMap()))
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
    }

    @Test
    fun anOverruleNeedsItsOriginReadEmpty() {
        val state = pendingState()
        val cnn = VerifyEvaluator(deriveMove = "d2d4")
        val originUnread = VerifyObs(mapOf("d4" to true), mapOf("d4" to true))
        repeat(2) { state.glance(cnn, originUnread) }
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun anOverruleNeedsTheAgreementFloor() {
        val state = pendingState()
        val weak = VerifyEvaluator(deriveMove = "d2d4", deriveAgreement = 0.5)
        val read = VerifyObs(mapOf("d2" to false, "d4" to true), mapOf("d2" to true, "d4" to true))
        repeat(2) { state.glance(weak, read) }
        assertEquals(emptyList<String>(), state.history)
    }

    @Test
    fun theModelHandHoldsTheVerdictWithoutCleanCommitsOnly() {
        // h7h5: der Kopf meldete die Hand, das Raster hinkte nach; ohne `cleanCommitsOnly` ist `handHoldsVerdict` der einzige Riegel.
        val state = pendingState().also { it.config = it.config.copy(cleanCommitsOnly = false) }
        val hand = VerifyObs(occluded = setOf("a1", "a2"))
        state.glance(VerifyEvaluator(occAgree = 1.0), hand)
        assertEquals(emptyList<String>(), state.history)
        assertNotNull(state.pending)
    }

    @Test
    fun alternatingPairReadingsCannotOutliveTheVerifyWindow() {
        // shadow und Farbe wechseln sich ab, keine Serie wird voll.
        val state = pairState(verifyWindow = 4)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val colour = PairObs(occupancy = mapOf("e4" to false), sure = setOf("e4"))
        repeat(6) { i ->
            if (state.pending == null) return@repeat
            val (cnn, obs) = if (i % 2 == 0) PairRecovery(match = true) to PairObs() else PairRecovery() to colour
            pairTick(state, cnn, moves, obs)
        }
        assertNull(state.pending, "abwechselnde Lesungen sammeln nie zwei Stimmen -- das Fenster muss trotzdem greifen")
    }

    @Test
    fun aConflictThePairCreatedRejectsItAtTheWindowEnd() {
        val state = pairState(verifyWindow = 3)
        val moves = pairMoves(state, listOf("e2e4", "e7e5"))
        val cnn = ConflictsOnlyAfter(afterFen(state, moves), listOf("d5"))
        repeat(3) { pairTick(state, cnn, moves, PairObs(occupancy = mapOf("e4" to true), sure = setOf("e4"))) }
        assertEquals(emptyList<String>(), state.history)
        assertEquals(listOf("d5"), state.cnnConflicts)
    }

    @Test
    fun aRejectedPairIsNotProposedAgainInTheSamePosition() {
        val state = pairState(verifyWindow = 1)
        pairTick(state, PairRecovery(), pairMoves(state, listOf("e2e4", "e7e5")), PairObs())
        assertNull(state.pending)
        val z = zOf("e2" to HOT, "e4" to HOT, "e7" to HOT, "e5" to HOT)
        val again = state.pairCandidate(z, state.scoreViableMoves(z).best)
        assertEquals(null, again?.moves?.map { uciOf(it) }?.takeIf { it == listOf("e2e4", "e7e5") })
    }

    private class ConflictsOnlyAfter(
        private val afterFen: String,
        private val conflicts: List<String>,
    ) : CnnEvaluator by PairRecovery() {
        override fun resyncCheck(
            boardFen: String,
            obs: CnnObservation,
        ): ResyncResult = ResyncResult(false, if (boardFen == afterFen) conflicts else emptyList(), 0)
    }

    @Test
    fun aRejectedCandidateLeavesNoConfirmerStreak() {
        val state = pendingState()
        state.confirmer = Confirmer(2)
        repeat(2) { state.confirmer.feed("e2e4") }
        val ghost = VerifyObs(mapOf("e4" to false, "e2" to true), mapOf("e4" to true, "e2" to true))
        repeat(2) { state.glance(VerifyEvaluator(), ghost) }
        assertNull(state.pending)
        assertNull(state.confirmer.key, "sonst kaeme der verworfene Kandidat ohne zweiten Frame wieder")
    }
}
