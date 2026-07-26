package com.chesslab.tracker.pipeline

import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.gridLineCoverage
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.toGrayImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.geometry.warpFromCorners
import org.opencv.core.Core
import org.opencv.core.Mat

// The two warps of entry.md invariant 1, and the OpenCV half of the frame pipeline.
//
//  - DETECTION warp: borderless, at `detSize = boardSize * detectScale`. Every frame.
//  - CNN CROP warp: bordered, at full `boardSize`. ONLY when the observer asks. Commit 4a7609e
//    measured the unconditional full-res warp as one of the two things that held the frame loop
//    at 100-150 ms; deriving crops from the detection warp instead would silently halve their
//    resolution, which is the `synth-crop-resolution-gap` failure mode.

/**
 * Hand-off of the bordered crop warp from the analyzer thread to the CNN observer (05c).
 *
 * Ownership: [update] takes ownership of the given `Mat` and releases whatever it held; [take]
 * transfers ownership to the caller, who must `release()` it; [close] releases what is left.
 * [wantsFrame] is true only while the observer has asked AND has consumed the previous frame —
 * that is what keeps the expensive warp off the per-frame path.
 */
class CropFrameStore {
    /**
     * The bordered warp plus the SAME frame's detection warps and signature. The observer needs
     * all of it: a recovery commit anchors on the frame the CNN actually looked at, and the
     * decision seq must be the one that frame carried (entry.md invariants 1, 5 and Spec 11).
     */
    class Pending(
        val cropWarp: Mat,
        val seq: Long,
        val tsMs: Long,
        val bgrDet: BgrImage,
        val grayDet: GrayImage,
    )

    private var pending: Pending? = null

    @Volatile
    private var wanted = false

    /** Called by the observer thread when it is ready for the next crop frame. */
    fun request() {
        wanted = true
    }

    fun wantsFrame(): Boolean = wanted && pending == null

    /** The request is answered — set by the pipeline, so one request yields exactly one warp. */
    internal fun served() {
        wanted = false
    }

    @Synchronized
    fun update(frame: Pending) {
        pending?.cropWarp?.release()
        pending = frame
    }

    /** The newest crop frame, or null. The caller owns the returned `cropWarp`. */
    @Synchronized
    fun take(): Pending? {
        val out = pending
        pending = null
        return out
    }

    @Synchronized
    fun close() {
        pending?.cropWarp?.release()
        pending = null
        wanted = false
    }
}

/**
 * The OpenCV-backed stages, in the order [FramePipeline] calls them.
 *
 * Stateful by design: each stage writes into this object's reused `Mat`s and the next stage reads
 * them, so the whole per-frame path allocates nothing but the two seam byte arrays. Calling the
 * stages out of order reads the previous frame's pixels.
 */
class CameraStages(
    private var geometry: BoardGeometry,
    private var config: TrackerConfig,
    private val cropStore: CropFrameStore,
) : FrameStages {
    private val yuv = YuvToBgr()
    private val gray = GrayPipeline(config.diffClaheClip)
    private val motion = RoiMotion(config.motionMargin, config.motionPxThr)
    private var frame: Mat? = null
    private var warped: Mat? = null
    private var grayMat: Mat? = null

    /** `detSize = boardSize * detectScale` — the detection warp's side (`TrackerConfig.detSize`). */
    private val detSize: Int
        get() = if (config.detectScale < 1.0) (geometry.boardSize * config.detectScale).toInt() else geometry.boardSize

    override fun convert(image: ImageProxy) {
        frame = yuv.convert(image)
    }

    override fun warpDetection(corners: FloatArray): Boolean {
        val src = frame
        var ok = false
        if (src != null && !src.empty() && detSize > 0) {
            val dst = warped ?: Mat().also { warped = it }
            warpFromCorners(src, geometry, cornersFromFlat(corners), detSize, dst)
            ok = true
        }
        return ok
    }

    /** Mean luma of the detection warp, measured BEFORE CLAHE — the dark-frame gate's whole point. */
    override fun lumaPreClahe(): Double = Core.mean(detectionWarp()).`val`[0]

    override fun grayDet(): GrayImage {
        val g = gray.toGray(detectionWarp())
        grayMat = g
        // A FRESH ByteArray per frame on purpose: the engine's running mean keeps references to
        // the planes it averaged (entry.md invariant 14).
        return toGrayImage(g)
    }

    override fun bgrDet(): BgrImage = toBgrImage(detectionWarp())

    override fun gridCoverage(): Double = gridLineCoverage(requireNotNull(grayMat) { "grayDet must run first" })

    override fun roiMotion(corners: FloatArray): Double = motion.score(requireNotNull(frame), corners)

    /** The bordered full-resolution warp. Guarded by [CropFrameStore.wantsFrame] at the call site. */
    override fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) {
        val src = frame ?: return
        val warp = warpBoardForCrops(src, geometry, cornersFromFlat(corners))
        cropStore.update(CropFrameStore.Pending(warp, seq, tsMs, bgr, gray))
    }

    override fun onConfigChanged(newConfig: TrackerConfig) {
        config = newConfig
        gray.onConfigChanged(newConfig)
        motion.onConfigChanged(newConfig)
    }

    override fun onGeometryChanged(newGeometry: BoardGeometry) {
        geometry = newGeometry
        motion.onGeometryChanged()
    }

    override fun close() {
        yuv.close()
        gray.close()
        motion.close()
        warped?.release()
        warped = null
        frame = null
        grayMat = null
    }

    private fun detectionWarp(): Mat = requireNotNull(warped) { "warpDetection must run first" }
}
