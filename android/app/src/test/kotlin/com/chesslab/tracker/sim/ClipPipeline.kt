package com.chesslab.tracker.sim

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.GrayPipeline
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridLineCoverage
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.toGrayImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.geometry.warpFromCorners
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.pipeline.RoiMotion
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

// The desktop twin of `FramePipeline` + `CnnCropAdapter`: one decoded video frame -> one
// `FrameInput`, and on demand the 64 CNN crops of the same frame.
//
// The stage ORDER is copied from `FramePipeline.onFrame` (which is itself the port of
// `tracker.py::_loop`), because the order is behaviour:
//     detection warp -> luma (pre-CLAHE) -> gray -> ROI motion -> grid -> emit.
// The dark gate is NOT applied here: unlike the Android pipeline this harness hands every frame
// to the engine, whose `FrameLoop.step` runs the very same gate on `lumaPreClahe`.

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

/** Stateful — every `Mat` is reused across frames, exactly like the analyzer-thread original. */
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

    // The clip's OWN geometry, margin included. This used to be
    // `BoardGeometry(boardSize = clip.boardSize)`, which left `margin` at `margins4(0.0)` —
    // right for the Blender renders and 6-8 % too large for any quad detected from ArUco, whose
    // markers sit in the label border. `warpFromCorners` computes the homography from it.
    //
    // The CROP, though, is the model's (specs/45): a run declaring `pad_side` gets the box it was
    // trained on even here, which is the same reason `emit_parity_fixtures` grew a per-clip `crop`
    // — a harness that invents the box measures its own invention. The detection warp is untouched
    // by it, so the committed parity fixtures (diff path, `cnn_run=None`) cannot move.
    private val geometry = source.geometry.withCropOf(spec)
    private val gray = GrayPipeline(config.diffClaheClip)
    private val roi = RoiMotion(config.motionMargin, config.motionPxThr)
    private val warpDet = Mat()
    private val grayDet = Mat()
    private val lumaScratch = Mat()
    private val cropWarp = Mat()

    /** The flat corner array the engine seam wants; frozen for the whole clip (`liveAlign=false`). */
    val cornersFlat: FloatArray = cornersToFlat(corners)

    /** The detection warps of the frame most recently passed to [input] — the CNN anchor pair. */
    var lastBgrDet: BgrImage? = null
        private set
    var lastGrayDet: GrayImage? = null
        private set

    fun input(
        frame: Mat,
        seq: Long,
        timestampMs: Long,
    ): FrameInput {
        var mark = System.nanoTime()
        warpFromCorners(frame, geometry, corners, config.detSize, warpDet)
        val luma = meanLuma(warpDet)
        timings.warpMs += elapsed(mark).also { mark = System.nanoTime() }
        gray.toGray(warpDet, grayDet)
        val bgrImage = toBgrImage(warpDet)
        val grayImage = toGrayImage(grayDet)
        lastBgrDet = bgrImage
        lastGrayDet = grayImage
        timings.grayMs += elapsed(mark).also { mark = System.nanoTime() }
        val motion = roi.score(frame, cornersFlat)
        timings.motionMs += elapsed(mark)
        return FrameInput(
            seq = seq,
            grayDet = grayImage,
            bgrDet = bgrImage,
            corners = cornersFlat,
            motionRoiScore = motion,
            gridLineCoverage = if (config.minGridLineCoverage > 0) gridLineCoverage(grayDet) else GRID_GATE_OFF,
            lumaPreClahe = luma,
            timestampMs = timestampMs,
        )
    }

    /**
     * The 64 CNN crops of [frame], in `allSquares()` order.
     *
     * Same call chain as `cropFrameSource`: the BORDERED full-resolution warp (never the
     * detection warp), then one `cropSquare` per square. Split out here only so the cost lands in
     * [SimTimings.cropMs] instead of hiding inside `cropsForFrame`.
     *
     * The crop warp uses the CLIP's `boardSize` (640), not the device profile's 1600. Measured
     * 2026-07-25: warping to 1600 instead moves the model's confident-occupancy error by <0.2 pp
     * and changes no clip's outcome, at 4x the crop cost (15.6 vs 3.9 ms). It cannot help — the
     * board spans only ~249 px of the 640x640 render, so a square carries ~31 real pixels either
     * way and the extra scale is pure interpolation.
     */
    fun crops(frame: Mat): List<BgrImage> {
        val mark = System.nanoTime()
        warpBoardForCrops(frame, geometry, corners, cropWarp)
        val out =
            allSquares().map { square ->
                val crop = cropSquare(cropWarp, square, geometry)
                val image = toBgrImage(crop)
                crop.release()
                image
            }
        timings.cropMs += elapsed(mark)
        return out
    }

    fun close() {
        roi.close()
        listOf(warpDet, grayDet, lumaScratch, cropWarp).forEach { it.release() }
    }

    /** `cv2.mean(cv2.cvtColor(warped_det, BGR2GRAY))[0]` — measured BEFORE CLAHE, on purpose. */
    private fun meanLuma(warped: Mat): Double {
        Imgproc.cvtColor(warped, lumaScratch, Imgproc.COLOR_BGR2GRAY)
        return Core.mean(lumaScratch).`val`[0]
    }
}

/** `FramePipeline.GRID_GATE_OFF` — the value that cannot gate anything when the gate is off. */
private const val GRID_GATE_OFF = 1.0

private const val NANOS_PER_MS = 1_000_000.0

internal fun elapsed(since: Long): Double = (System.nanoTime() - since) / NANOS_PER_MS
