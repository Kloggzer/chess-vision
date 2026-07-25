package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// The per-frame body of `_loop` (`tracker.py:1490-1763`) and `_RunningMean` (`:149-186`).
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_raw_core_vs_dilated (:2304)                     -> occludedGateCountsRawCoreNotDilated
//   test_mean_equals_stack / test_drift_resync_after_64 /
//   test_clear_and_reuse (:561/:571/:581)                -> runningMean*
//   test_detect_scale_half_det_size_and_e2e4 (:2134)     -> detectScaleHalfDetSize

private const val U8 = 0xFF

/** A [FrameLoop] plus the `setRef` calls it made — the capture stands in for 03d's `Commit.kt`. */
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

    /** One frame at [tsMs] (default: 100 ms after the previous one); defaults = a quiet board. */
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
    /**
     * `:1577-1584` — the gate reads the luma of the warp BEFORE CLAHE, and a dark frame must not
     * mutate anything the next bright frame depends on (buffers, stable count, motion).
     */
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

    /** `:1629-1641` — the motion branch drops both buffers and arms the hold. */
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

    /** `:1646-1647` — BOTH conditions gate `ready`; a satisfied settle count is not enough. */
    @Test
    fun readyRequiresSettleFramesAndHold() {
        val h = Harness()
        // Motion at t = 0.05 s arms holdUntil = 0.45 s; the quiet frames are 0.05 s apart, so the
        // settle count (4) is reached long before the hold expires.
        h.feed(motionRoi = 5.0, tsMs = 50L)
        for (ts in listOf(100L, 150L, 200L, 250L, 300L)) h.feed(tsMs = ts)
        assertTrue(h.state.stableCount > h.state.settleFrames, "the settle count is satisfied")
        assertTrue(h.state.nowS < h.state.holdUntil, "but the motion hold has not expired")
        assertTrue(h.refCaptures.isEmpty(), "no reference may be captured while the hold is live")

        for (ts in listOf(350L, 400L, 450L)) h.feed(tsMs = ts)
        assertTrue(h.state.nowS >= h.state.holdUntil)
        assertEquals(1, h.refCaptures.size, "the first ready frame captures base truth")
    }

    /** `:1676-1682` — base truth is captured exactly once; a live reference is never overwritten here. */
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

    /**
     * `:1663-1672` — the grid gate just cleared: extend the hold by another `motionHoldS`, DROP
     * both averaging buffers and force `ready` false, so residual hand pixels never reach the
     * first post-occlusion mean.
     */
    @Test
    fun gridGateReleaseExtendsHoldAndClearsBuffers() {
        val h = Harness(testConfig(minGridLineCoverage = 0.5))
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed() }
        assertEquals(1, h.refCaptures.size)

        // Occluder arrives: the gate blocks while the board stays perfectly still.
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
    }

    /** `_occluded_by_grid` (`:1319-1326`) — `minGridLineCoverage <= 0` disables the gate entirely. */
    @Test
    fun gridGateDisabledLeavesCoverageUntouched() {
        val h = Harness(testConfig(minGridLineCoverage = 0.0))
        repeat(SETTLE_FRAMES_NO_CNN + 1) { h.feed(coverage = 0.0) }
        assertEquals(1.0, h.state.gridCoverage, "the debug metric is not even measured")
        assertEquals(1, h.refCaptures.size, "a disabled gate never blocks")
    }

    /**
     * `:1689-1695` and entry.md invariant 3 — the `>2 -> occluded` gate counts the RAW UNDILATED
     * core. The dilated set of the same event has five squares; counting it would lock the tracker
     * in `occluded`, where `_try_detect` (and the CNN move-vs-hand arbitration) never runs.
     */
    @Test
    fun occludedGateCountsRawCoreNotDilated() {
        val h = armedHarness()
        val now = h.state.nowS
        val expiry = now + LONG_EXPIRY_S
        // One strong square, dilated to its four orthogonal neighbours: 5 dilated, 1 raw.
        for (square in listOf("e4", "e3", "e5", "d4", "f4")) h.state.occlusionExpiry[square] = expiry
        h.state.occlCoreExpiry["e4"] = expiry

        assertTrue(h.feed() is FrameOutcome.Detect, "one raw core square must still reach detection")

        for (square in listOf("a1", "b1", "c1")) h.state.occlCoreExpiry[square] = expiry
        val blocked = h.feed()
        assertEquals(FrameOutcome.Skip(SKIP_OCCLUDED), blocked)
        assertEquals(STATE_OCCLUDED, h.state.state)
    }

    /** `:1625-1627` — the keep-alive is evaluated against `nowS` and expires on its own. */
    @Test
    fun occlusionKeepAliveExpires() {
        val h = armedHarness()
        h.state.occlusionExpiry["e4"] = h.state.nowS + LONG_EXPIRY_S
        h.state.occlusionExpiry["a1"] = h.state.nowS - LONG_EXPIRY_S
        h.feed()
        assertEquals(listOf("e4"), h.state.occludedVetoed, "an expired stamp must drop out")
        assertEquals(setOf("e4"), h.state.motionOccludedSquares)
    }

    /** `test_detect_scale_half_det_size_and_e2e4` — the detection warp is `boardSize * detectScale`. */
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

    /** `:1596-1600` — the FPS EMA seeds with the first measurable interval. */
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

    // -- _RunningMean ---------------------------------------------------------------------------

    /** `test_mean_equals_stack` — the window mean equals the mean of the last `maxlen` frames. */
    @Test
    fun runningMeanEqualsWindowStack() {
        val rm = RunningMeanGray(RM_WINDOW)
        val frames = (0 until RM_FRAMES).map { randomGray(it.toLong(), RM_SIDE) }
        for (frame in frames) rm.append(frame)

        val expected = stackMean(frames.takeLast(RM_WINDOW).map { it.data })
        assertTrue(expected.contentEquals(requireNotNull(rm.meanUint8()).data))
    }

    /** `test_drift_resync_after_64` — the sum is recomputed from the full window every 64 appends. */
    @Test
    fun runningMeanResyncsAfter64Appends() {
        val rm = RunningMeanGray(RM_DRIFT_WINDOW)
        val frames = (0 until RM_DRIFT_FRAMES).map { randomGray(RM_DRIFT_SEED + it, RM_DRIFT_SIDE) }
        for (frame in frames) rm.append(frame)

        val expected = stackMean(frames.takeLast(RM_DRIFT_WINDOW).map { it.data })
        assertTrue(expected.contentEquals(requireNotNull(rm.meanUint8()).data))
    }

    /** `test_clear_and_reuse` — `clear()` drops the buffer, the sum AND the counter. */
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

    /** `mean_uint8` is `(sum / n).astype(np.uint8)` — TRUNCATION, never rounding. */
    @Test
    fun runningMeanTruncatesLikeNumpy() {
        val rm = RunningMeanBgr(RM_WINDOW)
        rm.append(bgrFrame(boardSize = RM_SIDE, level = 10))
        rm.append(bgrFrame(boardSize = RM_SIDE, level = 11))
        // (10 + 11) / 2 = 10.5 -> 10, not 11.
        assertEquals(10, requireNotNull(rm.meanUint8()).data[0].toInt() and U8)
    }

    /** `resize` mirrors Python building a fresh `_RunningMean`: a new window and an empty buffer. */
    @Test
    fun runningMeanResizeClears() {
        val rm = RunningMeanGray(RM_WINDOW)
        rm.append(grayFrame(boardSize = RM_SIDE))
        rm.resize(RM_WINDOW + 1)
        assertEquals(0, rm.size)
        assertNull(rm.meanUint8())
    }

    // -- helpers ---------------------------------------------------------------------------------

    /** A harness whose reference is already captured and whose hold has expired. */
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

    private fun stackMean(planes: List<ByteArray>): ByteArray {
        val acc = LongArray(planes[0].size)
        for (plane in planes) {
            for (i in acc.indices) acc[i] += (plane[i].toInt() and U8).toLong()
        }
        return ByteArray(acc.size) { (acc[it] / planes.size).toByte() }
    }

    private companion object {
        const val CORNER_FLOATS = 8
        const val SETTLE_FRAMES_NO_CNN = 4
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
    }
}
