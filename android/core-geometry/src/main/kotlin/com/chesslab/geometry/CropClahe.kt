package com.chesslab.geometry

import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.CLAHE
import org.opencv.imgproc.Imgproc

/**
 * Lokaler Kontrast auf dem L-Kanal eines fertigen Crops — die Kotlin-Seite von
 * `training/torch_data.py:_Clahe`, gemessen in `docs/clahe-band.md`.
 *
 * Kein [ImageNode]: der Graph memoisiert je FRAME, diese Stufe entscheidet je ZELLE.
 */
class CropClahe(
    private val clip: Double,
    private val tile: Int,
    private val minMean: Double = 0.0,
    private val maxMean: Double = MAX_LEVEL,
) : AutoCloseable {
    private val handle: CLAHE = Imgproc.createCLAHE(clip, Size(tile.toDouble(), tile.toDouble()))
    private val lab = Mat()
    private val gray = Mat()
    private val channels = ArrayList<Mat>(LAB_CHANNELS)

    /** `true`, wenn dieser Crop im Band liegt und behandelt wurde. Der Mat wird IN PLACE geaendert. */
    fun applyTo(bgr: Mat): Boolean {
        if (!inside(bgr)) return false
        Imgproc.cvtColor(bgr, lab, Imgproc.COLOR_BGR2Lab)
        Core.split(lab, channels)
        try {
            handle.apply(channels[0], channels[0])
            Core.merge(channels, lab)
            Imgproc.cvtColor(lab, bgr, Imgproc.COLOR_Lab2BGR)
        } finally {
            channels.forEach(Mat::release)
            channels.clear()
        }
        return true
    }

    /**
     * Das Fenster ist ein BAND, keine Schwelle — und es misst den INNEREN Teil der Zelle.
     *
     * Der Rand traegt das Nachbarfeld (`pad_side`), also wuerde ein heller Nachbar eine dunkle
     * Zelle aus dem Band schieben. Python schneidet dafuer `arr.shape[0] // 10` ab; dieselbe Zahl.
     */
    private fun inside(bgr: Mat): Boolean {
        if (minMean <= 0.0 && maxMean >= MAX_LEVEL) return true
        val edge = maxOf(1, bgr.rows() / EDGE_DIVISOR)
        if (bgr.rows() <= 2 * edge || bgr.cols() <= 2 * edge) return false
        Imgproc.cvtColor(bgr, gray, Imgproc.COLOR_BGR2GRAY)
        val inner = gray.submat(edge, bgr.rows() - edge, edge, bgr.cols() - edge)
        return try {
            val mean = Core.mean(inner).`val`[0]
            mean >= minMean && mean < maxMean
        } finally {
            inner.release()
        }
    }

    override fun toString(): String = "clip=$clip tile=$tile band=$minMean..$maxMean"

    override fun close() {
        lab.release()
        gray.release()
    }

    companion object {
        const val MAX_LEVEL = 255.0

        /** `edge = max(1, h // 10)` — dieselbe Zahl wie in `_Clahe._inside`. */
        const val EDGE_DIVISOR = 10
        private const val LAB_CHANNELS = 3
    }
}
