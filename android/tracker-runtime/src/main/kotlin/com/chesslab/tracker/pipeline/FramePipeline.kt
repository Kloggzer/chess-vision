package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.FrameReads
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import java.util.concurrent.CompletableFuture

// THE ORDER IS BEHAVIOUR: size guard -> YUV->BGR -> lens -> detection warp -> dark gate -> gray -> ROI motion ->
// grid -> emit. The dark gate reads the sensor's luma: CLAHE turns near-black noise into phantom changes.

internal const val NOTE_WAITING_MARKERS = "waiting for markers…"

/** "Clear board" — what a disabled grid gate must never be able to act on. */
internal const val GRID_GATE_OFF = 1.0

/** The neutral end of `max(frameMotion, motionRoiScore)`. */
internal const val MOTION_UNREAD = 0.0

sealed interface FrameResult {
    data class Ready(
        val input: FrameInput,
    ) : FrameResult

    /** [note] is the user-visible reason. */
    data class Skipped(
        val note: String,
    ) : FrameResult
}

/** Behind a seam so the ORDER can be tested with fakes on a plain JVM. Generic in the host's frame type, so the
 *  order lives here once for phone and desktop. */
interface FrameStages<T> {
    fun convert(image: T)

    /** At this one point so everything downstream shares ONE coordinate space; composing it into the warps would
     *  split it. Before the board: a homography cannot represent a barrel arc. False when no lens is configured. */
    fun undistort(): Boolean = false

    /** A stage because the coordinator has no `Mat`: passing it the `ImageProxy` ran a SECOND full YUV->BGR. */
    fun publishFrame()

    /** Only AFTER [warpDetection]; the tracking screen wants the board, calibration the raw frame. */
    fun publishBoard()

    fun warpDetection(corners: FloatArray): Boolean

    fun lumaPreClahe(): Double

    fun grayDet(): GrayImage

    fun bgrDet(): BgrImage

    /** One warp, one resample: [bgrDet] scaled down smooths twice and loses the grey-level contrast an engine
     *  measures. Costs a warp per call. */
    fun boardAt(size: Int): BgrImage? = null

    fun gridCoverage(): Double

    fun roiMotion(corners: FloatArray): Double

    fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    )

    fun onConfigChanged(config: TrackerConfig)

    fun onGeometryChanged(geometry: BoardGeometry)

    fun close()
}

/** NEVER blocks on the CNN and never runs marker detection: ArUco on the frame thread cost 44-87 ms every 300 ms. */
class FramePipeline<T>(
    private var config: TrackerConfig,
    private val stages: FrameStages<T>,
    private val cropStore: CropFrameStore,
    private val sizeGuard: FrameSizeGuard,
    private val timings: StageTimings = StageTimings(),
) {
    /** Source pixels, `[a8, h8, h1, a1]`. Swapped by the service. */
    @Volatile
    var corners: FloatArray? = null

    /** A field, not a constructor argument: `TrackerStack` builds the host AFTER this pipeline. */
    @Volatile
    var reads: FrameReads = FrameReads()

    private var seq = 0L
    private var sourceSeq = 0L
    private var luma = 0.0

    private var emitted: FrameInput? = null

    fun lastLuma(): Double = luma

    /** One owner is fewer ways for the two to disagree. */
    val sizeMismatch: SizeMismatch? get() = sizeGuard.mismatch

    fun setProfile(
        name: String,
        width: Int,
        height: Int,
    ) = sizeGuard.setProfile(name, width, height)

    /** The frame clock is started by the coordinator; marking [Stage.TOTAL] on the skip path keeps a skipped frame
     *  from reporting the previous frame's cost. */
    fun onFrame(
        image: T,
        width: Int,
        height: Int,
        timestampMs: Long,
    ): FrameResult =
        WorkProfiler.span(WorkOperation.FRAME, ++sourceSeq) {
            // Read off the frame that ARRIVED, never the request: a wrong size poisons every warp silently.
            sizeGuard.note(width, height)
            // ONE read of the volatile per frame: LiveAlign swaps it from its own thread, and a mixed frame hides
            // the swap from `cornersJumped`.
            val pts = corners
            val note = readFrame(image, pts)
            if (note != null) {
                if (note == NOTE_WAITING_MARKERS) skippedWaitingMarkers += 1 else skippedDark += 1
            }
            if (note != null) emitted = null
            val result = if (note != null) FrameResult.Skipped(note) else emit(requireNotNull(pts), timestampMs)
            timings.mark(Stage.TOTAL)
            result
        }

    /** A fresh candidate wants its verifying observation now. EXTRA: the regular request stays standing — a
     *  shifted cadence lost 45 plies of 20-57-45 to a parity-sensitive alarm recovery. */
    fun cropFrameNow(): Boolean {
        val input = emitted ?: return false
        if (!config.verifyObserveNow || !cropStore.idle) return false
        stages.updateCropFrame(input.corners, input.seq, input.timestampMs, input.bgrDet, input.grayDet)
        cropStore.request()
        return true
    }

    /** AFTER the engine tick: only the observer reads it, so the decision no longer waits its 7 ms. */
    fun cropWarpAfterTick(verifyWaiting: Boolean) {
        val input = emitted ?: return
        if (cropStore.wantsFrame()) {
            stages.updateCropFrame(input.corners, input.seq, input.timestampMs, input.bgrDet, input.grayDet)
            cropStore.served()
        } else if (verifyWaiting) {
            cropFrameNow()
        }
    }

    var skippedWaitingMarkers = 0L
        private set
    var skippedDark = 0L
        private set

    fun onConfigChanged(newConfig: TrackerConfig) {
        config = newConfig
        stages.onConfigChanged(newConfig)
    }

    fun onGeometryChanged(geometry: BoardGeometry) {
        stages.onGeometryChanged(geometry)
    }

    fun close() {
        stages.close()
        cropStore.close()
    }

    /** The convert runs BEFORE the corners check: calibration needs pixels exactly while corners are missing. */
    private fun readFrame(
        image: T,
        pts: FloatArray?,
    ): String? {
        stages.convert(image)
        timings.mark(Stage.CONVERT)
        if (stages.undistort()) timings.mark(Stage.LENS)
        stages.publishFrame()
        timings.mark(Stage.PUBLISH)
        if (pts == null || !stages.warpDetection(pts)) return NOTE_WAITING_MARKERS
        stages.publishBoard()
        timings.mark(Stage.WARP)
        luma = stages.lumaPreClahe()
        return darkNote()
    }

    /** `seq` counts EMITTED frames only — the engine requires it to increase. */
    private fun emit(
        pts: FloatArray,
        timestampMs: Long,
    ): FrameResult {
        // ROI motion reads the raw frame with its own scratch, so it runs beside the detection chain.
        val motionTask = if (reads.roiMotion) CompletableFuture.supplyAsync { stages.roiMotion(pts) } else null
        val gray = stages.grayDet()
        val bgr = stages.bgrDet()
        timings.mark(Stage.GRAY)
        val coverage = gridCoverage()
        timings.mark(Stage.GRID)
        val motion = motionTask?.join() ?: MOTION_UNREAD
        timings.mark(Stage.MOTION)
        seq += 1
        val input = FrameInput(seq, gray, bgr, pts, motion, coverage, luma, timestampMs, board = stages::boardAt)
        emitted = input
        return FrameResult.Ready(input)
    }

    /** Skipped when the gate is off or the engine never reads it; [GRID_GATE_OFF] cannot gate anything. */
    private fun gridCoverage(): Double = if (wantsCoverage()) stages.gridCoverage() else GRID_GATE_OFF

    private fun wantsCoverage(): Boolean = reads.gridCoverage && config.minGridLineCoverage > 0

    private fun darkNote(): String? =
        if (config.darkLumaThr > 0 && luma < config.darkLumaThr) {
            "frame too dark (${Math.rint(luma).toLong()} < ${config.darkLumaThr}) — detection paused"
        } else {
            null
        }
}
