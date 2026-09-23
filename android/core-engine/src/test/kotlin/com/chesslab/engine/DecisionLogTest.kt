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

/** `_DECIDER_REASON` (`tracker.py`) verbatim and in order — the debug screen and `track-feedback` read them. */
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
            cnnReadsTaken = 0L,
            cnnReadsStale = 0L,
            cnnSnaps = 0L,
            cnnSnapsToVerify = 0L,
            cnnSnapsNoEvaluator = 0L,
            cnnSnapsNotDue = 0L,
            cnnBestMove = null,
        )

    /** `cnnAgree=0.000` alone is three faults — disagreed, never asked, or asked too late. */
    @Test
    fun theLogLineSeparatesAModelThatDisagreedFromOneThatWasNeverAsked() {
        val neverAsked = record(0).toDebugDecision().copy(cnnAgreement = 0.0, cnnReadsTaken = 0L)
        val disagreed = record(0).toDebugDecision().copy(cnnAgreement = 0.0, cnnReadsTaken = 57L, cnnReadsStale = 3L)
        assertTrue("cnnReads=0/0" in neverAsked.toLogLine(), neverAsked.toLogLine())
        assertTrue("cnnReads=57/3" in disagreed.toLogLine(), disagreed.toLogLine())
        assertTrue(
            neverAsked.toLogLine() != disagreed.toLogLine(),
            "two different faults must not render identically",
        )
    }

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
        assertEquals(PYTHON_DECIDER_REASON.toList(), DECIDER_REASON.toList())
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

    /** 2026-08-01, a mismatch cycle on a legitimate `Qxd4`: the rejected rows lived only behind a debug switch that was off. */
    @Test
    fun everyDecisionReachesTheSinkIncludingTheRejections() {
        val lines = mutableListOf<String>()
        val log = DecisionLog(sink = { lines += it.toDebugDecision().toLogLine() })
        log.add(record(1))
        assertEquals(1, lines.size)
        assertTrue(lines.single().startsWith("ply=1 COMMIT e2e4 (e4)"), lines.single())

        val state = detectState(detectConfig(requireMotion = true))
        val seen = mutableListOf<String>()
        state.decisionLog.clear()
        val mirrored = DecisionLog(sink = { seen += it.toDebugDecision().toLogLine() })
        val cand = Candidate(listOf(state.legalMoveFor("e2e4")!!), priorUsed = false, vote = true)
        state.commitGates(cand)
        state.decisionLog.forEach(mirrored::add)
        assertTrue(seen.single().startsWith("ply=0 REJECT e2e4"), seen.single())
        assertTrue(seen.single().contains("evidence too weak"), seen.single())
    }

    /** The sink is the ONLY way out; `move` -> `uci` is the rename that becomes a silently empty column in `:app`. */
    @Test
    fun theSinkReceivesTheDecisionAsStructure() {
        val seen = mutableListOf<DebugDecision>()
        val state = EngineState(detectConfig(requireMotion = true), STARTPOS, decisionSink = { seen += it })
        val cand = Candidate(listOf(state.legalMoveFor("e2e4")!!), priorUsed = false, vote = true)
        assertFalse(state.commitGates(cand))

        val row = state.decisionLog.single()
        val emitted = seen.single()
        assertEquals(row.move, emitted.uci)
        assertEquals(row.ply, emitted.ply)
        assertEquals(row.decider, emitted.decider)
        assertEquals(row.accepted, emitted.accepted)
        assertEquals(row.reason, emitted.reason)
    }

    /**
     * Where a legitimate move most plausibly dies: `windowEnd` rejects on ANY conflicting square, and
     * until this row existed the rejection wrote only a `note` the next frame overwrote.
     */
    @Test
    fun theVerifyLadderRecordsWhyItDiscardedACandidate() {
        // Window of 1 and a glance with nothing confident: the ladder's occlusion timeout.
        val state = pairState(ucis = listOf("e2e4"), verifyWindow = 1)
        val events = VerifySingle.tick(state, PairRecovery(), snapshotOf(state, FakeObs(emptyMap(), emptySet())))

        assertTrue(events.isEmpty(), "a rejected candidate emits no move")
        assertNull(state.pending, "the candidate was discarded")
        val row = state.decisionLog.last()
        assertFalse(row.accepted, "the verify ladder wrote no rejection row")
        assertEquals("e2e4", row.move)
        val line = row.toDebugDecision().toLogLine()
        assertTrue(line.startsWith("ply=0 REJECT e2e4"), line)
    }

    /** Live Nf6: each diff rejection erased the recovery vote, so the correct recovery waited 20 s for the motion gate. */
    @Test
    fun rejectingADiffCandidateKeepsTheIndependentRecoveryVote() {
        val state = pairState(ucis = listOf("e2e4"), verifyWindow = 1)
        assertFalse(state.recoveryConfirmer.feed("g8f6"))
        assertEquals(1, state.recoveryConfirmer.count)

        VerifySingle.tick(state, PairRecovery(), snapshotOf(state, FakeObs(emptyMap(), emptySet())))

        assertNull(state.pending)
        assertEquals("g8f6", state.recoveryConfirmer.key)
        assertEquals(1, state.recoveryConfirmer.count)
    }

    /**
     * An observation about an OLDER frame is an observer that answered: on a warm phone, cycles past
     * the 1.5 s budget dropped every diff candidate as stalled.
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

        // 1.6, not 1.4: below `verifyTimeoutS = 1.5` the OLD `lastTickS` survives too and this could not fail.
        state.nowS = 1.6
        state.expireStalledVerify()
        assertNotNull(state.pending, "dropped a candidate whose observer had answered 0.6 s ago")
    }

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
        val line = row.toDebugDecision().toLogLine()
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

    /** `cnnSeq` und `cnnAgeMs` tragen die -1, `cnnInferMs` trug eine 0,0 — und der Schirm zeigt
     *  beide in DERSELBEN Zeile. "Noch nichts gesehen" las sich als "kostete null ms". */
    @Test
    fun debugPayloadReportsNoInferenceTimeUntilAnObservationLanded() {
        val state = detectState()
        val payload = state.toStatus(debugEnabled = true).debug!!
        assertEquals(-1L, payload.cnnSeq)
        assertEquals(-1L, payload.cnnAgeMs)
        assertEquals(-1.0, payload.cnnInferMs, "no observation has landed — nothing was measured")
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
