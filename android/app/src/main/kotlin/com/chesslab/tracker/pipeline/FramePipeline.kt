package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry

// One camera frame -> one `FrameInput`. Port of the per-frame order in `tracker.py::_loop`,
// between `_note_frame_size` and the detection state machine. THE ORDER IS BEHAVIOUR:
//
//   size guard -> YUV->BGR -> detection warp -> dark gate -> gray -> ROI motion -> grid -> emit
//
// The dark gate sits BEFORE `_gray` because it must read the luma the sensor delivered: CLAHE
// turns near-black noise into phantom changed squares, so a post-CLAHE measurement gates nothing.

internal const val NOTE_WAITING_MARKERS = "waiting for markers…"

/** "Clear board" — what a disabled grid gate must never be able to act on. */
internal const val GRID_GATE_OFF = 1.0

/** What one camera frame produced. */
sealed interface FrameResult {
    data class Ready(
        val input: FrameInput,
    ) : FrameResult

    /** No detection this frame; [note] is the user-visible reason. */
    data class Skipped(
        val note: String,
    ) : FrameResult
}

/**
 * The OpenCV-backed steps, behind a seam so the ORDER above can be tested with fakes on a
 * plain JVM. Stateful: each stage reads what the previous one wrote (see [CameraStages]).
 */
interface FrameStages {
    fun convert(image: ImageProxy)

    /** False when no usable detection warp could be produced (no frame, degenerate geometry). */
    fun warpDetection(corners: FloatArray): Boolean

    fun lumaPreClahe(): Double

    fun grayDet(): GrayImage

    fun bgrDet(): BgrImage

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

/**
 * Turns `ImageProxy` frames into `FrameInput`s on the analyzer thread.
 *
 * It NEVER blocks on the CNN and never runs marker detection: the corners are whatever the
 * service last published into [corners] (commit 4a7609e — ArUco on the frame thread cost
 * 44-87 ms every 300 ms), and the CNN gets a crop frame only when [CropFrameStore] asks for one.
 */
class FramePipeline(
    private var config: TrackerConfig,
    private val stages: FrameStages,
    private val cropStore: CropFrameStore,
    private val sizeGuard: FrameSizeGuard,
    private val timings: StageTimings = StageTimings(),
) {
    /** Board corners in source-image pixels, `[a8, h8, h1, a1]`. Swapped by the service. */
    @Volatile
    var corners: FloatArray? = null

    private var seq = 0L
    private var luma = 0.0

    fun onFrame(
        image: ImageProxy,
        timestampMs: Long,
    ): FrameResult {
        timings.begin()
        // The delivered size is the only trustworthy one; a change invalidates the profile.
        sizeGuard.note(image.width, image.height)
        val note = readFrame(image)
        return if (note != null) FrameResult.Skipped(note) else emit(timestampMs)
    }

    /**
     * The engine has returned. It runs on the analyzer thread AFTER [onFrame], so the frame is
     * only over here — and a budget that stops at [Stage.TOTAL] measures a third of it (D-perf).
     */
    fun onEngineDone() = timings.endOfFrame()

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

    /** Steps 1-5: convert, warp, dark gate. Returns the skip note, or null when usable. */
    private fun readFrame(image: ImageProxy): String? {
        val pts = corners ?: return NOTE_WAITING_MARKERS
        stages.convert(image)
        timings.mark(Stage.CONVERT)
        if (!stages.warpDetection(pts)) return NOTE_WAITING_MARKERS
        timings.mark(Stage.WARP)
        luma = stages.lumaPreClahe()
        return darkNote()
    }

    /** Steps 6-10. `seq` counts EMITTED frames only — the engine requires it to increase. */
    private fun emit(timestampMs: Long): FrameResult {
        val pts = requireNotNull(corners)
        val gray = stages.grayDet()
        val bgr = stages.bgrDet()
        timings.mark(Stage.GRAY)
        val motion = stages.roiMotion(pts)
        timings.mark(Stage.MOTION)
        val coverage = gridCoverage()
        timings.mark(Stage.GRID)
        seq += 1
        // Last, and only on demand: the bordered full-resolution warp is the expensive one.
        if (cropStore.wantsFrame()) {
            stages.updateCropFrame(pts, seq, timestampMs, bgr, gray)
            cropStore.served()
        }
        timings.mark(Stage.TOTAL)
        return FrameResult.Ready(FrameInput(seq, gray, bgr, pts, motion, coverage, luma, timestampMs))
    }

    /**
     * Python computes the coverage inside `_occluded_by_grid`, i.e. only in the branches that
     * consult it; here it is a plain `FrameInput` field, so the app cannot see the engine's
     * branch. What it CAN see is the gate being switched off — `minGridLineCoverage <= 0` is the
     * engine's own first line, before it even reads the value — and then the Canny pass is pure
     * waste. Any value would do; [GRID_GATE_OFF] is the one that cannot gate anything.
     */
    private fun gridCoverage(): Double = if (config.minGridLineCoverage > 0) stages.gridCoverage() else GRID_GATE_OFF

    private fun darkNote(): String? =
        if (config.darkLumaThr > 0 && luma < config.darkLumaThr) {
            "frame too dark (${Math.rint(luma).toLong()} < ${config.darkLumaThr}) — detection paused"
        } else {
            null
        }
}
