package com.chesslab.desktop

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.pipeline.FrameStages
import com.chesslab.tracker.pipeline.RoiMotion
import org.opencv.core.Mat

/**
 * Die Pixelarbeit EINMAL fuer N Engines: der erste Aufrufer rechnet, die uebrigen lesen.
 *
 * Gemessen lohnt es sich, weil der Frame-Durchgang von der Konfiguration fast nicht abhaengt —
 * Warp, Grau, Grid und Brett folgen aus Geometrie und CLAHE. Nur die Bewegungsmessung haengt an
 * `motionMargin`/`motionPxThr`; sie wird darum je WERTEPAAR gehalten, nicht je Engine, denn zwei
 * Konfigurationen mit denselben beiden Zahlen bekommen dasselbe Ergebnis.
 */
internal class SharedFrameWork(
    private val inner: FrameStages<Mat>,
) : AutoCloseable {
    private var current: Mat? = null
    private var converted = false
    private var warpedFor: FloatArray? = null
    private var warpOk = false
    private var lastGeometry: BoardGeometry? = null
    private var croppedSeq = -1L
    private val motions = HashMap<Pair<Double, Double>, RoiMotion>()
    private val scores = HashMap<Pair<Double, Double>, Double>()

    /** Vor JEDEM Frame: daran erkennt der Dekorator, dass die gemerkten Ergebnisse alt sind. */
    fun beginFrame(image: Mat) {
        current = image
        converted = false
        warpedFor = null
        scores.clear()
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
            motions.getOrPut(key) { RoiMotion(key.first, key.second) }
                .score(requireNotNull(current) { "roiMotion vor beginFrame" }, corners)
        }
    }

    /**
     * Nur bei echter Aenderung durchreichen: `onGeometryChanged` ruft `dropChain()`, und zehn
     * Engines mit DERSELBEN Geometrie warfen die Kette zehnmal weg — die zweite riss danach mit
     * "warpDetection must run first" ab, mitten im Frame der ersten.
     */
    fun onGeometryChanged(geometry: BoardGeometry) {
        if (geometry == lastGeometry) return
        lastGeometry = geometry
        inner.onGeometryChanged(geometry)
    }

    /**
     * Die Crops haengen an (Frame, Ecken, Geometrie) — NICHT an der Konfiguration. Der
     * Beobachtungs-Cache greift erst danach, weil sein Schluessel der Crop-INHALT ist; geschnitten
     * wurde bisher je Engine. Gemessen sind Beobachtungen 56 % eines Laufs.
     */
    fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) {
        if (seq == croppedSeq) return
        croppedSeq = seq
        inner.updateCropFrame(corners, seq, tsMs, bgr, gray)
    }

    fun stages(): FrameStages<Mat> = inner

    override fun close() = inner.close()
}

/** Die Sicht EINER Engine auf die geteilte Arbeit. Alles Teure geht nach [shared]. */
internal class SharedStages(
    private val shared: SharedFrameWork,
    private var config: TrackerConfig,
) : FrameStages<Mat> {
    override fun convert(image: Mat) = shared.convert(image)

    override fun publishFrame() = Unit

    override fun publishBoard() = Unit

    override fun warpDetection(corners: FloatArray): Boolean = shared.warpDetection(corners)

    override fun lumaPreClahe(): Double = shared.stages().lumaPreClahe()

    override fun grayDet(): GrayImage = shared.stages().grayDet()

    override fun bgrDet(): BgrImage = shared.stages().bgrDet()

    override fun boardAt(size: Int): BgrImage? = shared.stages().boardAt(size)

    override fun gridCoverage(): Double = shared.stages().gridCoverage()

    override fun roiMotion(corners: FloatArray): Double = shared.roiMotion(config, corners)

    override fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) = shared.updateCropFrame(corners, seq, tsMs, bgr, gray)

    override fun onConfigChanged(config: TrackerConfig) {
        this.config = config
    }

    override fun onGeometryChanged(geometry: BoardGeometry) = shared.onGeometryChanged(geometry)

    override fun close() = Unit
}
