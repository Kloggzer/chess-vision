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

/** "Nothing moved" — the neutral end of `max(frameMotion, motionRoiScore)` in `FrameLoop`. */
internal const val MOTION_UNREAD = 0.0

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

    /**
     * The rectified board at an arbitrary size, warped from the CONVERTED frame in one step.
     *
     * Not the same picture as [bgrDet] scaled down. That one is already a resample of the frame at
     * `detectScale`, and going 1920 -> 464 -> 160 smooths twice; an engine whose thresholds are
     * grey levels on the board loses exactly the contrast it measures. One warp, one resample.
     *
     * Null before the first frame or without geometry. Costs a warp per call — an engine that asks
     * every frame pays for it, which is the point of asking rather than being handed one.
     */
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

    /** The crop warp alone, runnable off-thread; null when neither a frame nor a cache serves it. */
    fun beginCropWarp(
        corners: FloatArray,
        seq: Long,
    ): CropWarpJob? = null

    fun finishCropFrame(
        job: CropWarpJob,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) = Unit

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

    /**
     * What the engine consumes, so the two measurements it does not are never taken.
     *
     * Set from the host, which `TrackerStack` builds AFTER this pipeline — hence a field rather
     * than a constructor argument. The default is the diff engine's appetite, i.e. every frame
     * fully measured, so a host that never sets it loses nothing.
     */
    @Volatile
    var reads: FrameReads = FrameReads()

    private var seq = 0L
    private var sourceSeq = 0L
    private var luma = 0.0

    /** The frame [emit] last produced, for [cropFrameNow]; null once a frame was skipped. */
    private var emitted: FrameInput? = null

    /** The crop warp started at the top of [emit], joined by [cropWarpAfterTick]. */
    private var cropJob: CompletableFuture<CropWarpJob?>? = null

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
            // ONE read of the volatile per frame: LiveAlign swaps it from its own thread, and a
            // frame warped with A but reported with B tags the new reference with corners it was
            // never built from — `cornersJumped` then never sees the swap.
            val pts = corners
            val note = readFrame(image, pts)
            if (note != null) {
                if (note == NOTE_WAITING_MARKERS) skippedWaitingMarkers += 1 else skippedDark += 1
            }
            if (note != null) {
                emitted = null
                cropJob?.let { stale -> runCatching { stale.join()?.release() } }
                cropJob = null
            }
            val result = if (note != null) FrameResult.Skipped(note) else emit(requireNotNull(pts), timestampMs)
            timings.mark(Stage.TOTAL)
            result
        }

    /**
     * The crop warp for THIS frame, on demand after the engine step: a fresh candidate wants its
     * verifying observation now, not on the next frame the request/serve handshake would reach.
     * Nothing to do while the store still holds an untaken warp or the frame was skipped. The
     * warp is EXTRA: it leaves a request standing so the regular cadence keeps its frames — a
     * shifted cadence lost 45 plies of 20-57-45 to a parity-sensitive alarm recovery (2026-09-12).
     */
    fun cropFrameNow(): Boolean {
        val input = emitted ?: return false
        if (!config.verifyObserveNow || !cropStore.idle) return false
        stages.updateCropFrame(input.corners, input.seq, input.timestampMs, input.bgrDet, input.grayDet)
        cropStore.request()
        return true
    }

    /**
     * The bordered full-resolution warp, AFTER the engine tick: the engine never reads it, only the
     * observer does, so the frame's decision no longer waits the warp's 7 ms on the phone. Same
     * frame, same observation — only the order on the analyzer thread changed (2026-09-12).
     */
    fun cropWarpAfterTick(verifyWaiting: Boolean) {
        val input = emitted ?: return
        val started = cropJob
        cropJob = null
        if (started != null) {
            // Stages without the split (a fake, a cache-only source) answer null: warp here instead.
            val job = started.join()
            if (job != null) {
                stages.finishCropFrame(job, input.timestampMs, input.bgrDet, input.grayDet)
            } else {
                stages.updateCropFrame(input.corners, input.seq, input.timestampMs, input.bgrDet, input.grayDet)
            }
            cropStore.served()
        } else if (cropStore.wantsFrame()) {
            stages.updateCropFrame(input.corners, input.seq, input.timestampMs, input.bgrDet, input.grayDet)
            cropStore.served()
        } else if (verifyWaiting) {
            cropFrameNow()
        }
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

    /** Steps 6-10. `seq` counts EMITTED frames only — the engine requires it to increase. */
    private fun emit(
        pts: FloatArray,
        timestampMs: Long,
    ): FrameResult {
        seq += 1
        // The observer's warp needs only frame and corners: started here, it overlaps gray, grid,
        // motion and the engine tick, and is handed over after the tick (`cropWarpAfterTick`).
        cropJob?.let { stale -> runCatching { stale.join()?.release() } }
        cropJob = if (cropStore.wantsFrame()) CompletableFuture.supplyAsync { stages.beginCropWarp(pts, seq) } else null
        // ROI motion reads the raw frame with its own scratch, so it runs beside gray, BGR and
        // grid coverage, which share the detection chain; its mark then measures the join.
        val motionTask = if (reads.roiMotion) CompletableFuture.supplyAsync { stages.roiMotion(pts) } else null
        val gray = stages.grayDet()
        val bgr = stages.bgrDet()
        timings.mark(Stage.GRAY)
        val coverage = gridCoverage()
        timings.mark(Stage.GRID)
        val motion = motionTask?.join() ?: MOTION_UNREAD
        timings.mark(Stage.MOTION)
        val input = FrameInput(seq, gray, bgr, pts, motion, coverage, luma, timestampMs, board = stages::boardAt)
        emitted = input
        return FrameResult.Ready(input)
    }

    /**
     * Python computes the coverage inside `_occluded_by_grid`, i.e. only in the branches that
     * consult it; here it is a plain `FrameInput` field, so the app cannot see the engine's
     * branch. Two things it CAN see: the gate switched off (`minGridLineCoverage <= 0`, read before
     * the engine even looks at the value), and an engine that never reads it at all ([FrameReads]).
     * Either way the Canny pass is waste; [GRID_GATE_OFF] is the value that cannot gate anything.
     */
    private fun gridCoverage(): Double = if (wantsCoverage()) stages.gridCoverage() else GRID_GATE_OFF

    private fun wantsCoverage(): Boolean = reads.gridCoverage && config.minGridLineCoverage > 0

    private fun darkNote(): String? =
        if (config.darkLumaThr > 0 && luma < config.darkLumaThr) {
            "frame too dark (${Math.rint(luma).toLong()} < ${config.darkLumaThr}) — detection paused"
        } else {
            null
        }
}

/** A crop warp in flight between [FrameStages.beginCropWarp] and [FrameStages.finishCropFrame]. */
class CropWarpJob(
    val warp: org.opencv.core.Mat?,
    val gridPlane: CropFrameStore.GridPlane?,
    val geometry: com.chesslab.geometry.BoardGeometry,
    val cached: CropFrameStore.CachedVisual?,
    val seq: Long,
) {
    fun release() {
        warp?.release()
        gridPlane?.warp?.release()
    }
}
