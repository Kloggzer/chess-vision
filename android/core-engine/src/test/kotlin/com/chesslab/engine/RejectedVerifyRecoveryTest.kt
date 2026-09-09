package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The 2026-09-06 f5/Re8 loops: a rejected diff pair must not monopolize the observer. */
class RejectedVerifyRecoveryTest {
    @Test
    fun aCorrectCnnSingleSurvivesRepeatedWrongPairsUsingRawObservations() {
        val cnn = E4Recovery()
        val engine = engine(cnn)
        val state = engine.state
        val raw = e4Observation()
        val conditioned =
            object : CnnObservation by raw {
                override fun rawObservation(): CnnObservation = raw
            }
        repeat(2) { attempt ->
            dispatchPair(state, seq = attempt * 2L + 1)
            repeat(2) { glance ->
                state.nowS += 0.13
                engine.onCnnSnapshot(snapOf(state, conditioned, seq = attempt * 2L + glance + 1))
            }
            if (attempt == 0) {
                assertTrue(state.history.isEmpty(), "one independent recovery vote must not commit")
                assertEquals(1, state.recoveryConfirmer.count)
                assertNull(state.pending)
            }
        }
        assertEquals(listOf("e4"), state.history)
        assertEquals(DECIDER_CNN_RECOVERY, state.decisionLog.last().decider)
        assertEquals(2L, state.cnnReadsTaken, "each terminal rejection gets an independent reading despite cooldown")
        assertSame(raw, cnn.recoveryObs, "recovery must not inherit the candidate's position prior")
    }

    @Test
    fun realRedetectionCannotStarveRecoveryAfterEndpointTimeouts() {
        val cnn = VerifyEvaluator()
        val engine = engine(cnn)
        val state = engine.state
        state.refGray = grayFrame(listOf("e2"))
        val before = state.refGray
        val after = grayFrame(listOf("e4"))
        state.tryDetect(after, null, seq = 1, cnn = cnn)
        val obs = VerifyObs(occupancy = emptyMap(), confidence = emptyMap())
        repeat(40) { i ->
            state.nowS = (i + 1) * 0.13
            engine.onCnnSnapshot(snapOf(state, obs, seq = i + 2L))
            state.tryDetect(after, null, seq = i + 2L, cnn = cnn)
            assertNotNull(state.pending)
        }
        assertEquals(5L, state.cnnReadsTaken)
        assertEquals(5, state.decisionLog.size, "every rejected candidate must remain visible in the timeline")
        assertTrue(state.history.isEmpty(), "inconclusive recovery is no permission to commit")
        assertSame(before, state.refGray)
    }

    @Test
    fun aStaleObservationCannotRejectAPairOrReachRecovery() {
        val engine = engine(E4Recovery())
        val state = engine.state
        dispatchPair(state, seq = 1)
        repeat(2) { i ->
            state.nowS += 0.13
            val snap = snapOf(state, e4Observation(), seq = i + 1L)
            engine.onCnnSnapshot(snap.copy(fen = Game(STARTPOS).also { it.push(state.legalMoveFor("e2e4")!!) }.fen()))
        }
        assertTrue(state.history.isEmpty())
        // The verify seam now rejects the stale input before a terminal verdict can route it
        // into periodic recovery. Neither the candidate nor either vote is consumed.
        assertNotNull(state.pending)
        assertEquals(0, state.pending!!.frames)
        assertEquals(0L, state.cnnReadsStale)
        assertEquals(0L, state.cnnReadsTaken)
        assertEquals(0, state.recoveryConfirmer.count)
    }

    @Test
    fun rawHandEvidenceStillBlocksRecoveryAfterPairRejection() {
        val engine = engine(E4Recovery())
        val state = engine.state
        val clear = e4Observation()
        val hand =
            object : CnnObservation by clear {
                override fun pOccluded(square: String): Double = if (square in setOf("h4", "h5")) 1.0 else 0.0
            }
        val conditioned =
            object : CnnObservation by clear {
                override fun rawObservation(): CnnObservation = hand
            }
        repeat(2) { attempt ->
            dispatchPair(state, seq = attempt * 2L + 1)
            repeat(2) { glance ->
                state.nowS += 0.13
                state.lastMotionTs = state.nowS
                engine.onCnnSnapshot(snapOf(state, conditioned, seq = attempt * 2L + glance + 1))
            }
        }
        assertEquals(2L, state.cnnReadsTaken)
        assertTrue(state.history.isEmpty())
        assertEquals(0, state.recoveryConfirmer.count)
    }

    private fun engine(cnn: CnnEvaluator): TrackerEngine =
        TrackerEngine(detectConfig().copy(windowEndBothEnds = true)).also {
            it.attachCnn(cnn)
            it.state.refGray = grayFrame(listOf("e2", "e7"))
            it.state.refFen = STARTPOS
            it.state.state = STATE_WAITING
            it.state.grayBuf.append(grayFrame(listOf("e4", "e7")))
        }

    private fun dispatchPair(
        state: EngineState,
        seq: Long,
    ) {
        state.dispatch(pairMoves(state, listOf("e2e4", "e7e5")), grayFrame(listOf("e4", "e5")), null, false, null, seq)
    }

    private fun e4Observation(): CnnObservation {
        val actual = Game(STARTPOS)
        actual.push(actual.legalMoves().first { uciOf(it) == "e2e4" })
        return PairObs(Squares.ALL.associateWith { actual.pieceCharAt(it) != null }, Squares.ALL.toSet())
    }
}

/** Fully consistent, confident CNN result for e4, while the diff proposes e4 + e5. */
private class E4Recovery : CnnEvaluator by VerifyEvaluator(deriveMove = "e2e4") {
    var recoveryObs: CnnObservation? = null

    override fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult {
        val board = Game(boardFen)
        val conflicts = Squares.ALL.filter { obs.occupied(it) != (board.pieceCharAt(it) != null) }
        return ResyncResult(conflicts.isEmpty(), conflicts, 64, if (boardFen == STARTPOS) "e2e4" else null, 1.0)
    }

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult = IdentityResult(match = false, inconclusive = false, conflicts = listOf("e2", "e4"))

    override fun deriveMovesDeep(
        boardFen: String,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult {
        recoveryObs = obs
        return DeriveResult(listOf("e2e4"), 1.0, false)
    }
}
