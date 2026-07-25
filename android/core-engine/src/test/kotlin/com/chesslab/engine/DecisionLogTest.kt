package com.chesslab.engine

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.api.commitGates
import com.chesslab.engine.api.toStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** `_DECIDER_REASON` (`tracker.py`) verbatim — the strings are contract, not prose. */
private val PYTHON_DECIDER_REASON =
    mapOf(
        "diff" to "frame-diff (no CNN verify)",
        "diff_pair" to "frame-diff double move (fast play, no CNN verify)",
        "cnn_pair" to "CNN occupancy confirmed double move (fast play)",
        "cnn_occupancy" to "CNN occupancy confirmed",
        "cnn_overrule" to "CNN overruled the diff move",
        "diff_after_verify" to "diff accepted (CNN uncertain, clear view)",
        "cnn_recovery" to "CNN recovery (diff was stuck)",
        "cnn_resync" to "manual CNN resync",
    )

class DecisionLogTest {
    private fun record(ply: Int) =
        DecisionRecord(
            tsS = ply.toDouble(),
            ply = ply,
            move = "e2e4",
            san = "e4",
            fenBefore = null,
            fenAfter = STARTPOS,
            decider = DECIDER_DIFF,
            reason = "r",
            priorUsed = false,
            bestScore = 0.0,
            secondScore = 0.0,
            margin = 0.0,
            changed = emptyList(),
            changedVals = emptyList(),
            shadowVetoed = emptyList(),
            occludedVetoed = emptyList(),
            gridCoverage = 1.0,
            zThr = 3.0,
            motion = 0.0,
            cnnRun = false,
            cnnAgreement = 0.0,
            cnnBestMove = null,
        )

    @Test
    fun decisionLogIsRingCappedAt64() {
        val log = DecisionLog()
        repeat(DECISION_LOG_CAP + 10) { log.add(record(it)) }
        assertEquals(DECISION_LOG_CAP, log.size)
        assertEquals(10, log.first().ply, "the oldest rows are dropped")
        assertEquals(DECISION_LOG_CAP + 9, log.last().ply, "the newest row is kept")
    }

    @Test
    fun decisionLogStillBehavesLikeTheListUndoAndSetFenUse() {
        val log = DecisionLog(cap = 4)
        repeat(3) { log.add(record(it)) }
        log.removeAt(log.size - 1)
        assertEquals(listOf(0, 1), log.map { it.ply })
        log.clear()
        assertTrue(log.isEmpty())
    }

    @Test
    fun decisionReasonMatchesPythonTable() {
        assertEquals(PYTHON_DECIDER_REASON, DECIDER_REASON)
    }

    @Test
    fun priorUsedAppendsTieBreakToReason() {
        val state = detectState()
        val move = state.legalMoveFor("e2e4")!!
        state.commitMove(move, grayFrame(), null, DECIDER_DIFF, priorUsed = true)
        val row = state.decisionLog.last()
        assertEquals("frame-diff (no CNN verify) + prior tie-break", row.reason)
        assertTrue(row.accepted)
    }

    @Test
    fun rejectedCandidatesAreLoggedToo() {
        // Gate 6b, the absolute LL floor: `bestScore` is 0.0 and `commitLlFloor` 2.0.
        val state = detectState(detectConfig(requireMotion = true))
        val cand = Candidate(listOf(state.legalMoveFor("e2e4")!!), priorUsed = false, vote = true)
        assertFalse(state.commitGates(cand))
        val row = state.decisionLog.single()
        assertFalse(row.accepted)
        assertEquals(DECIDER_REJECTED, row.decider)
        assertEquals("e2e4", row.move)
        assertTrue(row.reason.contains("evidence too weak"), row.reason)
    }

    @Test
    fun anIdenticalRepeatedRejectionDoesNotEvictTheRing() {
        val state = detectState(detectConfig(requireMotion = true))
        val cand = Candidate(listOf(state.legalMoveFor("e2e4")!!), priorUsed = false, vote = true)
        repeat(200) { state.commitGates(cand) }
        assertEquals(1, state.decisionLog.size)
    }

    @Test
    fun decisionCarriesNoBitmaps() {
        // Python's `_recent_decisions` keeps warped BGR copies; the phone cannot afford them.
        val forbidden = setOf("byte[]", "int[]", "GrayImage", "BgrImage", "Bitmap")
        val offenders =
            DebugDecision::class.java.declaredFields
                .filter { it.type.simpleName in forbidden }
        assertEquals(emptyList<String>(), offenders.map { it.name })
    }

    @Test
    fun debugPayloadIsNullWhenDisabled() {
        val state = detectState()
        repeat(1000) { assertNull(state.toStatus().debug) }
        assertNotNull(state.toStatus(debugEnabled = true).debug)
    }

    @Test
    fun debugPayloadCarriesTheTaintSetTrackerStatusHasNoRoomFor() {
        val state = detectState()
        state.tainted = ofSquares("d4", "e5")
        val payload = state.toStatus(debugEnabled = true).debug!!
        assertEquals(setOf("d4", "e5"), payload.tainted)
        assertEquals(state.config.zThr, payload.zThr)
        assertTrue(payload.cnnReads.isEmpty(), "no observation has landed yet")
    }

    @Test
    fun debugPayloadReadsSixtyFourCnnSquaresOnceAnObservationLanded() {
        val engine = TrackerEngine(TrackerConfig())
        engine.setDebugEnabled(true)
        val obs = FakeObs(mapOf("e2" to true), setOf("e2"))
        engine.onCnnSnapshot(snapshotOf(engine.state, obs))
        val reads = engine.status().debug!!.cnnReads
        assertEquals(64, reads.size)
        assertEquals("a1", reads.first().square)
        assertEquals('P', reads.single { it.square == "e2" }.believed)
        assertTrue(reads.single { it.square == "e2" }.confident)
    }
}
