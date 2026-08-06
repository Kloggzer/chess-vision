package com.chesslab.tracker.sim

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.toBgrImage
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameResult
import com.chesslab.tracker.pipeline.FrameSizeGuard
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import org.opencv.core.Mat

/** Where the per-frame wall time went. Sums in ms; a desktop CPU, not a phone NPU. */
internal class SimTimings {
    var frames = 0
    var observations = 0
    var warpMs = 0.0
    var grayMs = 0.0
    var motionMs = 0.0
    var cropMs = 0.0
    var inferMs = 0.0
    var engineMs = 0.0

    fun per(value: Double): Double = if (frames == 0) 0.0 else value / frames

    fun perObservation(value: Double): Double = if (observations == 0) 0.0 else value / observations
}

/**
 * The clip harness's binding to the SHIPPING pipeline.
 *
 * This class used to be "the desktop twin of `FramePipeline` + `CnnCropAdapter`", with the stage
 * order copied by hand because — in its own words — the order is behaviour. It is not a twin any
 * more: it constructs the same `FramePipeline` and the same `OpenCvStages` the phone runs, with
 * `toBgr` as identity because a decoded video frame is already BGR. Whatever the phone does with a
 * frame, this does, because it is the same object graph.
 *
 * Two things the phone's host does that this one must do too, and they are the whole adapter:
 * request a crop frame BEFORE the frame is processed (the pull `CnnObserver` makes), and take the
 * result afterwards.
 */
internal class ClipPipeline(
    source: SimSource,
    private val timings: SimTimings,
    /**
     * The model whose crops this run feeds, or null for the diff-only baseline.
     *
     * The harness has to size its crops the way `TrackerService` does (specs/23 phase 01), or it
     * stops being a parity harness: `preprocessInto` REQUIRES `crop.width == outW`, so a 96 px
     * model against this class's former hard-coded 128 threw on the first observation.
     */
    spec: ModelSpec? = null,
) {
    private val config = source.config
    private val corners = source.corners

    // The clip's OWN geometry, margin included. The CROP, though, is the model's (specs/45): a run
    // declaring `pad_side` gets the box it was trained on even here — a harness that invents the
    // box measures its own invention.
    private val geometry = source.geometry.withCropOf(spec)
    private val cropStore = CropFrameStore()
    private val stages = OpenCvStages<Mat>({ it }, {}, geometry, config, cropStore)
    private val pipeline = FramePipeline(config, stages, cropStore, FrameSizeGuard(), StageTimings(logLine = {}))

    /** The flat corner array the engine seam wants; frozen for the whole clip (`liveAlign=false`). */
    val cornersFlat: FloatArray = cornersToFlat(corners)

    /** The detection warps of the frame most recently passed to [input] — the CNN anchor pair. */
    var lastBgrDet: BgrImage? = null
        private set
    var lastGrayDet: GrayImage? = null
        private set

    init {
        pipeline.corners = cornersFlat
    }

    /** The observer is idle and will want this frame's crops. Mirrors `CropFrameStore.request`. */
    fun requestCrops() {
        cropStore.request()
    }

    fun input(
        frame: Mat,
        timestampMs: Long,
    ): FrameInput {
        val mark = System.nanoTime()
        val result = pipeline.onFrame(frame, frame.cols(), frame.rows(), timestampMs)
        timings.warpMs += elapsed(mark)
        // A clip frame is never legitimately skipped: the corners are fixed, and the dark gate
        // cannot fire on a Blender render. If it ever does, the harness has silently stopped
        // showing the engine what the video contains — which is the class of divergence this
        // whole class was rewritten to make impossible. So it fails here, loudly.
        val ready =
            result as? FrameResult.Ready
                ?: error("the pipeline skipped a clip frame: ${(result as FrameResult.Skipped).note}")
        lastBgrDet = ready.input.bgrDet
        lastGrayDet = ready.input.grayDet
        return ready.input
    }

    /**
     * The 64 CNN crops of the frame [input] just processed, in `allSquares()` order.
     *
     * Taken from the store the pipeline filled, which is the same bordered full-resolution warp
     * `CnnCropAdapter` hands the model on the phone — not a second warp computed here.
     */
    fun crops(): List<BgrImage>? {
        val pending = cropStore.take() ?: return null
        val mark = System.nanoTime()
        val out =
            allSquares().map { square ->
                val crop = cropSquare(pending.cropWarp, square, geometry)
                val image = toBgrImage(crop)
                crop.release()
                image
            }
        pending.cropWarp.release()
        timings.cropMs += elapsed(mark)
        return out
    }

    fun close() {
        stages.close()
        cropStore.close()
    }
}

private const val NANOS_PER_MS = 1_000_000.0

/** Wall time since [since] in ms. It lived in this file before; the callers still need it. */
internal fun elapsed(since: Long): Double = (System.nanoTime() - since) / NANOS_PER_MS
