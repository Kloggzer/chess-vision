package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.GridCoverage
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.toGrayImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.geometry.warpFromCorners
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc

// The two warps of entry.md invariant 1, and the OpenCV half of the frame pipeline.
//
//  - DETECTION warp: borderless, at `detSize = boardSize * detectScale`. Every frame.
//  - CNN CROP warp: bordered, at full `boardSize`. ONLY when the observer asks. Commit 4a7609e
//    measured the unconditional full-res warp as one of the two things that held the frame loop
//    at 100-150 ms; deriving crops from the detection warp instead would silently halve their
//    resolution, which is the `synth-crop-resolution-gap` failure mode.

/** Interleaved BGR — three bytes per pixel. */
private const val BGR_CHANNELS = 3

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
class OpenCvStages<T>(
    /** How this host turns its frame into BGR. The phone converts YUV; a file source hands a Mat. */
    private val toBgr: (T) -> Mat?,
    /** Released with the stages: a converter may own reusable buffers, and YuvToBgr does. */
    private val closeConverter: () -> Unit = {},
    private var geometry: BoardGeometry,
    private var config: TrackerConfig,
    private val cropStore: CropFrameStore,
    /** Where the preview/calibration bus receives the converted frame. Throttles and clones itself. */
    private val frameBus: (Mat) -> Unit = {},
    /** Where the tracking screen receives the rectified board. Same contract as [frameBus]. */
    private val boardBus: (Mat) -> Unit = {},
) : FrameStages<T> {
    private val gray = GrayPipeline(config.diffClaheClip)
    private val grid = GridCoverage()
    private val motion = RoiMotion(config.motionMargin, config.motionPxThr)
    private var frame: Mat? = null
    private var warped: Mat? = null

    /** Owned and reused, like every other Mat here — released with the rest. */
    private var lumaScratch: Mat? = null
    private var grayMat: Mat? = null

    // The two seam planes are recycled, not reallocated (see PlaneRing.kt). One ring each: they have
    // different sizes and the gray one is written a stage earlier, so a shared ring would have to
    // reallocate on every single call.
    private val grayRing = PlaneRing(ringDepth(config))
    private val bgrRing = PlaneRing(ringDepth(config))

    /** `detSize = boardSize * detectScale` — the detection warp's side (`TrackerConfig.detSize`). */
    private val detSize: Int
        get() = if (config.detectScale < 1.0) (geometry.boardSize * config.detectScale).toInt() else geometry.boardSize

    override fun convert(image: T) {
        frame = toBgr(image)
    }

    override fun publishFrame() {
        frame?.let(frameBus)
    }

    override fun publishBoard() {
        warped?.let(boardBus)
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

    /**
     * Mean luma of the detection warp, measured BEFORE CLAHE — the dark-frame gate's whole point.
     *
     * The conversion is not optional. `detectionWarp()` is CV_8UC3 BGR, so `Core.mean` returns one
     * mean per channel and `.val[0]` is the mean of **blue** — which this did for as long as the
     * gate has existed, while the KDoc claimed luma and the clip harness
     * (`sim/ClipPipeline.meanLuma`) and the Python original both convert first.
     *
     * Blue is not a stand-in for brightness under warm light, and warm light is a target condition:
     * a session recorded 2026-07-31 measures R:B 51 against the corpus's 1.1, mean blue 4 of 255 on
     * a board whose true luma is 56. Against `darkLumaThr = 18` that reads "frame too dark" over a
     * well-lit board, and detection pauses while the preview keeps updating — which is exactly what
     * it looked like on the device.
     */
    override fun lumaPreClahe(): Double {
        val warp = detectionWarp()
        val dst = lumaScratch ?: Mat().also { lumaScratch = it }
        Imgproc.cvtColor(warp, dst, Imgproc.COLOR_BGR2GRAY)
        return Core.mean(dst).`val`[0]
    }

    override fun grayDet(): GrayImage {
        // `gray` owns and reuses the destination; `grayMat` only aliases it for `gridCoverage`.
        val g = gray.toGray(detectionWarp())
        grayMat = g
        // NOT a fresh ByteArray, and not a single reused one either: the engine's running mean keeps
        // references to the planes it averaged (entry.md invariant 14), so the buffer comes from a
        // ring deeper than everything the engine can hold at once.
        return toGrayImage(g, grayRing.next(g.rows() * g.cols()))
    }

    override fun bgrDet(): BgrImage {
        val warp = detectionWarp()
        return toBgrImage(warp, bgrRing.next(warp.rows() * warp.cols() * BGR_CHANNELS))
    }

    override fun gridCoverage(): Double = grid.of(requireNotNull(grayMat) { "grayDet must run first" })

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
        // COPIES of the two seam planes, and this is the one place that must copy them. `Pending`
        // crosses to the OBSERVER thread, becomes `CnnSnapshot.gray`/`.warped`, and the engine can
        // hold that snapshot for seconds — or adopt it as `refGray`/`refBgr` on a recovery commit,
        // i.e. forever. That lifetime is unbounded, so it can never come out of the ring.
        // It costs one 2.5 MB copy on the frames the observer asked for, next to the full-resolution
        // bordered warp on the line above; on every other frame nothing is copied at all.
        cropStore.update(CropFrameStore.Pending(warp, seq, tsMs, bgr.copyPlane(), gray.copyPlane()))
    }

    override fun onConfigChanged(newConfig: TrackerConfig) {
        config = newConfig
        gray.onConfigChanged(newConfig)
        motion.onConfigChanged(newConfig)
        // `avgFramesOverride` is a live knob, so the ring's depth follows the config.
        grayRing.resize(ringDepth(newConfig))
        bgrRing.resize(ringDepth(newConfig))
    }

    override fun onGeometryChanged(newGeometry: BoardGeometry) {
        geometry = newGeometry
        motion.onGeometryChanged()
    }

    override fun close() {
        closeConverter()
        gray.close()
        grid.close()
        motion.close()
        warped?.release()
        warped = null
        lumaScratch?.release()
        lumaScratch = null
        frame = null
        grayMat = null
    }

    private fun detectionWarp(): Mat = requireNotNull(warped) { "warpDetection must run first" }
}

/** A plane that owns its pixels — for the hand-offs that outlive the ring's cycle. */
private fun BgrImage.copyPlane(): BgrImage = BgrImage(width, height, data.copyOf())

private fun GrayImage.copyPlane(): GrayImage = GrayImage(width, height, data.copyOf())
