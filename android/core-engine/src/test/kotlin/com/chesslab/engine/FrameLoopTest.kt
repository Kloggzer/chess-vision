package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.parity.meanPlane
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val U8 = 0xFF

private class Harness(
    config: TrackerConfig = testConfig(),
) {
    val state = EngineState(config, STARTPOS, whitePov = true)
    val refCaptures = mutableListOf<Pair<GrayImage, BgrImage?>>()
    val loop =
        FrameLoop(state) { cur, curBgr ->
            refCaptures += cur to curBgr
            state.refGray = cur
            state.refBgr = curBgr
            state.refFen = state.board.fen()
        }
    private var seq = 0L

    fun feed(
        gray: GrayImage = grayFrame(),
        tsMs: Long = -1L,
        motionRoi: Double = 0.0,
        coverage: Double = 1.0,
        luma: Double = QUIET_LUMA,
    ): FrameOutcome {
        seq += 1
        return loop.step(
            FrameInput(
                seq = seq,
                grayDet = gray,
                bgrDet = bgrFrame(boardSize = gray.width),
                corners = floatArrayOf(0f, 0f, BOARD_EDGE, 0f, BOARD_EDGE, BOARD_EDGE, 0f, BOARD_EDGE),
                motionRoiScore = motionRoi,
                gridLineCoverage = coverage,
                lumaPreClahe = luma,
                timestampMs = if (tsMs >= 0) tsMs else seq * FRAME_MS,
            ),
        )
    }

    companion object {
        const val FRAME_MS = 100L
        const val QUIET_LUMA = 128.0
        const val BOARD_EDGE = 400f
    }
}

class FrameLoopTest {
    /** The gate reads the luma BEFORE CLAHE, and a dark frame must not mutate anything the next bright one depends on. */
    @Test
    fun darkFrameGateIsPreClahe() {
        val h = Harness()
        val thr = h.state.config.darkLumaThr
        assertEquals(18.0, thr, "the constructor-only darkLumaThr default is 18.0")

        val outcome = h.feed(luma = thr - 0.1)

        assertEquals(FrameOutcome.Skip(SKIP_DARK), outcome)
        assertEquals(0, h.state.stableCount, "a dark frame must not advance the settle counter")
        assertEquals(0, h.state.grayBuf.size, "a dark frame must not enter the averaging buffer")
        assertNull(h.state.prevGray, "a dark frame must not seed the motion reference")
        assertEquals(0.0, h.state.motion)
        assertEquals(1L, h.state.frameSeq, "the frame counter still advances (`:1563` precedes the gate)")
        assertTrue(requireNotNull(h.state.note).startsWith("frame too dark"))

        assertTrue(h.feed(luma = thr + 0.1) is FrameOutcome.Skip)
        assertEquals(1, h.state.stableCount, "a bright frame proceeds normally")
    }

    /** Invariant 14: the frame source must never deliver the same frame twice. */
    @Test
    fun repeatedFrameNeverDeliveredTwice() {
        val h = Harness()
        val input =
            FrameInput(
                seq = 7L,
                grayDet = grayFrame(),
                bgrDet = bgrFrame(),
                corners = FloatArray(CORNER_FLOATS),
                motionRoiScore = 0.0,
                gridLineCoverage = 1.0,
                lumaPreClahe = Harness.QUIET_LUMA,
                timestampMs = Harness.FRAME_MS,
            )
        h.loop.step(input)
        assertThrows(IllegalArgumentException::class.java) { h.loop.step(input) }
        assertThrows(IllegalArgumentException::class.java) { h.loop.step(input.copy(seq = 6L)) }
    }

    /** Pending verification and snapshots must share the producer's one sequence domain. */
    @Test
    fun detectionKeepsTheInputSequenceWhenTheProducerStartsAboveOne() {
        val config =
            RIG_CONFIG.copy(
                darkLumaThr = 0.0,
                motionHoldS = 0.0,
                commitHoldS = null,
                settleFramesOverride = 1,
                avgFramesOverride = 1,
            )
        val h = Harness(config)

        fun input(seq: Long) =
            FrameInput(
                seq = seq,
                grayDet = grayFrame(),
                bgrDet = bgrFrame(),
                corners = FloatArray(CORNER_FLOATS),
                motionRoiScore = 0.0,
                gridLineCoverage = 1.0,
                lumaPreClahe = Harness.QUIET_LUMA,
                timestampMs = seq,
            )

        h.loop.step(input(100L))
        val detected = h.loop.step(input(101L)) as FrameOutcome.Detect

        assertEquals(
            101L,
            detected.seq,
            "a candidate stamped 2 accepts CNN seq 99 even though that observation predates input seq 101",
        )
    }

    @Test
    fun motionBranchClearsBuffersAndArmsTheHold() {
        val h = Harness()
        h.feed()
        h.feed()
        assertEquals(2, h.state.grayBuf.size)

        val outcome = h.feed(motionRoi = 5.0)

        assertEquals(FrameOutcome.Skip(SKIP_MOVING), outcome)
        assertEquals(STATE_MOVING, h.state.state)
        assertEquals(0, h.state.stableCount)
        assertEquals(0, h.state.grayBuf.size)
        assertEquals(0, h.state.bgrBuf.size)
        assertTrue(h.state.motionSinceRef, "a hand entered — a real move is now possible")
        assertEquals(h.state.nowS, h.state.lastMotionTs)
        assertEquals(h.state.nowS + h.state.config.motionHoldS, h.state.holdUntil, 1e-9)
    }

    /** BOTH conditions gate `ready`. At the default 0.1 s hold the settle count binds later and this would assert nothing. */
    @Test
    fun readyRequiresSettleFramesAndHold() {
        val h = Harness(testConfig().copy(motionHoldS = 0.4))
        h.feed(motionRoi = 5.0, tsMs = 50L)
        for (ts in listOf(100L, 150L, 200L, 250L, 300L)) h.feed(tsMs = ts)
        assertTrue(h.state.stableCount > h.state.settleFrames, "the settle count is satisfied")
        assertTrue(h.state.nowS < h.state.holdUntil, "but the motion hold has not expired")
        assertTrue(h.refCaptures.isEmpty(), "no reference may be captured while the hold is live")

        for (ts in listOf(350L, 400L, 450L)) h.feed(tsMs = ts)
        assertTrue(h.state.nowS >= h.state.holdUntil)
        assertEquals(1, h.refCaptures.size, "the first ready frame captures base truth")
    }

    @Test
    fun setRefOnlyWhenRefGrayNull() {
        val h = Harness()
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertEquals(1, h.refCaptures.size)
        val captured = h.refCaptures.single().first

        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertEquals(1, h.refCaptures.size, "`_set_ref` must not run again while a reference is live")
        assertSame(captured, h.state.refGray)
    }

    /** Residual hand pixels must never reach the first post-occlusion mean, and the state must leave `occluded` —
     *  it stuck until the next MOTION frame, killing the periodic CNN check. */
    @Test
    fun gridGateReleaseExtendsHoldAndClearsBuffers() {
        val h = Harness(testConfig(minGridLineCoverage = 0.5))
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertEquals(1, h.refCaptures.size)

        val occluded = h.feed(coverage = 0.3)
        assertEquals(FrameOutcome.Skip(SKIP_OCCLUDED), occluded)
        assertEquals(STATE_OCCLUDED, h.state.state)
        assertTrue(h.state.occlGridActive)
        assertEquals(NOTE_GRID_COVERED, h.state.note)

        val holdBefore = h.state.holdUntil
        val released = h.feed(coverage = 0.9)

        assertFalse(h.state.occlGridActive, "the gate released")
        assertEquals(0, h.state.grayBuf.size, "the averaging buffer must be dropped on release")
        assertEquals(0, h.state.bgrBuf.size)
        assertTrue(h.state.holdUntil >= h.state.nowS + h.state.config.motionHoldS, "the hold is extended")
        assertTrue(h.state.holdUntil > holdBefore)
        assertTrue(released is FrameOutcome.Skip, "the release frame can never detect")
        assertNull(h.state.lastCur, "the mean of an emptied buffer is null, exactly as in Python")
        assertTrue(h.state.refHoldUntil >= h.state.nowS + h.state.config.occluderHoldS, "auch die Referenz wartet")
        assertEquals(STATE_WAITING, h.state.state, "the release frame must leave the occluded state")
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertEquals(STATE_WAITING, h.state.state, "and quiet frames never put it back")
    }

    @Test
    fun gridGateDisabledLeavesCoverageUntouched() {
        val h = Harness(testConfig(minGridLineCoverage = 0.0))
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed(coverage = 0.0) }
        assertEquals(1.0, h.state.gridCoverage, "the debug metric is not even measured")
        assertEquals(1, h.refCaptures.size, "a disabled gate never blocks")
    }

    /** Invariant 3: counting the dilated set would lock the tracker in `occluded`, where detection never runs. */
    @Test
    fun occludedGateCountsRawCoreNotDilated() {
        val h = armedHarness()
        val now = h.state.nowS
        val expiry = now + LONG_EXPIRY_S
        for (square in listOf("e4", "e3", "e5", "d4", "f4")) h.state.occlusionExpiry[Squares.index(square)] = expiry
        h.state.occlCoreExpiry[Squares.index("e4")] = expiry

        assertTrue(h.feed() is FrameOutcome.Detect, "one raw core square must still reach detection")

        for (square in listOf("a1", "b1", "c1")) h.state.occlCoreExpiry[Squares.index(square)] = expiry
        val blocked = h.feed()
        assertEquals(FrameOutcome.Skip(SKIP_OCCLUDED), blocked)
        assertEquals(STATE_OCCLUDED, h.state.state)
    }

    /** A hold under the 0.1 s keep-alive let `ready` fire on live core stamps, and `occluded` latched on a played
     *  move (8 plies lost at 50 ms holds). */
    @Test
    fun coreOccludedStateExitsOnAQuietBoard() {
        val h =
            Harness(
                testConfig().copy(
                    // Die Empfindlichkeit von damals; die Vorgabe (34.5) betritt den Zustand hier nicht.
                    motionHoldS = 0.05,
                    occluderHoldS = 0.05,
                    commitHoldS = 0.067,
                    motionPxThr = 20.0,
                    settleFramesOverride = 2,
                ),
            )
        var t = 0L
        repeat(3) {
            h.feed(tsMs = t)
            t += 100
        }
        assertNotNull(h.state.refGray)
        val moved = grayFrame(listOf("c8", "d7", "e5"))
        h.feed(gray = moved, tsMs = t, motionRoi = 1.0)
        var sawOccluded = false
        var detected = false
        repeat(30) {
            t += 33
            val outcome = h.feed(gray = moved, tsMs = t)
            if (h.state.state == STATE_OCCLUDED) sawOccluded = true
            if (outcome is FrameOutcome.Detect) detected = true
        }
        assertTrue(sawOccluded, "the live core stamps must gate the first ready frame")
        assertTrue(detected, "a quiet board that differs from the reference is a move, not a hand")
    }

    @Test
    fun commitHoldOpensDetectionButNotTheReference() {
        val h = Harness(testConfig().copy(commitHoldS = 0.05, motionHoldS = 0.20, settleFramesOverride = 2))
        var t = 0L
        h.feed(tsMs = t, motionRoi = 1.0)
        val firstDetect =
            generateSequence {
                t += 33
                t
            }.first { h.feed(tsMs = it) is FrameOutcome.Detect }
        assertTrue(firstDetect >= 200, "the first capture is a full-hold event, got $firstDetect ms")
        assertEquals(1, h.refCaptures.size)
        val motionEnd = t
        h.feed(tsMs = t, motionRoi = 1.0)
        val reopened =
            generateSequence {
                t += 33
                t
            }.first { h.feed(tsMs = it) is FrameOutcome.Detect }
        assertTrue(reopened - motionEnd < 200, "detection reopened after ${reopened - motionEnd} ms")
        assertEquals(1, h.refCaptures.size, "an armed reference is not re-captured by the loop")
    }

    @Test
    fun provisionalReferenceIsRecapturedAfterTheFullHold() {
        val h = Harness(testConfig().copy(commitHoldS = 0.05, motionHoldS = 0.20, settleFramesOverride = 2))
        var t = 0L
        repeat(3) {
            h.feed(tsMs = t)
            t += 100
        }
        // The mean plane is a reused ring slot, so compare pixels, not identity.
        val shaky =
            h.state.refGray!!
                .data
                .copyOf()
        // The moved board arrives WITH the motion frame; a later change would read as new motion.
        val later = grayFrame(listOf("e4"))
        h.feed(gray = later, tsMs = t, motionRoi = 1.0)
        val motionEnd = t
        h.state.refProvisionalUntil = h.state.nowS + 0.20
        h.state.motionSinceRef = false
        while (t < motionEnd + 190) {
            t += 33
            h.feed(gray = later, tsMs = t)
            assertTrue(
                h.state.refGray!!
                    .data
                    .contentEquals(shaky),
                "no re-capture at ${t - motionEnd} ms",
            )
        }
        t += 33
        h.feed(gray = later, tsMs = t)
        assertTrue(
            !h.state.refGray!!
                .data
                .contentEquals(shaky),
            "re-captured once the full hold passed",
        )
        assertEquals(0.0, h.state.refProvisionalUntil)

        h.state.refProvisionalUntil = h.state.nowS + 0.20
        h.state.motionSinceRef = false
        val kept =
            h.state.refGray!!
                .data
                .copyOf()
        h.feed(gray = later, tsMs = t + 33, motionRoi = 1.0)
        for (k in 2..12) h.feed(gray = later, tsMs = t + 33 * k)
        assertTrue(
            h.state.refGray!!
                .data
                .contentEquals(kept),
        )
        assertTrue(h.state.refProvisionalUntil > 0.0, "still flagged for the labeling side")
    }

    @Test
    fun occlusionKeepAliveExpires() {
        val h = armedHarness()
        h.state.occlusionExpiry[Squares.index("e4")] = h.state.nowS + LONG_EXPIRY_S
        h.state.occlusionExpiry[Squares.index("a1")] = h.state.nowS - LONG_EXPIRY_S
        h.feed()
        assertEquals(listOf("e4"), h.state.occludedVetoed.sortedSquareNames(), "an expired stamp must drop out")
        assertEquals(ofSquares("e4"), h.state.motionOccluded)
    }

    @Test
    fun detectScaleHalfDetSize() {
        val config = TrackerConfig(boardSize = HALF_SCALE_BOARD, detectScale = 0.5, minGridLineCoverage = 0.0)
        val h = Harness(config)
        assertEquals(HALF_SCALE_DET, h.state.detSize)
        assertEquals(HALF_SCALE_DET, config.detSize)

        val gray = grayFrame(listOf("e2"), boardSize = HALF_SCALE_DET)
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed(gray = gray) }

        val ref = requireNotNull(h.state.refGray)
        assertEquals(HALF_SCALE_DET, ref.width)
        assertEquals(HALF_SCALE_DET, ref.height)
    }

    @Test
    fun staleBaselineAtAnotherPlaneSizeIsDiscardedInsteadOfDroppingFrames() {
        val h = Harness()
        h.state.refGray = grayFrame(boardSize = TEST_BOARD_SIZE / 2)
        h.state.refFen = h.state.board.fen()
        h.state.state = STATE_MOVING

        val outcome = h.feed(motionRoi = 5.0)

        assertEquals(FrameOutcome.Skip(SKIP_MOVING), outcome)
        assertNull(h.state.refGray)
        assertEquals(STATE_MOVING, h.state.state, "the current moving frame still arms the normal motion hold")
        assertEquals(NOTE_WAITING_CLEAR, h.state.note)
    }

    @Test
    fun fpsIsAnEmaOverTheLoopRate() {
        val h = Harness()
        h.feed(tsMs = 1_000L)
        assertEquals(0.0, h.state.fps, "no previous timestamp yet")
        h.feed(tsMs = 1_100L)
        assertEquals(FPS_AT_100_MS, h.state.fps, 1e-9)
        h.feed(tsMs = 1_200L)
        assertEquals(FPS_AT_100_MS, h.state.fps, 1e-9, "a constant rate is a fixed point of the EMA")
    }

    @Test
    fun runningMeanEqualsWindowStack() {
        val rm = RunningMeanGray(RM_WINDOW)
        val frames = (0 until RM_FRAMES).map { randomGray(it.toLong(), RM_SIDE) }
        for (frame in frames) rm.append(frame)

        val expected = meanPlane(frames.takeLast(RM_WINDOW).map { it.data })
        assertTrue(expected.contentEquals(requireNotNull(rm.meanUint8()).data))
    }

    @Test
    fun runningMeanResyncsAfter64Appends() {
        val rm = RunningMeanGray(RM_DRIFT_WINDOW)
        val frames = (0 until RM_DRIFT_FRAMES).map { randomGray(RM_DRIFT_SEED + it, RM_DRIFT_SIDE) }
        for (frame in frames) rm.append(frame)

        val expected = meanPlane(frames.takeLast(RM_DRIFT_WINDOW).map { it.data })
        assertTrue(expected.contentEquals(requireNotNull(rm.meanUint8()).data))
    }

    @Test
    fun runningMeanClearAndReuse() {
        val rm = RunningMeanGray(RM_WINDOW)
        rm.append(grayFrame(boardSize = RM_SIDE, base = 10))
        rm.clear()
        assertNull(rm.meanUint8())
        assertEquals(0, rm.size)

        rm.append(grayFrame(boardSize = RM_SIDE, base = 20))
        assertEquals(20, requireNotNull(rm.meanUint8()).data[0].toInt() and U8)
    }

    /** TRUNCATION, never rounding: `(sum / n).astype(np.uint8)`. */
    @Test
    fun runningMeanTruncatesLikeNumpy() {
        val rm = RunningMeanBgr(RM_WINDOW)
        rm.append(bgrFrame(boardSize = RM_SIDE, level = 10))
        rm.append(bgrFrame(boardSize = RM_SIDE, level = 11))
        assertEquals(10, requireNotNull(rm.meanUint8()).data[0].toInt() and U8)
    }

    /** The mean holds planes BY REFERENCE and reads the evicted one, so the bound is `window + 1`; one shared
     *  buffer fails SILENTLY (invariant 14, `pipeline/PlaneRing.kt`). */
    @Test
    fun theBufferRingNeverHandsBackAPlaneTheRunningMeanStillHolds() {
        val frames = (0 until RING_FRAMES).map { randomGray(RING_SEED + it, RM_SIDE).data }
        val expected = meanPlane(frames.takeLast(RM_WINDOW))

        assertTrue(expected.contentEquals(meanThroughRing(RM_WINDOW + RING_HEADROOM, frames)), "the ring's depth is safe")
        assertTrue(expected.contentEquals(meanThroughRing(RM_WINDOW + 1, frames)), "and `window + 1` is where it becomes safe")
        assertFalse(
            expected.contentEquals(meanThroughRing(depth = 1, frames = frames)),
            "a single shared buffer must corrupt the mean — if this passes, the test proves nothing",
        )
    }

    /** `detSize` is derived twice; the message must name both sizes to say which producer is off. */
    @Test
    fun aDetectionPlaneThatDisagreesWithTheBoxesIsRefused() {
        val h = Harness(testConfig(boardSize = TEST_BOARD_SIZE))
        assertEquals(TEST_BOARD_SIZE, h.state.detSize)

        val wrong = grayFrame(boardSize = TEST_BOARD_SIZE / 2)
        val thrown = assertThrows(IllegalArgumentException::class.java) { h.feed(gray = wrong) }

        val message = requireNotNull(thrown.message)
        assertTrue(message.contains("${TEST_BOARD_SIZE / 2}x${TEST_BOARD_SIZE / 2}"), message)
        assertTrue(message.contains("squares for $TEST_BOARD_SIZE"), message)
        assertEquals(0, h.state.frameSeq, "the guard fires before any state is touched")
    }

    /** Das Bewegungsfenster von `commitRecovery` war tot: der Commit hinterliess `STATE_MOVE`, bis zur naechsten Hand. */
    @Test
    fun aRecoveryCommitReopensDetectionWithoutANewHand() {
        val h = Harness(recoveryConfig())
        repeat(RECOVERY_SETTLE_FRAMES) { h.feed() }
        assertNotNull(h.state.refGray, "precondition: base truth is captured")
        h.state.cnnRun = true
        h.state.markStuck(STUCK_NO_LEGAL_MOVE)

        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)
        h.state.recoveryGlances(cnn, obsForBoard(h.state.board), gray = grayFrame())
        assertEquals(listOf("e4"), h.state.history, "precondition: the bridge committed")

        val outcomes = (1..RECOVERY_SETTLE_FRAMES).map { h.feed() }
        assertTrue(outcomes.any { it is FrameOutcome.Detect }, "quiet frames after a bridge must detect: $outcomes")
    }

    @Test
    fun runningMeanResizeClears() {
        val rm = RunningMeanGray(RM_WINDOW)
        rm.append(grayFrame(boardSize = RM_SIDE))
        rm.resize(RM_WINDOW + 1)
        assertEquals(0, rm.size)
        assertNull(rm.meanUint8())
    }

    @Test
    fun baselineOcclusionOffClearsAStandingShadowVeto() {
        val h = Harness(testConfig().copy(baselineOcclusion = false))
        h.state.shadowVetoed = 1L
        h.feed()
        assertEquals(0L, h.state.shadowVetoed)
    }

    /** Der Wachhund haengt am Frame-Takt, nicht an einem Beobachter, der gerade nicht antwortet. */
    @Test
    fun theFrameLoopDropsAStalledCandidate() {
        val h = Harness()
        h.state.pending =
            PendingVerify(listOf("e2e4"), "e2e4", h.state.board.fen(), grayFrame(), null, frames = 0, priorUsed = false, seq = 0)
        h.feed(tsMs = 5_000L)
        assertNull(h.state.pending)
        assertEquals(VERIFY_STATE_STALLED, h.state.verifyState)
    }

    private fun armedHarness(): Harness {
        val h = Harness()
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertNotNull(h.state.refGray)
        return h
    }

    private fun randomGray(
        seed: Long,
        side: Int,
    ): GrayImage {
        val rng = java.util.Random(seed)
        return GrayImage(side, side, ByteArray(side * side) { rng.nextInt(U8 + 1).toByte() })
    }

    private fun meanThroughRing(
        depth: Int,
        frames: List<ByteArray>,
    ): ByteArray {
        val ring = Array(depth) { ByteArray(frames[0].size) }
        val mean = RunningMeanGray(RM_WINDOW)
        frames.forEachIndexed { i, frame ->
            val slot = ring[i % depth]
            frame.copyInto(slot)
            mean.append(GrayImage(RM_SIDE, RM_SIDE, slot))
        }
        return requireNotNull(mean.meanUint8()).data
    }

    private companion object {
        const val CORNER_FLOATS = 8
        const val SETTLE_FRAMES_NO_CNN = 4

        const val RECOVERY_SETTLE_FRAMES = 4
        const val LONG_EXPIRY_S = 100.0
        const val FPS_AT_100_MS = 10.0
        const val HALF_SCALE_BOARD = 400
        const val HALF_SCALE_DET = 200
        const val RM_WINDOW = 3
        const val RM_FRAMES = 10
        const val RM_SIDE = 10
        const val RM_DRIFT_WINDOW = 5
        const val RM_DRIFT_FRAMES = 70
        const val RM_DRIFT_SIDE = 8
        const val RM_DRIFT_SEED = 42L

        const val RING_HEADROOM = 3
        const val RING_FRAMES = 20
        const val RING_SEED = 7L
    }
}
