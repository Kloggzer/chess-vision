package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BlurNode
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.BoardWarpNode
import com.chesslab.geometry.ClaheNode
import com.chesslab.geometry.FrameScope
import com.chesslab.geometry.GridCoverage
import com.chesslab.geometry.HomographyCache
import com.chesslab.geometry.ImageNode
import com.chesslab.geometry.MatPool
import com.chesslab.geometry.ToGrayNode
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.forNativeCrops
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.toGrayImage
import com.chesslab.geometry.warpBoardForCrops
import org.opencv.core.Core
import org.opencv.core.Mat

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
class CropFrameStore(
    private val cachedVisual: ((Long) -> CachedVisual)? = null,
) {
    class CachedVisual(
        val observation: CnnObservation,
        val gridOccluded: Long,
    )

    /**
     * The bordered warp plus the SAME frame's detection warps and signature. The observer needs
     * all of it: a recovery commit anchors on the frame the CNN actually looked at, and the
     * decision seq must be the one that frame carried (entry.md invariants 1, 5 and Spec 11).
     */
    class Pending(
        val cropWarp: Mat?,
        val seq: Long,
        val tsMs: Long,
        val bgrDet: BgrImage,
        val grayDet: GrayImage,
        /**
         * Die Geometrie, mit der [cropWarp] entstanden ist — nicht die, die beim Abholen gilt.
         *
         * Der Observer holte sie sich bisher frisch; landet zwischen Warp und Abholung eine
         * Kalibrierung, schneidet er Kaesten in ein Raster, das es nicht mehr gibt.
         */
        val geometry: BoardGeometry,
        val cached: CachedVisual? = null,
        /**
         * Der Warp fuer den Rillen-Sensor in KALIBRIERgroesse, wenn sie von [geometry] abweicht: bei
         * 80-px-Modellen ist der Crop-Warp 576 px, und dort flaggten die Rillen auf ruhigem Rig-Brett
         * 13 Felder (gemessen 2026-09-04, 0 von 25 Plies). Null heisst: [cropWarp] taugt fuer beide.
         */
        val grid: GridPlane? = null,
    ) {
        fun release() {
            cropWarp?.release()
            grid?.warp?.release()
        }
    }

    class GridPlane(
        val warp: Mat,
        val geometry: BoardGeometry,
    )

    /** [wantsFrame] und [idle] lesen es ohne die Sperre, unter der der Observer es raeumt. */
    @Volatile
    private var pending: Pending? = null

    /** Warps built for the observer that it never took — overwritten by a newer one, counted. */
    @Volatile
    var overwritten = 0L
        private set

    @Volatile
    private var wanted = false

    /** Called by the observer thread when it is ready for the next crop frame. */
    fun request() {
        wanted = true
    }

    fun wantsFrame(): Boolean = wanted && pending == null

    val idle: Boolean get() = pending == null

    /** The request is answered — set by the pipeline, so one request yields exactly one warp. */
    internal fun served() {
        wanted = false
    }

    @Synchronized
    fun update(frame: Pending) {
        pending?.also {
            it.release()
            overwritten += 1
        }
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
        pending?.release()
        pending = null
        wanted = false
    }

    /** Strict replay cache: a configured cache must contain every requested observation seq. */
    fun cached(seq: Long): CachedVisual? = cachedVisual?.invoke(seq)
}

/**
 * The OpenCV-backed stages, in the order [FramePipeline] calls them.
 *
 * Stateful by design: each stage writes into this object's reused `Mat`s and the next stage reads
 * them, so the whole per-frame path allocates nothing but the two seam byte arrays. Calling the
 * stages out of order reads the previous frame's pixels.
 *
 * Both suppressions are about detekt measuring the wrong thing here, and neither is a licence to
 * grow. `TooManyFunctions` counts the [FrameStages] interface — every one of these methods is a
 * STAGE, and the count is the pipeline's length, so the only way to lower it is to shorten the
 * pipeline. `LongParameterList` counts the HOST seam: each parameter is one thing a host must
 * supply and no two of them belong together, so the holder object detekt is asking for would exist
 * only to satisfy detekt (the same reasoning `preprocessInto` records in `:core-cnn`). The next
 * parameter after this one deserves an argument, not another line in this comment.
 */
@Suppress("LongParameterList", "TooManyFunctions")
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
    /**
     * The camera's optics, or null for raw pixels — the default, and what every host does today.
     *
     * Trailing and defaulted so the clip harness and the desktop, which have no lens, construct
     * these exactly as before. Whether one belongs here is not this class's decision: the host that
     * knows which camera this is decides, and hands over a built one or nothing.
     */
    private val lens: Undistorter? = null,
    /** Ob der Rillen-Sensor mitlaeuft — dann braucht er seinen Warp in Kalibriergroesse. */
    private val gridArm: Boolean = true,
) : FrameStages<T> {
    private val grid = GridCoverage()
    private val motion = RoiMotion(config.motionMargin, config.motionPxThr)
    private val homographies = HomographyCache()
    private val gridHomographies = HomographyCache()
    private var frame: Mat? = null
    private var warped: Mat? = null

    /** The corners the last detection warp used — what [boardAt] must warp with to agree with it. */
    private var lastWarpCorners: FloatArray? = null

    private var grayMat: Mat? = null

    /** Siehe [cropGeometry] — verworfen, wenn die Geometrie wechselt. */
    private var cropGeom: BoardGeometry? = null

    // Die Detektionsspur als Kette. Der Scope lebt EINEN Frame; `lumaPreClahe` und `grayDet`
    // teilen sich dadurch die Graustufe, die vorher zweimal gerechnet wurde.
    private val pool = MatPool()
    private var scope: FrameScope? = null
    private var chain: DetectionChain? = null

    /** Nur die Identitaet des Frames fuers Profiling — der Engine-`seq` zaehlt EMITTIERTE Frames. */
    private var seqCounter = 0L

    // Je Groesse einer: eine Engine darf `boardAt` jetzt beliebig oft rufen, ohne zu bezahlen.
    private val boardNodes = HashMap<Int, BoardWarpNode>()

    // The two seam planes are recycled, not reallocated (see PlaneRing.kt). One ring each: they have
    // different sizes and the gray one is written a stage earlier, so a shared ring would have to
    // reallocate on every single call.
    private val grayRing = PlaneRing(ringDepth(config))
    private val bgrRing = PlaneRing(ringDepth(config))

    /** `detSize = boardSize * detectScale` — the detection warp's side (`TrackerConfig.detSize`). */
    private val detSize: Int
        get() = if (config.detectScale < 1.0) (geometry.boardSize * config.detectScale).toInt() else geometry.boardSize

    override fun convert(image: T) {
        endFrame()
        WorkProfiler.span(WorkOperation.FRAME_CONVERT) {
            frame = toBgr(image)
        }
    }

    override fun undistort(): Boolean {
        val optics = lens ?: return false
        frame = frame?.let(optics::apply)
        return true
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
            val nodes = chain ?: DetectionChain(detSize, config.diffClaheClip).also { chain = it }
            val open = FrameScope(src, geometry, cornersFromFlat(corners), seqCounter++, pool, homographies)
            scope = open
            warped = open.get(nodes.warp)
            lastWarpCorners = corners.copyOf()
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
    override fun lumaPreClahe(): Double = Core.mean(node(requireChain().gray)).`val`[0]

    override fun grayDet(): GrayImage {
        val g = node(requireChain().grayDet)
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

    /**
     * One warp straight from the converted frame at [size], for an engine that measures grey levels
     * on the board — `bgrDet` scaled down is a second resample and smooths what it would measure.
     *
     * Its own output `Mat` per call rather than a ring: nothing here knows how many sizes a caller
     * will ask for, and the copy into the seam plane happens immediately anyway.
     */
    override fun boardAt(size: Int): BgrImage? {
        val open = scope ?: return null
        return toBgrImage(open.get(boardNodes.getOrPut(size) { BoardWarpNode(size, WorkOperation.BOARD_WARP) }))
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
        val cropGeom = cropGeometry()
        val cached = cropStore.cached(seq)
        val source = if (cached == null) frame else null
        val warp =
            source?.let {
                warpBoardForCrops(it, cropGeom, cornersFromFlat(corners), homographyCache = homographies)
            }
        if (cached == null && warp == null) return
        var gridPlane: CropFrameStore.GridPlane? = null
        var handed = false
        try {
            gridPlane = gridPlaneFor(corners, cropGeom, source)
            // COPIES of the two seam planes, and this is the one place that must copy them. `Pending`
            // crosses to the OBSERVER thread, becomes `CnnSnapshot.gray`/`.warped`, and the engine can
            // hold that snapshot for seconds — or adopt it as `refGray`/`refBgr` on a recovery commit,
            // i.e. forever. That lifetime is unbounded, so it can never come out of the ring.
            val copies =
                WorkProfiler.span(WorkOperation.CROP_FRAME_COPY, seq) {
                    val bgrCopy = bgr.copyPlane()
                    val grayCopy = gray.copyPlane()
                    WorkProfiler.bytes(WorkOperation.CROP_FRAME_COPY, (bgrCopy.data.size + grayCopy.data.size).toLong(), seq)
                    bgrCopy to grayCopy
                }
            cropStore.update(CropFrameStore.Pending(warp, seq, tsMs, copies.first, copies.second, cropGeom, cached, gridPlane))
            handed = true
        } finally {
            // Bricht eine Stufe nach dem Warp ab, gehoert er niemandem: der Store hat ihn nie gesehen.
            if (!handed) {
                warp?.release()
                gridPlane?.warp?.release()
            }
        }
    }

    /** Der Rillen-Warp in KALIBRIERgroesse, wenn sie von der Crop-Groesse abweicht. */
    private fun gridPlaneFor(
        corners: FloatArray,
        cropGeom: BoardGeometry,
        source: Mat?,
    ): CropFrameStore.GridPlane? {
        val gridGeom = geometry.takeIf { gridArm && it.boardSize != cropGeom.boardSize } ?: return null
        val frame = source ?: return null
        val warp = warpBoardForCrops(frame, gridGeom, cornersFromFlat(corners), homographyCache = gridHomographies)
        return CropFrameStore.GridPlane(warp, gridGeom)
    }

    override fun onConfigChanged(newConfig: TrackerConfig) {
        config = newConfig
        dropChain()
        motion.onConfigChanged(newConfig)
        // `avgFramesOverride` is a live knob, so the ring's depth follows the config.
        grayRing.resize(ringDepth(newConfig))
        bgrRing.resize(ringDepth(newConfig))
    }

    override fun onGeometryChanged(newGeometry: BoardGeometry) {
        geometry = newGeometry
        cropGeom = null
        dropChain()
        motion.onGeometryChanged()
    }

    override fun close() {
        closeConverter()
        // After `undistort` ran, `frame` aliases the undistorter's own output Mat rather than the
        // converter's — so both owners have to be closed, and neither of them is this class.
        lens?.close()
        grid.close()
        motion.close()
        endFrame()
        dropChain()
        pool.close()
        frame = null
    }

    private fun detectionWarp(): Mat = requireNotNull(warped) { "warpDetection must run first" }

    private fun requireChain(): DetectionChain = requireNotNull(chain) { "warpDetection must run first" }

    private fun node(of: ImageNode): Mat = requireNotNull(scope) { "warpDetection must run first" }.get(of)

    /** Puffer zurueck in den Pool. Was laenger leben muss, ist bis hier in eine Ebene kopiert. */
    private fun endFrame() {
        scope?.close()
        scope = null
        warped = null
        grayMat = null
    }

    /**
     * Die Rastergroesse des Crop-Warps: aus dem Modell abgeleitet, nicht aus dem Kalibrierprofil.
     * Einmal je Geometrie gerechnet, weil `boardSize` sich nur mit ihr aendert.
     */
    private fun cropGeometry(): BoardGeometry = cropGeom ?: geometry.forNativeCrops().also { cropGeom = it }

    private fun dropChain() {
        chain?.close()
        chain = null
        boardNodes.values.forEach(BoardWarpNode::close)
        boardNodes.clear()
    }
}

/**
 * Die Detektionsspur als Kette: Warp -> Grau -> [CLAHE] -> Blur.
 *
 * `lumaPreClahe` zieht [gray], `grayDet` zieht [grayDet] — gleicher Praefix, eine Rechnung. Ohne
 * Clip faellt der CLAHE-Knoten weg, genau wie `GrayPipeline` ihn uebersprang.
 */
private class DetectionChain(
    detSize: Int,
    claheClip: Double,
) : AutoCloseable {
    val warp = BoardWarpNode(detSize)
    val gray = ToGrayNode(warp)
    private val enhanced: ImageNode = if (claheClip > 0) ClaheNode(gray, claheClip) else gray
    val grayDet: ImageNode = BlurNode(enhanced)

    override fun close() {
        grayDet.close()
        enhanced.close()
        gray.close()
        warp.close()
    }
}

/** A plane that owns its pixels — for the hand-offs that outlive the ring's cycle. */
private fun BgrImage.copyPlane(): BgrImage = BgrImage(width, height, data.copyOf())

private fun GrayImage.copyPlane(): GrayImage = GrayImage(width, height, data.copyOf())
