package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import kotlin.math.max

private const val MS_PER_S = 1000.0

private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

private const val BASELINE_ABS_THR_FACTOR = 4.0

/** Bridges "the hand left" -> "the motion hold expired". */
private const val OCCLUSION_KEEPALIVE_S = 0.1

/** The RAW UNDILATED core (invariant 3): one strong square dilates to five and would lock `occluded`, where
 *  the CNN arbitration never runs. */
private const val OCCLUDED_CORE_LIMIT = 2

private const val BYTE_MASK = 0xFF

private const val U8_LEVELS = 256

internal const val NOTE_WAITING_CLEAR = "waiting for clear view of the board…"

internal const val NOTE_GRID_COVERED =
    "Board partly covered (grid lines hidden) — waiting for clear view"

internal const val SKIP_DARK = "dark"

internal const val SKIP_MOVING = "moving"

internal const val SKIP_SETTLING = "settling"

internal const val SKIP_OCCLUDED = "occluded"

internal sealed interface FrameOutcome {
    data class Detect(
        val cur: GrayImage,
        val curBgr: BgrImage?,
        val seq: Long,
    ) : FrameOutcome

    data class Skip(
        val reason: String,
    ) : FrameOutcome
}

/** No camera, overlay, perf log or CNN spawn here: none of them influences a detection decision. */
internal class FrameLoop(
    private val state: EngineState,
    private val setRef: (GrayImage, BgrImage?) -> Unit,
) {
    /** The trailing `state` reset is applied **before** a `Detect` is returned: equivalent, because in between
     *  nothing reads `state` and nothing writes anything but `"move"`, which the reset preserves. */
    fun step(input: FrameInput): FrameOutcome {
        // Invariant 14: a repeated frame diffs to zero and reads as "stable" while a hand waves.
        require(input.seq > state.lastInputSeq) {
            "frame seq ${input.seq} was already delivered (last ${state.lastInputSeq})"
        }
        // `detSize` is computed TWICE: here from the config, in the pipeline from the calibration profile. A
        // divergence is silent — boxes read at one scale out of a plane rendered at another.
        require(input.grayDet.width == state.detSize && input.grayDet.height == state.detSize) {
            "detection plane is ${input.grayDet.width}x${input.grayDet.height}, " +
                "but the engine indexes squares for ${state.detSize} " +
                "(config.boardSize=${state.config.boardSize}, detectScale=${state.config.detectScale})"
        }
        state.lastInputSeq = input.seq
        state.nowS = input.timestampMs / MS_PER_S
        // The producer's sequence: CNN snapshots carry `FrameInput.seq`, and a second domain lets an OLDER
        // observation satisfy `snap.seq >= pending.seq`.
        state.frameSeq = input.seq
        state.lastCorners = input.corners
        val cfg = state.config
        // BEFORE CLAHE: it amplifies near-black sensor noise into phantom changed squares.
        if (cfg.darkLumaThr > 0 && input.lumaPreClahe < cfg.darkLumaThr) {
            state.note = darkNote(input.lumaPreClahe, cfg.darkLumaThr)
            return FrameOutcome.Skip(SKIP_DARK)
        }
        updateFps()
        updateMotion(input)
        updateBaselineOcclusion(input)
        return if (state.motion <= cfg.motionThr) stableBranch(input) else motionBranch(input)
    }

    private fun updateFps() {
        val last = state.lastLoopTs
        if (last != 0.0) {
            val dt = state.nowS - last
            if (dt > 0) {
                val instant = 1.0 / dt
                state.fps = if (state.fps != 0.0) FPS_EMA_OLD * state.fps + FPS_EMA_NEW * instant else instant
            }
        }
        state.lastLoopTs = state.nowS
    }

    /** The ROI margin sees the hand BEFORE it covers a square; combined with `max`. */
    private fun updateMotion(input: FrameInput) {
        val prev = state.prevGray
        // First iteration and a live resolution change alike: seed from the current frame, never throw.
        val usable = if (prev != null && prev.data.size == input.grayDet.data.size) prev else input.grayDet
        val frameMotion = motionScore(usable.data, input.grayDet.data, state.config.motionPxThr)
        state.prevGray = input.grayDet
        state.motion = max(frameMotion, input.motionRoiScore)
    }

    /** NOT in the core-gated occluded state: refreshing there re-flags a quiet board that merely differs from
     *  the reference (a played move), and the state never exits without motion. */
    private fun updateBaselineOcclusion(input: FrameInput) {
        val ref = state.refGray
        val cfg = state.config
        // A calibration can replace the detection plane under a live baseline; two differently sized warps threw
        // here and the camera source dropped every following frame.
        if (ref != null && (ref.width != input.grayDet.width || ref.height != input.grayDet.height)) {
            state.discardVisualReference()
            state.note = NOTE_WAITING_CLEAR
            return
        }
        // AUS heisst auch kein Schattenveto aus `applyVetoes`, das hier sonst wieder ueberschrieben wuerde.
        if (!cfg.baselineOcclusion) state.shadowVetoed = 0L
        if (cfg.baselineOcclusion && ref != null && (state.state == STATE_MOVING || state.occlGridActive)) {
            val result =
                state.baselineScratch.baselineOcclusionAndShadow(
                    input.grayDet,
                    ref,
                    state.detBoxes,
                    state.detSize,
                    cfg.motionPxThr * BASELINE_ABS_THR_FACTOR,
                    state.whitePov,
                    BaselineEvidence(
                        refCodes = state.refCensusCodes(ref),
                        occlCensusThr = cfg.occlCensusThr,
                        curBgr = input.bgrDet,
                        gamut = state.refGamut,
                        colorThr = cfg.occlusionColorThr,
                    ),
                )
            val expiry = state.nowS + OCCLUSION_KEEPALIVE_S
            result.occluded.forEachSquare { state.occlusionExpiry[it] = expiry }
            result.core.forEachSquare { state.occlCoreExpiry[it] = expiry }
            state.shadowVetoed = result.shadow
        }
        // Unconditional, outside the guard, so the keep-alive expires on its own.
        val live = state.liveExpiry(state.occlusionExpiry)
        state.motionOccluded = live
        state.occludedVetoed = live
        state.expireStalledVerify()
    }

    private fun motionBranch(input: FrameInput): FrameOutcome {
        val cfg = state.config
        state.stableCount = 0
        state.restSettled = false
        state.motionSinceRef = true
        state.lastMotionTs = state.nowS
        state.confirmer.reset()
        state.grayBuf.clear()
        state.bgrBuf.clear()
        if (occludedByGrid(input.gridLineCoverage)) {
            state.state = STATE_OCCLUDED
            state.occlGridActive = true
        } else {
            state.state = STATE_MOVING
        }
        state.refHoldUntil = state.nowS + cfg.motionHoldS
        state.holdUntil = state.nowS + (cfg.commitHoldS ?: cfg.motionHoldS)
        return FrameOutcome.Skip(SKIP_MOVING)
    }

    private fun stableBranch(input: FrameInput): FrameOutcome {
        state.stableCount += 1
        state.grayBuf.append(input.grayDet)
        state.bgrBuf.append(input.bgrDet)
        var ready = state.stableCount >= state.settleFrames && state.nowS >= state.holdUntil
        var outcome: FrameOutcome = FrameOutcome.Skip(SKIP_SETTLING)
        if (state.grayBuf.size >= state.avgFrames) {
            // Grid gate FIRST, on the LATEST gray: a large opaque object hides the grid lines.
            if (occludedByGrid(input.gridLineCoverage)) {
                state.occlGridActive = true
                state.state = STATE_OCCLUDED
                state.note = if (state.refGray == null) NOTE_WAITING_CLEAR else NOTE_GRID_COVERED
                outcome = FrameOutcome.Skip(SKIP_OCCLUDED)
            } else {
                if (state.occlGridActive) {
                    // The occluder left: double the settle hold and DROP both buffers, or residual hand pixels pollute the
                    // first detection. Never "optimise" this away.
                    state.occlGridActive = false
                    // The tail below only resets a state that is neither MOVE nor OCCLUDED: `occluded` survived until the next
                    // MOTION frame, and with it the periodic CNN check stayed off.
                    state.state = STATE_WAITING
                    state.holdUntil = max(state.holdUntil, state.nowS + state.config.occluderHoldS)
                    state.refHoldUntil = max(state.refHoldUntil, state.nowS + state.config.occluderHoldS)
                    state.grayBuf.clear()
                    state.bgrBuf.clear()
                    ready = false
                }
                outcome = stableMeans(ready)
            }
        }
        if (state.state != STATE_MOVE && state.state != STATE_OCCLUDED) state.state = STATE_WAITING
        return outcome
    }

    private fun stableMeans(ready: Boolean): FrameOutcome {
        val cur = state.grayBuf.meanUint8()
        val curBgr = state.bgrBuf.meanUint8()
        state.lastCur = cur
        state.lastCurBgr = curBgr
        var outcome: FrameOutcome = FrameOutcome.Skip(SKIP_SETTLING)
        if (cur != null) {
            // The reference always waits for the FULL motion hold, whatever `commitHoldS` opened.
            val refReady = ready && state.nowS >= state.refHoldUntil
            if (state.refGray == null) {
                // Never reference an obscured image: wait for a clear, long enough stable view.
                if (refReady) setRef(cur, curBgr) else state.note = NOTE_WAITING_CLEAR
            } else if (refReady && state.refProvisionalUntil > 0.0 && !state.motionSinceRef) {
                // The frame the full hold would have committed on becomes the reference instead of the hand's tail.
                state.setRef(cur, curBgr, fromCommit = true)
                state.refProvisionalUntil = 0.0
            } else if (ready && state.state != STATE_MOVE) {
                if (!state.restSettled) {
                    state.restSettled = true
                    state.motionEpoch += 1
                }
                outcome =
                    if (occludedCoreCount() > OCCLUDED_CORE_LIMIT) {
                        state.state = STATE_OCCLUDED
                        FrameOutcome.Skip(SKIP_OCCLUDED)
                    } else {
                        FrameOutcome.Detect(cur, curBgr, state.frameSeq)
                    }
            }
        }
        return outcome
    }

    /** Never the dilated `occlusionExpiry`. */
    private fun occludedCoreCount(): Int = state.liveExpiry(state.occlCoreExpiry).countOneBits()

    private fun occludedByGrid(coverage: Double): Boolean {
        val cfg = state.config
        if (cfg.minGridLineCoverage <= 0) return false
        state.gridCoverage = coverage
        return coverage < cfg.minGridLineCoverage
    }
}

private fun darkNote(
    luma: Double,
    thr: Double,
): String = "frame too dark (${Math.rint(luma).toLong()} < $thr) — detection paused"

/** Planes are stored by REFERENCE: the source must hand over a fresh buffer per frame (invariant 14). */
internal class RunningMeanGray(
    maxlen: Int,
) {
    private val impl = PlaneMean(maxlen)

    val size: Int get() = impl.size

    fun append(image: GrayImage) = impl.append(image.data, image.width, image.height)

    fun clear() = impl.clear()

    fun resize(maxlen: Int) = impl.resize(maxlen)

    fun meanUint8(): GrayImage? = impl.mean()?.let { GrayImage(impl.width, impl.height, it) }
}

internal class RunningMeanBgr(
    maxlen: Int,
) {
    private val impl = PlaneMean(maxlen)

    val size: Int get() = impl.size

    fun append(image: BgrImage) = impl.append(image.data, image.width, image.height)

    fun clear() = impl.clear()

    fun resize(maxlen: Int) = impl.resize(maxlen)

    fun meanUint8(): BgrImage? = impl.mean()?.let { BgrImage(impl.width, impl.height, it) }
}

/** An `IntArray` accumulator: a handful of `uint8` planes sums EXACTLY under 2^31, without float64's
 *  15.4 MB per frame. The buffer SURVIVES [clear], so motion frames do not churn large objects. */
private class PlaneMean(
    maxlen: Int,
) {
    private var window = max(1, maxlen)
    private val buf = ArrayDeque<ByteArray>()
    private var sum = IntArray(0)

    private var divisor = 0
    private var divTable = ByteArray(0)
    var width = 0
        private set
    var height = 0
        private set

    val size: Int get() = buf.size

    fun append(
        data: ByteArray,
        w: Int,
        h: Int,
    ) {
        if (w != width || h != height) {
            clear()
            width = w
            height = h
        }
        if (sum.size != data.size) sum = IntArray(data.size)
        if (buf.isEmpty()) {
            for (i in sum.indices) sum[i] = data[i].toInt() and BYTE_MASK
        } else if (buf.size == window) {
            // Evict and add in ONE pass over the 7.7 MB accumulator.
            val evicted = buf.removeFirst()
            for (i in sum.indices) sum[i] += (data[i].toInt() and BYTE_MASK) - (evicted[i].toInt() and BYTE_MASK)
        } else {
            for (i in sum.indices) sum[i] += data[i].toInt() and BYTE_MASK
        }
        buf.addLast(data)
    }

    fun clear() = buf.clear()

    fun resize(maxlen: Int) {
        window = max(1, maxlen)
        clear()
    }

    /** TRUNCATION, not rounding. Every reachable sum is `0..255 * n` (n = 2..4), so a ~1 KB table replaces an
     *  integer division on each of 1.92 million bytes. */
    fun mean(): ByteArray? {
        if (buf.isEmpty()) return null
        val n = buf.size
        if (divisor != n) {
            divTable = ByteArray(U8_LEVELS * n) { (it / n).toByte() }
            divisor = n
        }
        val table = divTable
        val out = ByteArray(sum.size)
        for (i in out.indices) out[i] = table[sum[i]]
        return out
    }
}
