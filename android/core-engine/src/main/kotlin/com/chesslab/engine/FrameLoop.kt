package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/** Python's `_loop` divides by 1000 nowhere — the engine's clock is seconds, the seam's is ms. */
private const val MS_PER_S = 1000.0

/** `_fps` EMA weights. */
private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

/** `motion_px_thr * 4` — the baseline-occlusion absdiff threshold. */
private const val BASELINE_ABS_THR_FACTOR = 4.0

/** The 100 ms occlusion keep-alive that bridges hand-leaves -> motion-hold-expires. */
private const val OCCLUSION_KEEPALIVE_S = 0.1

/**
 * `len(core_now) > 2` — the RAW UNDILATED core only (entry.md invariant 3). One genuinely strong
 * square dilates to five and would lock the tracker in `occluded`, where `_try_detect` — and with
 * it the CNN move-vs-hand arbitration — never runs.
 */
private const val OCCLUDED_CORE_LIMIT = 2

private const val BYTE_MASK = 0xFF

/** `sum` of `n` bytes lives in `0 until 256 * n` — the size of [PlaneMean]'s division table. */
private const val U8_LEVELS = 256

internal const val NOTE_WAITING_CLEAR = "waiting for clear view of the board…"

internal const val NOTE_GRID_COVERED =
    "Board partly covered (grid lines hidden) — waiting for clear view"

internal const val SKIP_DARK = "dark"

internal const val SKIP_MOVING = "moving"

internal const val SKIP_SETTLING = "settling"

internal const val SKIP_OCCLUDED = "occluded"

/**
 * What one frame-loop iteration decided. `Detect` means `_try_detect` must run on the averaged
 * pair (phase 03d wires it); `Skip` means the frame produced no detection evidence.
 */
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

/**
 * The per-frame body of Python's `_loop`, detection part only — the block between `_frame_seq += 1`
 * and the `state` reset.
 *
 * Camera read, reconnect/backoff, overlay encode, the perf log and the CNN worker spawn are NOT
 * here: none of them influences a detection decision.
 *
 * @param setRef the quiet base-truth capture (`_set_ref(cur, cur_bgr)` with `from_commit = false`),
 *   injected so the loop stays testable on its own.
 */
internal class FrameLoop(
    private val state: EngineState,
    private val setRef: (GrayImage, BgrImage?) -> Unit,
) {
    /**
     * One iteration, in Python's exact order.
     *
     * The trailing `state`-reset is applied **before** a `Detect` is returned, not after
     * `_try_detect` as in Python. That is equivalent and provable: between `_try_detect` and the
     * reset, Python neither reads `self.state` nor writes anything but `"move"`, which the reset
     * preserves (STATUS D03a-4).
     */
    fun step(input: FrameInput): FrameOutcome {
        // Invariant 14: a repeated frame diffs to zero and reads as "stable" while a hand waves.
        require(input.seq > state.lastInputSeq) {
            "frame seq ${input.seq} was already delivered (last ${state.lastInputSeq})"
        }
        // `detSize` is computed TWICE in this app — here from `config.boardSize * detectScale`,
        // and in the frame pipeline from the CALIBRATION PROFILE's board size. They agreed only
        // because both happened to be 1600. The moment the profile's size is measured rather than
        // assumed they can diverge, and a divergence is silent: the engine reads square boxes at
        // one scale out of a plane rendered at another, so every square is the wrong square.
        require(input.grayDet.width == state.detSize && input.grayDet.height == state.detSize) {
            "detection plane is ${input.grayDet.width}x${input.grayDet.height}, " +
                "but the engine indexes squares for ${state.detSize} " +
                "(config.boardSize=${state.config.boardSize}, detectScale=${state.config.detectScale})"
        }
        state.lastInputSeq = input.seq
        state.nowS = input.timestampMs / MS_PER_S
        state.frameSeq += 1
        state.lastCorners = input.corners
        val cfg = state.config
        // Dark-frame gate, measured on the luma BEFORE CLAHE: CLAHE amplifies near-black sensor
        // noise into phantom changed squares, and z-scores plus legality then fabricate a move out
        // of them. Measuring after CLAHE defeats the gate entirely.
        if (cfg.darkLumaThr > 0 && input.lumaPreClahe < cfg.darkLumaThr) {
            state.note = darkNote(input.lumaPreClahe, cfg.darkLumaThr)
            return FrameOutcome.Skip(SKIP_DARK)
        }
        updateFps()
        updateMotion(input)
        updateBaselineOcclusion(input)
        return when {
            state.motion <= cfg.motionThr -> stableBranch(input)
            // EXPERIMENT (`handTolerantCells`): motion the grid map can LOCATE as a hand no longer
            // stops detection — the per-square vetoes downstream decide what that hand costs.
            state.locatedHand() != 0L -> throughLocatedHand(input)
            else -> motionBranch(input)
        }
    }

    /** Display only, but it is state and it is part of the loop's order. */
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

    /**
     * The frame motion and the ROI motion (the margin AROUND the board, where the hand is seen
     * BEFORE it covers a square) are combined with `max`.
     */
    private fun updateMotion(input: FrameInput) {
        val prev = state.prevGray
        // Python seeds `prev_gray` with the current frame on the first iteration. A size change
        // (resolution renegotiated live) is treated the same way instead of throwing (D03a-6).
        val usable = if (prev != null && prev.data.size == input.grayDet.data.size) prev else input.grayDet
        val frameMotion = motionScore(usable.data, input.grayDet.data, state.config.motionPxThr)
        state.prevGray = input.grayDet
        state.motion = max(frameMotion, input.motionRoiScore)
    }

    /**
     * Per-square occlusion against the baseline reference, during the motion and occlusion states.
     * The expiry stamps are what bridge "the hand left" and "motion hold expired".
     */
    private fun updateBaselineOcclusion(input: FrameInput) {
        val ref = state.refGray
        val cfg = state.config
        // A calibration/profile update can replace the detection plane while an earlier baseline is
        // still live. Comparing pixels from two differently sized warps is meaningless and used to
        // throw here, which made the camera source drop every following frame. Drop the visual
        // reference and let the normal stable-frame path establish a fresh one on this geometry.
        if (ref != null && (ref.width != input.grayDet.width || ref.height != input.grayDet.height)) {
            state.discardVisualReference()
            state.note = NOTE_WAITING_CLEAR
            return
        }
        if (ref != null && state.state != STATE_WAITING && state.state != STATE_MOVE) {
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
        // Unconditional — outside the guard, so the keep-alive expires on its own.
        val live = state.liveExpiry(state.occlusionExpiry)
        state.motionOccluded = live
        state.occludedVetoed = live
        state.expireStalledVerify()
    }

    /**
     * The experiment's branch: `motionBranch`'s bookkeeping without the two lines that END the
     * frame — the buffers survive (there is nothing to diff without them) and no `Skip` is
     * returned. `requireMotionForMove` still has to see this frame as motion, or the commit it
     * protects would be refused as drift.
     */
    private fun throughLocatedHand(input: FrameInput): FrameOutcome {
        state.motionSinceRef = true
        state.lastMotionTs = state.nowS
        state.holdUntil = state.nowS + state.config.motionHoldS
        return stableBranch(input)
    }

    /** Hand or camera moving: discard the buffers, hold detection off. */
    private fun motionBranch(input: FrameInput): FrameOutcome {
        val cfg = state.config
        state.stableCount = 0
        // A hand entered → a real move is now possible; commits must follow motion promptly.
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
        state.holdUntil = state.nowS + cfg.motionHoldS
        return FrameOutcome.Skip(SKIP_MOVING)
    }

    /** The quiet branch: average, gate, and hand the pair to `_try_detect`. */
    private fun stableBranch(input: FrameInput): FrameOutcome {
        state.stableCount += 1
        state.grayBuf.append(input.grayDet)
        state.bgrBuf.append(input.bgrDet)
        var ready = state.stableCount >= state.settleFrames && state.nowS >= state.holdUntil
        var outcome: FrameOutcome = FrameOutcome.Skip(SKIP_SETTLING)
        if (state.grayBuf.size >= state.avgFrames) {
            // Grid-line gate FIRST, on the LATEST gray, not the mean: a large opaque object hides
            // the board's grid lines → skip detection AND the buffer means.
            if (occludedByGrid(input.gridLineCoverage)) {
                state.occlGridActive = true
                state.state = STATE_OCCLUDED
                state.note = if (state.refGray == null) NOTE_WAITING_CLEAR else NOTE_GRID_COVERED
                outcome = FrameOutcome.Skip(SKIP_OCCLUDED)
            } else {
                if (state.occlGridActive) {
                    // Gate just cleared: the occluder left. Double the settle hold and DROP both
                    // buffers, or residual hand pixels (half-shadows, the averaging mix) pollute
                    // the first detection after occlusion. Never "optimise" this away.
                    state.occlGridActive = false
                    state.holdUntil = max(state.holdUntil, state.nowS + state.config.occluderHoldS)
                    state.grayBuf.clear()
                    state.bgrBuf.clear()
                    ready = false
                }
                outcome = stableMeans(ready)
            }
        }
        // See the note on step(): applied before a Detect is returned.
        if (state.state != STATE_MOVE && state.state != STATE_OCCLUDED) state.state = STATE_WAITING
        return outcome
    }

    /** The averaged pair, the base-truth capture and the raw-core state gate. */
    private fun stableMeans(ready: Boolean): FrameOutcome {
        val cur = state.grayBuf.meanUint8()
        val curBgr = state.bgrBuf.meanUint8()
        // Python assigns unconditionally, including the `None` right after a buffer clear.
        state.lastCur = cur
        state.lastCurBgr = curBgr
        var outcome: FrameOutcome = FrameOutcome.Skip(SKIP_SETTLING)
        if (cur != null) {
            if (state.refGray == null) {
                // Initial / re-capture of base truth: wait for a clear, long enough stable view —
                // never reference an obscured image.
                if (ready) setRef(cur, curBgr) else state.note = NOTE_WAITING_CLEAR
            } else if (ready && state.state != STATE_MOVE) {
                outcome =
                    if (occludedCoreCount() > OCCLUDED_CORE_LIMIT) {
                        state.state = STATE_OCCLUDED
                        FrameOutcome.Skip(SKIP_OCCLUDED)
                    } else {
                        // seq = newest frame in the averaged buffer (decision signature, Spec 11).
                        FrameOutcome.Detect(cur, curBgr, state.frameSeq)
                    }
            }
        }
        return outcome
    }

    /** The live RAW UNDILATED occluded core — never the dilated `occlusionExpiry`. */
    private fun occludedCoreCount(): Int = state.liveExpiry(state.occlCoreExpiry).countOneBits()

    /** Python `_occluded_by_grid`; `<= 0` disables the gate entirely. */
    private fun occludedByGrid(coverage: Double): Boolean {
        val cfg = state.config
        if (cfg.minGridLineCoverage <= 0) return false
        state.gridCoverage = coverage
        return coverage < cfg.minGridLineCoverage
    }
}

/** `f"frame too dark ({luma:.0f} < {thr}) — detection paused"`. */
private fun darkNote(
    luma: Double,
    thr: Double,
): String = "frame too dark (${Math.rint(luma).toLong()} < $thr) — detection paused"

/**
 * Python `_RunningMean` over gray planes: a fixed-window running mean.
 *
 * Appended planes are stored by REFERENCE, exactly like Python — the frame source must hand the
 * engine a fresh buffer per frame (entry.md invariant 14).
 */
internal class RunningMeanGray(
    maxlen: Int,
) {
    private val impl = PlaneMean(maxlen)

    val size: Int get() = impl.size

    fun append(image: GrayImage) = impl.append(image.data, image.width, image.height)

    fun clear() = impl.clear()

    /** New window length; drops everything buffered (Python builds a fresh `_RunningMean`). */
    fun resize(maxlen: Int) = impl.resize(maxlen)

    fun meanUint8(): GrayImage? = impl.mean()?.let { GrayImage(impl.width, impl.height, it) }
}

/** [RunningMeanGray] for interleaved BGR planes (`_bgr_buf`). */
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

/**
 * The shared arithmetic of both running means.
 *
 * The accumulator is an `IntArray`, not Python's float64: a window of at most a handful of `uint8`
 * planes sums to well under 2^31, so the sum is EXACT and the truncating division `sum / n` lands
 * on the same byte as `(sum.toDouble() / n).toInt()` does. That is also why Python's periodic
 * re-sum from the whole window has no counterpart here — it exists to kill float drift, and there
 * is none to kill. Halving the accumulator's width matters: the BGR plane is 1.92 MB at 800x800,
 * so the float64 version touched 15.4 MB per frame and blew every cache level.
 *
 * The buffer also SURVIVES [clear], which the frame loop calls on every motion frame — allocating
 * a fresh multi-megabyte accumulator on the first stable frame after each hand movement was a
 * large-object-space churn the collector then had to chase.
 */
private class PlaneMean(
    maxlen: Int,
) {
    private var window = max(1, maxlen)
    private val buf = ArrayDeque<ByteArray>()
    private var sum = IntArray(0)

    /** `sum -> sum / divisor` for every reachable sum; see [mean]. */
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
            // Evict and add in ONE pass. Two passes over a 1.92 MB BGR plane's 7.7 MB accumulator
            // read and wrote it twice for an update that is a single subtraction.
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

    /**
     * `(sum / len(buf)).astype(np.uint8)` — TRUNCATION, not rounding.
     *
     * The division goes through a table because the window is tiny (2 to 4 frames) while the plane
     * is not: every reachable sum is `0..255 * n`, so a ~1 KB lookup that stays in L1 replaces an
     * integer division on each of 1.92 million BGR bytes. The table is rebuilt only when the
     * window length changes, which happens on a config change and while the buffer fills.
     */
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
