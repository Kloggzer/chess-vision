package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry

// One camera frame -> one `FrameInput`. Port of the per-frame order in `tracker.py::_loop`,
// between `_note_frame_size` and the detection state machine. THE ORDER IS BEHAVIOUR:
//
//   size guard -> YUV->BGR -> lens -> detection warp -> dark gate -> gray -> ROI motion -> grid -> emit
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
 * The OpenCV-backed steps, behind a seam so the ORDER above can be tested with fakes on a plain
 * JVM. Stateful: each stage reads what the previous one wrote (see [OpenCvStages]).
 *
 * Generic in whatever a host calls a frame, because exactly ONE method here ever named
 * `ImageProxy` and everything below it already worked on `Mat`. That is how a desktop twin of this
 * pipeline could exist at all — and why it had to copy the stage ORDER by hand, which its own
 * header called out as behaviour. With the frame type as a parameter, the order lives here once,
 * for both hosts.
 */
interface FrameStages<T> {
    fun convert(image: T)

    /**
     * Undistort the just-converted frame in place, and say whether anything was done.
     *
     * Here, and not folded into the warps, because of WHERE it sits: everything downstream of
     * [convert] reads one frame — the preview and calibration bus, and through it the ArUco
     * re-detection and the once-per-pose grid fit, plus [roiMotion], both warps and the overlay the
     * corners are drawn against. Correcting the pixels at this one point keeps all of them in ONE
     * coordinate space. Composing the lens into the warp maps instead would cost nothing per frame
     * and would split that space in two: the quad would have to be undistorted while `roiMotion`
     * and the preview still read raw pixels.
     *
     * It also puts the lens before the board, which is the order `CLAUDE.md` fixes and the reason
     * it gives: a homography is projective and cannot represent a barrel arc, so a grid fit run on
     * a distorted frame absorbs lens error into board geometry.
     *
     * Returns false when no lens is configured — the default, and the only state with any evidence
     * behind it. The boolean is what lets `Stage.LENS` report "did not run" instead of a zero.
     */
    fun undistort(): Boolean = false

    /**
     * Hand the just-converted BGR frame to the preview/calibration bus, if it is due one.
     *
     * A stage rather than a call in the coordinator because the coordinator has no `Mat`: it used
     * to pass the raw `ImageProxy` to `CameraFrameBus`, which ran a SECOND full-frame YUV->BGR of
     * the image [convert] had already converted. The seam stays OpenCV-free — this is a push, not
     * a getter — so the pipeline order test keeps running without natives.
     */
    fun publishFrame()

    /**
     * Hand the rectified detection warp to the board preview, if it is due one.
     *
     * Separate from [publishFrame] because it can only run AFTER [warpDetection] — and because the
     * tracking screen wants the board, while calibration wants the raw frame.
     */
    fun publishBoard()

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
 * Turns host frames into `FrameInput`s on the analyzer thread.
 *
 * It NEVER blocks on the CNN and never runs marker detection: the corners are whatever the
 * service last published into [corners] (commit 4a7609e — ArUco on the frame thread cost
 * 44-87 ms every 300 ms), and the CNN gets a crop frame only when [CropFrameStore] asks for one.
 */
class FramePipeline<T>(
    private var config: TrackerConfig,
    private val stages: FrameStages<T>,
    private val cropStore: CropFrameStore,
    private val sizeGuard: FrameSizeGuard,
    private val timings: StageTimings = StageTimings(),
) {
    /** Board corners in source-image pixels, `[a8, h8, h1, a1]`. Swapped by the service. */
    @Volatile
    var corners: FloatArray? = null

    private var seq = 0L
    private var sourceSeq = 0L
    private var luma = 0.0

    /** The dark gate's own input, for the perf line — the one number that decides a skip. */
    fun lastLuma(): Double = luma

    /**
     * The size guard is reached THROUGH the pipeline that owns it.
     *
     * The coordinator used to hold a second reference to the same instance purely to read the
     * verdict and stamp the profile; one owner is fewer ways for the two to disagree.
     */
    val sizeMismatch: SizeMismatch? get() = sizeGuard.mismatch

    /** A new calibration profile is the baseline the delivered size is checked against. */
    fun setProfile(
        name: String,
        width: Int,
        height: Int,
    ) = sizeGuard.setProfile(name, width, height)

    /**
     * The frame clock is NOT started here — [TrackerCoordinator][com.chesslab.tracker.service.TrackerCoordinator]
     * owns it, because work runs on this thread both before this call and after it. Marking
     * [Stage.TOTAL] on the skip path too is what keeps a dark or marker-less frame from reporting
     * the previous frame's pipeline cost.
     */
    fun onFrame(
        image: T,
        width: Int,
        height: Int,
        timestampMs: Long,
    ): FrameResult =
        WorkProfiler.span(WorkOperation.FRAME, ++sourceSeq) {
            // The delivered size is the only trustworthy one; a change invalidates the profile. Read it
            // off the frame that ARRIVED, never off what was requested (commit a7dab73): a camera that
            // hands back something other than what was asked for poisons every warp until the next
            // calibration, and it does so silently.
            sizeGuard.note(width, height)
            val note = readFrame(image)
            if (note != null) {
                if (note == NOTE_WAITING_MARKERS) skippedWaitingMarkers += 1 else skippedDark += 1
            }
            val result = if (note != null) FrameResult.Skipped(note) else emit(timestampMs)
            timings.mark(Stage.TOTAL)
            result
        }

    /** Frames that never reached the engine, by reason — until now only a note string per frame. */
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

    /**
     * Steps 1-5: convert, undistort, publish, warp, dark gate. Returns the skip note, or null when
     * usable.
     *
     * The convert runs BEFORE the corners check now. It has to: without corners there is no
     * detection, but there is still a calibration screen that needs pixels, and it is the corners
     * that are missing precisely while the user is calibrating.
     */
    private fun readFrame(image: T): String? {
        stages.convert(image)
        timings.mark(Stage.CONVERT)
        if (stages.undistort()) timings.mark(Stage.LENS)
        stages.publishFrame()
        timings.mark(Stage.PUBLISH)
        val pts = corners ?: return NOTE_WAITING_MARKERS
        if (!stages.warpDetection(pts)) return NOTE_WAITING_MARKERS
        stages.publishBoard()
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
