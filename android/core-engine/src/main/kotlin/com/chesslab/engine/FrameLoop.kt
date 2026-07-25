package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/** Python's `_loop` divides by 1000 nowhere — the engine's clock is seconds, the seam's is ms. */
private const val MS_PER_S = 1000.0

/** `_fps` EMA weights (`tracker.py:1599`). */
private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

/** `motion_px_thr * 4` — the baseline-occlusion absdiff threshold (`tracker.py:1614`). */
private const val BASELINE_ABS_THR_FACTOR = 4.0

/** The 100 ms occlusion keep-alive that bridges hand-leaves -> motion-hold-expires (`:1621`). */
private const val OCCLUSION_KEEPALIVE_S = 0.1

/**
 * `len(core_now) > 2` (`tracker.py:1691`) — the RAW UNDILATED core only (entry.md invariant 3).
 * One genuinely strong square dilates to five and would lock the tracker in `occluded`, where
 * `_try_detect` — and with it the CNN move-vs-hand arbitration — never runs.
 */
private const val OCCLUDED_CORE_LIMIT = 2

/** `_RunningMean` recomputes its float64 sum from the full window every 64 appends (`:169`). */
private const val DRIFT_RESYNC_EVERY = 64

private const val BYTE_MASK = 0xFF

private const val BGR_CHANNELS = 3

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
 * The per-frame body of Python's `_loop` (`tracker.py:1490-1763`), detection part only — the block
 * between `_frame_seq += 1` (`:1563`) and the `state` reset (`:1696-1697`).
 *
 * Camera read, reconnect/backoff, overlay encode, the perf log and the CNN worker spawn are NOT
 * here: they are phase 05 / phase 04 concerns and none of them influences a detection decision.
 *
 * @param setRef the quiet base-truth capture (`_set_ref(cur, cur_bgr)` with `from_commit = false`),
 *   owned by phase 03d. It is a constructor dependency rather than a call into `Commit.kt` so that
 *   the loop stays testable on its own and so that 03a never reaches into a file it does not own.
 */
internal class FrameLoop(
    private val state: EngineState,
    private val setRef: (GrayImage, BgrImage?) -> Unit,
) {
    private var labBuf = ByteArray(0)
    private var hsvBuf = ByteArray(0)

    /**
     * One iteration, in Python's exact order.
     *
     * The `state`-reset of `:1696-1697` is applied **before** a `Detect` is returned, not after
     * `_try_detect` as in Python. That is equivalent and provable: between `_try_detect` and the
     * reset, Python neither reads `self.state` (the only reads are `:1611`, `:1683`, `:1696` and
     * `_cnn_tick`'s `:1879`, which runs on the observer thread) nor writes anything but `"move"`,
     * which the reset preserves (STATUS D03a-4).
     */
    fun step(input: FrameInput): FrameOutcome {
        // Invariant 14: a repeated frame diffs to zero and reads as "stable" while a hand waves.
        require(input.seq > state.lastInputSeq) {
            "frame seq ${input.seq} was already delivered (last ${state.lastInputSeq})"
        }
        state.lastInputSeq = input.seq
        state.nowS = input.timestampMs / MS_PER_S
        state.frameSeq += 1
        state.lastCorners = input.corners
        val cfg = state.config
        // Dark-frame gate (`:1577-1584`), measured on the luma BEFORE CLAHE: CLAHE amplifies
        // near-black sensor noise into phantom changed squares, and z-scores plus legality then
        // fabricate a move out of them. Measuring after CLAHE defeats the gate entirely.
        if (cfg.darkLumaThr > 0 && input.lumaPreClahe < cfg.darkLumaThr) {
            state.note = darkNote(input.lumaPreClahe, cfg.darkLumaThr)
            return FrameOutcome.Skip(SKIP_DARK)
        }
        updateFps()
        updateMotion(input)
        updateBaselineOcclusion(input)
        return if (state.motion > cfg.motionThr) motionBranch(input) else stableBranch(input)
    }

    /** `:1596-1600` — display only, but it is state and it is part of the loop's order. */
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
     * `:1602-1605`. The frame motion and the ROI motion (the margin AROUND the board, where the
     * hand is seen BEFORE it covers a square) are combined with `max`.
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
     * `:1611-1627` — per-square occlusion against the baseline reference, during the motion and
     * occlusion states. The expiry stamps are what bridge "the hand left" and "motion hold expired".
     */
    private fun updateBaselineOcclusion(input: FrameInput) {
        val ref = state.refGray
        val cfg = state.config
        if (ref != null && state.state != STATE_WAITING && state.state != STATE_MOVE) {
            val bgr = input.bgrDet
            val need = bgr.width * bgr.height * BGR_CHANNELS
            if (labBuf.size != need) labBuf = ByteArray(need)
            if (hsvBuf.size != need) hsvBuf = ByteArray(need)
            bgrToLab(bgr.data, bgr.width, bgr.height, labBuf)
            bgrToHsv(bgr.data, bgr.width, bgr.height, hsvBuf)
            val result =
                baselineOcclusionAndShadow(
                    input.grayDet,
                    ref,
                    state.detBoxes,
                    BaselineParams(state.detSize, cfg.motionPxThr * BASELINE_ABS_THR_FACTOR, state.whitePov),
                    BaselineEvidence(
                        refCodes = state.refCensusCodes(ref),
                        occlCensusThr = cfg.occlCensusThr,
                        curLab = labBuf,
                        curHsv = hsvBuf,
                        gamut = state.refGamut,
                        colorThr = cfg.occlusionColorThr,
                    ),
                )
            val expiry = state.nowS + OCCLUSION_KEEPALIVE_S
            for (square in Squares.maskToSet(result.occluded)) state.occlusionExpiry[square] = expiry
            for (square in Squares.maskToSet(result.core)) state.occlCoreExpiry[square] = expiry
            state.shadowVetoed = Squares.maskToSet(result.shadow).sorted()
        }
        // Unconditional (`:1625-1627`) — outside the guard, so the keep-alive expires on its own.
        val live = LinkedHashSet<String>()
        for ((square, expiry) in state.occlusionExpiry) {
            if (state.nowS < expiry) live.add(square)
        }
        state.motionOccludedSquares = live
        state.occludedVetoed = live.sorted()
    }

    /** `:1629-1641` — hand or camera moving: discard the buffers, hold detection off. */
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

    /** `:1643-1697` — the quiet branch: average, gate, and hand the pair to `_try_detect`. */
    private fun stableBranch(input: FrameInput): FrameOutcome {
        state.stableCount += 1
        state.grayBuf.append(input.grayDet)
        state.bgrBuf.append(input.bgrDet)
        var ready = state.stableCount >= state.settleFrames && state.nowS >= state.holdUntil
        var outcome: FrameOutcome = FrameOutcome.Skip(SKIP_SETTLING)
        if (state.grayBuf.size >= state.avgFrames) {
            // Grid-line gate FIRST, on the LATEST gray, not the mean (`:1650-1654`): a large opaque
            // object hides the board's grid lines → skip detection AND the buffer means.
            if (occludedByGrid(input.gridLineCoverage)) {
                state.occlGridActive = true
                state.state = STATE_OCCLUDED
                state.note = if (state.refGray == null) NOTE_WAITING_CLEAR else NOTE_GRID_COVERED
                outcome = FrameOutcome.Skip(SKIP_OCCLUDED)
            } else {
                if (state.occlGridActive) {
                    // Gate just cleared (`:1663-1672`): the occluder left. Double the settle hold and
                    // DROP both buffers, or residual hand pixels (half-shadows, the averaging mix)
                    // pollute the first detection after occlusion. Never "optimise" this away.
                    state.occlGridActive = false
                    state.holdUntil = max(state.holdUntil, state.nowS + state.config.motionHoldS)
                    state.grayBuf.clear()
                    state.bgrBuf.clear()
                    ready = false
                }
                outcome = stableMeans(ready)
            }
        }
        // `:1696-1697` — see the note on step(): applied before a Detect is returned.
        if (state.state != STATE_MOVE && state.state != STATE_OCCLUDED) state.state = STATE_WAITING
        return outcome
    }

    /** `:1673-1695` — the averaged pair, the base-truth capture and the raw-core state gate. */
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
                // never reference an obscured image (`:1676-1682`).
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

    /** The live RAW UNDILATED occluded core (`:1689-1690`) — never the dilated `occlusionExpiry`. */
    private fun occludedCoreCount(): Int {
        var live = 0
        for ((_, expiry) in state.occlCoreExpiry) {
            if (state.nowS < expiry) live++
        }
        return live
    }

    /** Python `_occluded_by_grid` (`tracker.py:1319-1326`); `<= 0` disables the gate entirely. */
    private fun occludedByGrid(coverage: Double): Boolean {
        val cfg = state.config
        if (cfg.minGridLineCoverage <= 0) return false
        state.gridCoverage = coverage
        return coverage < cfg.minGridLineCoverage
    }
}

/** `f"frame too dark ({luma:.0f} < {thr}) — detection paused"` (`tracker.py:1581`). */
private fun darkNote(
    luma: Double,
    thr: Double,
): String = "frame too dark (${Math.rint(luma).toLong()} < $thr) — detection paused"

/**
 * Python `_RunningMean` (`tracker.py:149-186`) over gray planes: a fixed-window running mean that
 * recomputes its float64 sum from the whole window every 64 appends to kill drift.
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

/** The shared arithmetic of both running means. */
private class PlaneMean(
    maxlen: Int,
) {
    private var window = max(1, maxlen)
    private val buf = ArrayDeque<ByteArray>()
    private var sum: DoubleArray? = null
    private var count = 0
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
        val current = sum
        if (current == null) {
            sum = DoubleArray(data.size) { (data[it].toInt() and BYTE_MASK).toDouble() }
        } else {
            if (buf.size == window) {
                val evicted = buf.removeFirst()
                for (i in current.indices) current[i] -= (evicted[i].toInt() and BYTE_MASK).toDouble()
            }
            for (i in current.indices) current[i] += (data[i].toInt() and BYTE_MASK).toDouble()
        }
        buf.addLast(data)
        count += 1
        if (count % DRIFT_RESYNC_EVERY == 0) resync()
    }

    fun clear() {
        buf.clear()
        sum = null
        count = 0
    }

    fun resize(maxlen: Int) {
        window = max(1, maxlen)
        clear()
    }

    /** `(sum / len(buf)).astype(np.uint8)` — TRUNCATION, not rounding (`tracker.py:186`). */
    fun mean(): ByteArray? {
        val current = sum
        if (current == null || buf.isEmpty()) return null
        val n = buf.size
        return ByteArray(current.size) { (current[it] / n).toInt().toByte() }
    }

    private fun resync() {
        val current = sum ?: return
        current.fill(0.0)
        for (frame in buf) {
            for (i in current.indices) current[i] += (frame[i].toInt() and BYTE_MASK).toDouble()
        }
    }
}
