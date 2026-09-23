package com.chesslab.desktop

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.pipeline.FrameStages
import com.chesslab.tracker.pipeline.PlaneRing
import com.chesslab.tracker.pipeline.RoiMotion
import com.chesslab.tracker.pipeline.ringDepth
import org.opencv.core.Mat

/** Die Pixelarbeit EINMAL fuer N Engines. Nur `roiMotion` haengt an der Konfiguration und wird
 *  je WERTEPAAR gehalten (`docs/desktop-replay.md`). */
internal class SharedFrameWork(
    build: (CropFrameStore) -> FrameStages<Mat>,
) : AutoCloseable {
    /** Nur hierhin schneidet [inner]; zugestellt wird eine Kopie in den Store JEDER fragenden Engine. */
    private val cut = CropFrameStore()
    private val inner = build(cut)
    private var current: Mat? = null
    private var converted = false
    private var warpedFor: FloatArray? = null
    private var warpOk = false
    private var lastGeometry: BoardGeometry? = null
    private var cutDone = false
    private var cutCorners: FloatArray? = null
    private var master: CropFrameStore.Pending? = null
    private var gray: GrayImage? = null
    private var bgr: BgrImage? = null
    private val motions = HashMap<Pair<Double, Double>, RoiMotion>()
    private val scores = HashMap<Pair<Double, Double>, Double>()

    /** Vor JEDEM Frame: daran erkennt der Dekorator, dass die gemerkten Ergebnisse alt sind. */
    fun beginFrame(image: Mat) {
        current = image
        converted = false
        warpedFor = null
        scores.clear()
        gray = null
        bgr = null
        releaseCut()
    }

    /** Einmal je Frame aus dem Ring von [inner]; jede Engine kopiert in ihren EIGENEN Ring. */
    fun grayDet(): GrayImage = gray ?: inner.grayDet().also { gray = it }

    fun bgrDet(): BgrImage = bgr ?: inner.bgrDet().also { bgr = it }

    private fun releaseCut() {
        master?.release()
        master = null
        cutDone = false
        cutCorners = null
    }

    fun convert(image: Mat) {
        if (converted) return
        inner.convert(image)
        converted = true
    }

    /**
     * Einmal gerechnet — aber nur, wenn alle Engines dieselben Ecken wollen. Zwei verschieden
     * ausgerichtete Bretter still zu teilen waere ein Fehler, den keine Zahl der Auswertung zeigt.
     */
    fun warpDetection(corners: FloatArray): Boolean {
        val seen = warpedFor
        if (seen != null) {
            require(seen.contentEquals(corners)) {
                "SharedFrameWork: zwei Engines wollen verschiedene Ecken — der Warp ist nicht teilbar"
            }
            return warpOk
        }
        warpOk = inner.warpDetection(corners)
        warpedFor = corners.copyOf()
        return warpOk
    }

    fun roiMotion(
        config: TrackerConfig,
        corners: FloatArray,
    ): Double {
        val key = config.motionMargin to config.motionPxThr
        return scores.getOrPut(key) {
            motions
                .getOrPut(key) { RoiMotion(key.first, key.second) }
                .score(requireNotNull(current) { "roiMotion vor beginFrame" }, corners)
        }
    }

    /** Nur bei ECHTER Aenderung: `onGeometryChanged` ruft `dropChain()`, und zehn Engines warfen
     *  die Kette zehnmal weg — die zweite riss mitten im Frame der ersten ab. */
    fun onGeometryChanged(geometry: BoardGeometry) {
        if (geometry == lastGeometry) return
        lastGeometry = geometry
        inner.onGeometryChanged(geometry)
    }

    /** Der Warp haengt am FRAME, nicht an Engine oder `seq`: einmal gewarpt, jeder fragende Store
     *  bekommt eine Kopie. Frueher bediente er nur den ersten Store (`docs/desktop-replay.md`). */
    fun updateCropFrame(
        target: CropFrameStore,
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) {
        if (!cutDone) {
            cutDone = true
            cutCorners = corners.copyOf()
            inner.updateCropFrame(corners, seq, tsMs, bgr, gray)
            master = cut.take()
        }
        require(cutCorners.contentEquals(corners)) { "SharedFrameWork: zwei Engines wollen verschiedene Crop-Ecken" }
        val m = master ?: return
        target.update(
            CropFrameStore.Pending(
                m.cropWarp?.clone(),
                seq,
                tsMs,
                BgrImage(bgr.width, bgr.height, bgr.data.copyOf()),
                GrayImage(gray.width, gray.height, gray.data.copyOf()),
                m.geometry,
                target.cached(seq),
                m.grid?.let { CropFrameStore.GridPlane(it.warp.clone(), it.geometry) },
            ),
        )
    }

    fun stages(): FrameStages<Mat> = inner

    override fun close() {
        releaseCut()
        cut.close()
        inner.close()
    }
}

/** Die Sicht EINER Engine auf die geteilte Arbeit. Alles Teure geht nach [shared]. */
internal class SharedStages(
    private val shared: SharedFrameWork,
    private var config: TrackerConfig,
    private val store: CropFrameStore,
) : FrameStages<Mat> {
    // Die Engine haelt ihre Planes per Referenz (invariant 14). Aus EINEM Ring fuer N Engines
    // ueberschrieb ab sechs Armen jeder Frame die Planes, die die anderen noch mittelten.
    private val grayRing = PlaneRing(ringDepth(config))
    private val bgrRing = PlaneRing(ringDepth(config))

    override fun convert(image: Mat) = shared.convert(image)

    override fun publishFrame() = Unit

    override fun publishBoard() = Unit

    override fun warpDetection(corners: FloatArray): Boolean = shared.warpDetection(corners)

    override fun lumaPreClahe(): Double = shared.stages().lumaPreClahe()

    override fun grayDet(): GrayImage =
        shared.grayDet().let { g -> GrayImage(g.width, g.height, g.data.copyInto(grayRing.next(g.data.size))) }

    override fun bgrDet(): BgrImage = shared.bgrDet().let { b -> BgrImage(b.width, b.height, b.data.copyInto(bgrRing.next(b.data.size))) }

    override fun boardAt(size: Int): BgrImage? = shared.stages().boardAt(size)

    override fun gridCoverage(): Double = shared.stages().gridCoverage()

    override fun roiMotion(corners: FloatArray): Double = shared.roiMotion(config, corners)

    override fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) = shared.updateCropFrame(store, corners, seq, tsMs, bgr, gray)

    override fun onConfigChanged(config: TrackerConfig) {
        this.config = config
        grayRing.resize(ringDepth(config))
        bgrRing.resize(ringDepth(config))
    }

    override fun onGeometryChanged(geometry: BoardGeometry) = shared.onGeometryChanged(geometry)

    override fun close() = Unit
}
