package com.chesslab.engine

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class AnomalyPatcherTest {
    @Test
    fun nudgePatchesOccupiedSquare() {
        val config = detectConfig().copy(nudgeTimeoutS = 0.0)
        val state = detectState(config, ref = grayFrame())
        val cur = grayFrame(listOf("e2"))
        state.tryDetect(cur, null, seq = 1)
        state.tryDetect(cur, null, seq = 2)
        assertNull(state.stuckReason)
        assertEquals(emptyList<String>(), state.history)
        state.tryDetect(cur, null, seq = 3)
        assertEquals(0L, state.changed)
    }

    @Test
    fun emptySquareWaitsForDriftWindow() {
        // An EMPTY square that changes could also be a silent wrong move -> never patch it early.
        val config = detectConfig().copy(nudgeTimeoutS = 0.0, driftWindowS = 9999.0)
        val state = detectState(config, ref = grayFrame())
        val cur = grayFrame(listOf("e4"))
        state.tryDetect(cur, null, seq = 1)
        state.tryDetect(cur, null, seq = 2)
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
        assertEquals(ofSquares("e4"), state.changed)
    }

    @Test
    fun aDesyncedBoardIsNeverPatched() {
        // Healing a PHYSICALLY moved board into the reference is a silent desync. Each of the three must hold ALONE.
        for (desync in listOf("alarm", "streak", "status")) {
            val state = detectState(ref = grayFrame())
            val ref = requireNotNull(state.refGray)
            val before = ref.data.copyOf()
            state.nowS = 100.0
            state.armAnomaly("e2")
            when (desync) {
                "alarm" -> state.alarm = TrackerEvent.Alarm("illegal_move", listOf("e2", "e4"), null, null)
                "streak" -> state.desyncObs = 1
                else -> state.cnnStatus = CNN_STATUS_MISMATCH
            }
            state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
            assertTrue(before.contentEquals(ref.data), "the reference must not be patched while $desync")
        }
    }

    /** `stuckReason == STUCK_CNN_DESYNC` is only written where `changed == 0`, never at the patcher: half the
     *  guard was dead. This drives the engine there. */
    @Test
    fun theStuckReasonAtThePatcherIsNeverTheDesyncOne() {
        val state = detectState(ref = grayFrame())
        state.nowS = 100.0
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 2)
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
    }

    /** `desyncObs` only counted UP outside a latch, so one disagreeing glance disabled healing for the session. */
    @Test
    fun aMatchingObservationLetsThePatcherHealAgain() {
        val state = recoveryState()
        val ref = grayFrame()
        state.refGray = ref
        state.refFen = state.board.fen()
        val cnn = RecoveryEvaluator(conflicts = listOf("e2"))
        val disagreeing = obsForBoard(state.board, mapOf("e2" to LABEL_EMPTY))
        state.cnnTick(cnn, recoverySnap(state, disagreeing, seq = 1))
        assertEquals(1, state.desyncObs, "precondition: one disagreeing glance")

        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() }, "a disagreeing CNN blocks the patch")

        cnn.match = true
        state.cnnTick(cnn, recoverySnap(state, obsForBoard(state.board), seq = 2))
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)

        assertTrue(ref.data.any { it == TEST_BLOB_LEVEL.toByte() }, "the CNN agreed again — healing must resume")
    }

    /** Die CNN-Uebergaenge raeumten `anomalySince` nicht: ein abgelaufener Timer patchte gegen eine neue Referenz. */
    @Test
    fun aMatchOkPullForwardRestartsTheAnomalyTimers() {
        val state = recoveryState()
        state.armAnomaly("e2")
        val observed = grayFrame()
        state.cnnTick(RecoveryEvaluator(match = true), recoverySnap(state, obsForBoard(state.board), 1, observed))
        assertSame(observed, state.refGray, "precondition: the reference was pulled forward")

        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)

        assertTrue(observed.data.all { it == TEST_BASE_LEVEL.toByte() }, "the timer must restart with the reference")
    }

    @Test
    fun aRecoveryCommitRestartsTheAnomalyTimers() {
        val state = recoveryState()
        state.armAnomaly("a7")
        val observed = grayFrame()
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        state.recoveryGlances(cnn, obsForBoard(state.board), gray = observed)
        assertEquals(listOf("e4"), state.history, "precondition: the bridge committed")

        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("a7")), curBgr = null)

        assertTrue(observed.data.all { it == TEST_BASE_LEVEL.toByte() }, "the timer must restart with the reference")
    }

    /** Ein gegen die alte Ebene gestarteter Timer war gegen die erste NEUE Referenz sofort faellig. */
    @Test
    fun aDiscardedVisualReferenceRestartsTheAnomalyTimers() {
        val state = detectState(ref = grayFrame())
        state.armAnomaly("e4", since = 0.0)
        state.nowS = 100.0

        state.discardVisualReference()
        val fresh = grayFrame()
        state.refGray = fresh
        state.refFen = state.board.fen()
        state.tryDetect(grayFrame(listOf("e4")), null, seq = 1)

        assertEquals(ofSquares("e4"), state.changed, "precondition: e4 is hot again against the new reference")
        assertTrue(fresh.data.all { it == TEST_BASE_LEVEL.toByte() }, "the timer must restart with the reference")
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason, "and the refusal stands instead of being patched away")
    }

    /** Nur in den Verweigerungs-Armen gepflegt: nach 100 s Kandidaten-Pfad war der Timer sofort faellig. */
    @Test
    fun aQuietStretchRestartsTheAnomalyTimer() {
        // The vote count keeps the candidate from committing — a commit clears the timers itself.
        val state = detectState(detectConfig().copy(confirmFramesOverride = 3), ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        state.armAnomaly("e4", since = 0.0)
        state.nowS = 100.0

        state.tryDetect(grayFrame(listOf("g1", "f3")), null, seq = 1)
        assertNull(state.stuckReason, "precondition: the candidate path ran, not a refusal")
        assertEquals(emptyList<String>(), state.history, "precondition: nothing committed")

        state.tryDetect(grayFrame(listOf("e4")), null, seq = 2)

        assertEquals(ofSquares("e4"), state.changed, "precondition: e4 is hot again on a refusal frame")
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() }, "the timer restarted, so nothing is due")
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason, "and the refusal stands instead of being patched away")
    }

    @Test
    fun patchInvalidatesRefCensusCache() {
        val state = detectState(ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        // `refGray` is mutated IN PLACE, so the identity-keyed cache would go stale.
        state.refCensusCodes(ref)
        assertNotNull(state.refCensusFor)
        state.nowS = 100.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertNull(state.refCensusFor, "the census cache must be invalidated")
        val recoded = state.refCensusCodes(ref)
        assertNotNull(state.refCensusFor)
        assertEquals(ref.data.size, recoded.size)
    }

    @Test
    fun patchRegionIncludesOverhang() {
        val config = detectConfig(overhang = 0.25).copy(nudgeTimeoutS = 0.0)
        val state = detectState(config, ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        val cur = grayFrame(base = 200)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = cur, curBgr = null)
        val region = squareRegion(Squares.index("e2"), state.detSize, state.whitePov, inset = 0.0, extendUp = 0.25)
        var inside = 0
        for (y in 0 until ref.height) {
            for (x in 0 until ref.width) {
                val within = x >= region[0] && x < region[2] && y >= region[1] && y < region[3]
                val same = ref.data[y * ref.width + x] == cur.data[y * cur.width + x]
                if (within) {
                    inside += 1
                    assertTrue(same, "pixel ($x,$y) inside the patch region was not copied")
                } else {
                    assertEquals(TEST_BASE_LEVEL.toByte(), ref.data[y * ref.width + x], "pixel ($x,$y) outside")
                }
            }
        }
        assertTrue(inside > 0, "the patch region is empty")
        assertEquals(0L, state.anomalySince, "a patched square loses its timer")
        assertTrue(state.note.orEmpty().contains("Reference pulled forward (e2)"), "note was '${state.note}'")
    }

    @Test
    fun patchingEverythingClearsTheStuckMarker() {
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertNull(state.stuckReason)
        assertEquals(0, state.confirmer.count)
    }

    @Test
    fun restingHandIsNeverPatched() {
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        val squares = listOf("a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "a2")
        state.nowS = 10.0
        state.armAnomaly(*squares.toTypedArray())
        val ref = requireNotNull(state.refGray)
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(squares), curBgr = null)
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() }, "the reference was patched with a hand")
    }

    @Test
    fun aViableMoveSuppressesPatching() {
        // `bestLl >= 0` means a move DOES explain the change — healing it away would erase the move.
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = 0.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() })
    }
}
