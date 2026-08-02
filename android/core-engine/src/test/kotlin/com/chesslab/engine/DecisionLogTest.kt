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
        "diff" to "frame-diff — UNVERIFIED, no CNN was available",
        "diff_pair" to "frame-diff double move (fast play) — UNVERIFIED, no CNN was available",
        "cnn_pair" to "frame-diff double move (fast play), confirmed by CNN occupancy",
        "cnn_occupancy" to "frame-diff, confirmed by CNN occupancy",
        "cnn_overrule" to "frame-diff read a different move — CNN occupancy overruled it",
        "diff_after_verify" to "frame-diff, accepted unconfirmed after the CNN stayed uncertain with a clear view of both squares",
        "cnn_recovery" to "position was LOST — rebuilt by the CNN, not detected",
        "cnn_resync" to "manual resync by the user",
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
        assertEquals("frame-diff — UNVERIFIED, no CNN was available + prior tie-break", row.reason)
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

    /**
     * The rejected rows are the ones worth logging, and they are the ones nobody was reading.
     *
     * On 2026-08-01 a live board sat in a mismatch cycle on a legitimate `Qxd4` and the question
     * "did the deterministic path see d4 change at all?" was unanswerable — the app emitted three
     * log tags, none of them the engine's, and these rows lived only in an in-memory ring behind a
     * debug switch that was off. A commit-only log is the half that is never in doubt.
     */
    @Test
    fun everyDecisionReachesTheSinkIncludingTheRejections() {
        val lines = mutableListOf<String>()
        val log = DecisionLog(sink = { lines += it.toLogLine() })
        log.add(record(1))
        assertEquals(1, lines.size)
        assertTrue(lines.single().startsWith("ply=1 COMMIT e2e4 (e4)"), lines.single())

        val state = detectState(detectConfig(requireMotion = true))
        val seen = mutableListOf<String>()
        state.decisionLog.clear()
        val mirrored = DecisionLog(sink = { seen += it.toLogLine() })
        val cand = Candidate(listOf(state.legalMoveFor("e2e4")!!), priorUsed = false, vote = true)
        state.commitGates(cand)
        state.decisionLog.forEach(mirrored::add)
        assertTrue(seen.single().startsWith("ply=0 REJECT e2e4"), seen.single())
        assertTrue(seen.single().contains("evidence too weak"), seen.single())
    }

    /**
     * The verify ladder's rejections must leave a row.
     *
     * This is where a legitimate move most plausibly dies: `windowEnd`'s whole-board contradiction
     * test rejects on ANY conflicting square, anywhere, touched or not, while the recovery path
     * that then takes the move over tolerates 1-2 wrong squares (`minAgreement 0.97`). One
     * chronically misread square therefore blocks the diff channel and does not block recovery —
     * and until this row existed, the rejection wrote only a `note` that the next frame overwrote.
     */
    @Test
    fun theVerifyLadderRecordsWhyItDiscardedACandidate() {
        // Window of 1, then one glance in which nothing is confident: the ladder's occlusion
        // timeout, which is the cheapest of its rejection paths to drive.
        val state = pairState(ucis = listOf("e2e4"), verifyWindow = 1)
        val events = VerifySingle.tick(state, PairRecovery(), snapshotOf(state, FakeObs(emptyMap(), emptySet())))

        assertTrue(events.isEmpty(), "a rejected candidate emits no move")
        assertNull(state.pending, "the candidate was discarded")
        val row = state.decisionLog.last()
        assertFalse(row.accepted, "the verify ladder wrote no rejection row")
        assertEquals("e2e4", row.move)
        assertTrue(row.toLogLine().startsWith("ply=0 REJECT e2e4"), row.toLogLine())
    }

    /**
     * An observation about an OLDER frame is an observer that answered, not one that died.
     *
     * `expireStalledVerify`'s own KDoc calls itself "a watchdog for an observer that STOPPED, not
     * one that is merely slow", and delegates the slow case to `verifyExpired` inside the ladder.
     * The ladder is only reached past the seq gate, so the two were swapped: on a warm phone, where
     * an observation cycle can exceed the 1.5 s budget, every diff candidate was dropped as stalled
     * and only CNN recovery — which has no deadline — could still move the game on.
     */
    @Test
    fun aStaleObservationKeepsThePendingAliveWithoutVoting() {
        val state = pairState(ucis = listOf("e2e4"), verifyWindow = 8)
        val pend = requireNotNull(state.pending).copy(seq = 5, lastTickS = 0.0)
        state.pending = pend
        state.nowS = 1.0

        val snap = snapshotOf(state, FakeObs(emptyMap(), emptySet())).copy(seq = 4)
        VerifySingle.tick(state, PairRecovery(), snap)

        val after = requireNotNull(state.pending)
        assertEquals(pend.frames, after.frames, "a stale observation must not count as a vote")
        assertEquals(1.0, after.lastTickS, "…but it proves the observer is alive")

        // And the watchdog would have killed it at the old value. 1.6, not 1.4: the watchdog is
        // `nowS - lastTickS < verifyTimeoutS` with `verifyTimeoutS = 1.5`, so at 1.4 the pending
        // survives on the OLD `lastTickS = 0.0` as well and the assertion below could not fail.
        // Past 1.5 the two values separate and only the refreshed one keeps the candidate.
        state.nowS = 1.6
        state.expireStalledVerify()
        assertNotNull(state.pending, "dropped a candidate whose observer had answered 0.6 s ago")
    }

    /** The line has to carry the evidence, not just the verdict — that is the whole point of it. */
    @Test
    fun theLogLineCarriesTheChangedSquaresTheirZValuesAndTheVetoes() {
        val row =
            record(3).copy(
                accepted = false,
                decider = DECIDER_REJECTED,
                move = "f4d4",
                san = null,
                reason = "no legal move",
                changed = listOf("f4", "d4"),
                changedVals = listOf("f4" to 9.25, "d4" to 4.5),
                shadowVetoed = listOf("e5"),
                occludedVetoed = listOf("h2"),
                cnnRun = true,
                cnnAgreement = 1.0,
                cnnBestMove = null,
                stuckReason = "no_legal_move",
            )
        val line = row.toLogLine()
        assertTrue(line.contains("changed=[f4=9.2 d4=4.5]"), line)
        assertTrue(line.contains("shadowVeto=e5"), line)
        assertTrue(line.contains("occlVeto=h2"), line)
        assertTrue(line.contains("cnn=run"), line)
        assertTrue(line.contains("cnnAgree=1.000"), line)
        assertTrue(line.contains("stuck=no_legal_move"), line)
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
