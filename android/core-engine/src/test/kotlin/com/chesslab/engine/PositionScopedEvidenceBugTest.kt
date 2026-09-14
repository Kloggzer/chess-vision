package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PositionScopedEvidenceBugTest {
    @Test
    fun staleSnapshotCannotArbitrateCurrentPositionOcclusion() {
        val engine = TrackerEngine(TrackerConfig())
        val oldFen = engine.state.board.fen()
        val afterE4 = engine.state.board.copy().also { it.push(requireNotNull(engine.state.legalMoveFor("e2e4"))) }.fen()
        engine.setFen(afterE4)
        val state = engine.state
        state.cnnRun = true
        state.nowS = 1.0
        val candidates = ofSquares("a1", "e2", "e4")
        val oldPositionObs =
            PairObs(
                occupancy = mapOf("a1" to true, "e2" to true, "e4" to false),
                sure = setOf("a1", "e2", "e4"),
            )
        state.cnnSnap = snapshotOf(state, oldPositionObs, seq = 20L).copy(fen = oldFen, tsMs = 1_000L)

        assertEquals(
            candidates,
            state.cnnOcclusionFilter(candidates),
            "a fresh-but-old-FEN CNN read must not release current hand candidates as move evidence",
        )
    }

    @Test
    fun staleSnapshotsRejectedAfterSetFenCannotProveAnEarlyCommit() {
        val engine = TrackerEngine(TrackerConfig(commitHoldS = 0.067, earlyCommitObs = 2))
        val oldFen = engine.state.board.fen()
        val afterE4 = engine.state.board.copy().also { it.push(requireNotNull(engine.state.legalMoveFor("e2e4"))) }.fen()
        engine.setFen(afterE4)
        val state = engine.state
        val all = -1L
        val obs =
            PairObs(
                occupancy = mapOf("e7" to false, "e5" to true),
                sure = setOf("e7", "e5"),
            )
        repeat(2) { offset ->
            engine.onCnnSnapshot(snapshotOf(state, obs, seq = 20L + offset).copy(fen = oldFen))
        }
        val move = requireNotNull(state.legalMoveFor("e7e5"))

        assertEquals(2, state.sights.size, "precondition: both stale results entered the sight latch")
        assertFalse(
            state.sightSettled(state.board, move),
            "CNN results rejected for an old FEN must not authorize an early commit in the adopted position",
        )
    }

    @Test
    fun setFenClearsTheRejectedPairLatchEvenWhenTheFenTextIsUnchanged() {
        val engine = TrackerEngine(TrackerConfig())
        val state = engine.state
        val pair = "e2e4 e7e5"
        state.rejectedPair = pair
        state.rejectedPairFen = state.board.fen()

        engine.setFen(state.board.fen())

        assertFalse(
            state.rejectedPair == pair && state.rejectedPairFen == state.board.fen(),
            "a user position reset must not keep suppressing a pair rejected against the discarded reference",
        )
    }

    @Test
    fun baselineResetClearsTheKeepaliveSubsetWithItsParentTaint() {
        val engine = TrackerEngine(TrackerConfig())
        val e4 = bit(Squares.index("e4"))
        engine.state.tainted = e4
        engine.state.keepaliveTainted = e4
        assertTrue(engine.state.keepaliveTainted and engine.state.tainted != 0L)

        engine.captureBaseline()

        assertEquals(
            0L,
            engine.state.keepaliveTainted,
            "a stale keepalive subset can restore pair evidence after its parent taint was cleared",
        )
    }
}
