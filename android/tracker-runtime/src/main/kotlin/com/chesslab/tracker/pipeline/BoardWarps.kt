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

// The two warps of invariant 1. DETECTION: borderless at `detSize`, every frame. CNN CROP: bordered, full
// `boardSize`, ONLY when the observer asks — cropping from the detection warp would halve the resolution.

private const val BGR_CHANNELS = 3

/** [update] takes ownership and releases the previous; [take] hands ownership to the caller. [wantsFrame] is
 *  true only while the observer asked AND consumed the previous frame — keeping the warp off the per-frame path. */
class CropFrameStore(
    private val cachedVisual: ((Long) -> CachedVisual?)? = null,
) {
    class CachedVisual(
        val observation: CnnObservation,
        val gridOccluded: Long,
    )

    /** Plus the SAME frame's detection warps: a recovery commit anchors on the frame the CNN looked at. */
    class Pending(
        val cropWarp: Mat?,
        val seq: Long,
        val tsMs: Long,
        val bgrDet: BgrImage,
        val grayDet: GrayImage,
        /** Die Geometrie beim Warp: landet zwischen Warp und Abholung eine Kalibrierung, schnitte der Observer
         *  Kaesten in ein Raster, das es nicht mehr gibt. */
        val geometry: BoardGeometry,
        val cached: CachedVisual? = null,
        /** In KALIBRIERgroesse, wenn sie abweicht: auf dem 576-px-Crop-Warp flaggten die Rillen auf ruhigem Brett
         *  13 Felder. Null heisst: [cropWarp] taugt fuer beide. */
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

    /** [wantsFrame] und [idle] lesen es ohne die Sperre. */
    @Volatile
    private var pending: Pending? = null

    @Volatile
    var overwritten = 0L
        private set

    @Volatile
    private var wanted = false

    fun request() {
        wanted = true
    }

    fun wantsFrame(): Boolean = wanted && pending == null

    val idle: Boolean get() = pending == null

    /** One request yields exactly one warp. */
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

    /** The caller owns the returned `cropWarp`. */
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

    /** `null`: der Cache kennt diesen Frame nicht. Ob das ein FEHLER ist, entscheidet der Cache selbst. */
    fun cached(seq: Long): CachedVisual? = cachedVisual?.invoke(seq)
}

/** Stateful: each stage writes reused `Mat`s the next one reads, so calling them out of order reads the previous
 *  frame. The suppressions count the pipeline's length and the host seam; the next parameter needs an argument. */
@Suppress("LongParameterList", "TooManyFunctions")
class OpenCvStages<T>(
    private val toBgr: (T) -> Mat?,
    /** A converter may own reusable buffers, and YuvToBgr does. */
    private val closeConverter: () -> Unit = {},
    private var geometry: BoardGeometry,
    private var config: TrackerConfig,
    private val cropStore: CropFrameStore,
    /** Throttles and clones itself. */
    private val frameBus: (Mat) -> Unit = {},
    private val boardBus: (Mat) -> Unit = {},
    /** Only the desktop replay (`lens=true`) passes one. */
    private val lens: Undistorter? = null,
    private val gridArm: Boolean = true,
) : FrameStages<T> {
    private val grid = GridCoverage()
    private val motion = RoiMotion(config.motionMargin, config.motionPxThr)
    private val homographies = HomographyCache()
    private val gridHomographies = HomographyCache()
    private var frame: Mat? = null
    private var warped: Mat? = null

    private var lastWarpCorners: FloatArray? = null

    private var grayMat: Mat? = null

    private var cropGeom: BoardGeometry? = null

    // Der Scope lebt EINEN Frame; `lumaPreClahe` und `grayDet` teilen sich dadurch die Graustufe.
    private val pool = MatPool()
    private var scope: FrameScope? = null
    private var chain: DetectionChain? = null

    /** Nur fuers Profiling — der Engine-`seq` zaehlt EMITTIERTE Frames. */
    private var seqCounter = 0L

    private val boardNodes = HashMap<Int, BoardWarpNode>()

    // One ring each: different sizes, and a shared ring would reallocate on every call.
    private val grayRing = PlaneRing(ringDepth(config))
    private val bgrRing = PlaneRing(ringDepth(config))

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

    /** Luma BEFORE CLAHE, converted first: `.val[0]` of the BGR mean is **blue**, and under warm light (R:B 51)
     *  a well-lit board read "frame too dark" while the preview kept updating. */
    override fun lumaPreClahe(): Double = Core.mean(node(requireChain().gray)).`val`[0]

    override fun grayDet(): GrayImage {
        val g = node(requireChain().grayDet)
        grayMat = g
        // A ring deeper than the engine can hold: its running mean keeps references to the planes (invariant 14).
        return toGrayImage(g, grayRing.next(g.rows() * g.cols()))
    }

    override fun bgrDet(): BgrImage {
        val warp = detectionWarp()
        return toBgrImage(warp, bgrRing.next(warp.rows() * warp.cols() * BGR_CHANNELS))
    }

    /** Straight from the frame: `bgrDet` scaled down is a second resample and smooths what an engine measures. */
    override fun boardAt(size: Int): BgrImage? {
        val open = scope ?: return null
        return toBgrImage(open.get(boardNodes.getOrPut(size) { BoardWarpNode(size, WorkOperation.BOARD_WARP) }))
    }

    override fun gridCoverage(): Double = grid.of(requireNotNull(grayMat) { "grayDet must run first" })

    override fun roiMotion(corners: FloatArray): Double = motion.score(requireNotNull(frame), corners)

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
            // COPIES, and the one place that must copy: `Pending` crosses to the observer and can become
            // `refGray`/`refBgr` on a recovery commit — an unbounded lifetime, never out of the ring.
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
        // After `undistort`, `frame` aliases the undistorter's Mat: both owners close, neither is this class.
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

    /** Was laenger leben muss, ist bis hier in eine Ebene kopiert. */
    private fun endFrame() {
        scope?.close()
        scope = null
        warped = null
        grayMat = null
    }

    /** Aus dem Modell, nicht aus dem Kalibrierprofil; einmal je Geometrie. */
    private fun cropGeometry(): BoardGeometry = cropGeom ?: geometry.forNativeCrops().also { cropGeom = it }

    private fun dropChain() {
        chain?.close()
        chain = null
        boardNodes.values.forEach(BoardWarpNode::close)
        boardNodes.clear()
    }
}

/** Gleicher Praefix, eine Rechnung. Ohne Clip faellt der CLAHE-Knoten weg. */
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

private fun BgrImage.copyPlane(): BgrImage = BgrImage(width, height, data.copyOf())

private fun GrayImage.copyPlane(): GrayImage = GrayImage(width, height, data.copyOf())
