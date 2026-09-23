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

/** The SHIPPING `FramePipeline` + `OpenCvStages`, no hand-copied twin. Crops are requested BEFORE the
 *  frame, as `CnnObserver` pulls, and taken afterwards. */
internal class ClipPipeline(
    source: SimSource,
    private val timings: SimTimings,
    spec: ModelSpec? = null,
) {
    private val config = source.config
    private val corners = source.corners

    // The clip's OWN geometry, but the model's CROP: an invented box measures only itself.
    private val geometry = source.geometry.withCropOf(spec)
    private val cropStore = CropFrameStore()
    private val stages = OpenCvStages<Mat>({ it }, {}, geometry, config, cropStore)
    private val pipeline = FramePipeline(config, stages, cropStore, FrameSizeGuard(), StageTimings(logLine = {}))

    val cornersFlat: FloatArray = cornersToFlat(corners)

    var lastBgrDet: BgrImage? = null
        private set
    var lastGrayDet: GrayImage? = null
        private set

    init {
        pipeline.corners = cornersFlat
    }

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
        // No dark gate on a render: a skipped clip frame is a silent divergence, so fail loudly.
        val ready =
            result as? FrameResult.Ready
                ?: error("the pipeline skipped a clip frame: ${(result as FrameResult.Skipped).note}")
        lastBgrDet = ready.input.bgrDet
        lastGrayDet = ready.input.grayDet
        return ready.input
    }

    fun crops(): List<BgrImage>? {
        val pending = cropStore.take() ?: return null
        val cropWarp = requireNotNull(pending.cropWarp)
        val mark = System.nanoTime()
        val out =
            allSquares().map { square ->
                val crop = cropSquare(cropWarp, square, geometry)
                val image = toBgrImage(crop)
                crop.release()
                image
            }
        cropWarp.release()
        timings.cropMs += elapsed(mark)
        return out
    }

    fun close() {
        stages.close()
        cropStore.close()
    }
}

private const val NANOS_PER_MS = 1_000_000.0

internal fun elapsed(since: Long): Double = (System.nanoTime() - since) / NANOS_PER_MS
