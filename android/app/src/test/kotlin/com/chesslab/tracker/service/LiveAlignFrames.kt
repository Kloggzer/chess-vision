package com.chesslab.tracker.service

import com.chesslab.tracker.camera.CameraHealth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect

internal const val MARKER_CANVAS = 800
private const val MARKER_PX = 120
private const val MARKER_INSET = 120
private const val WHITE = 255.0

/** Blank on purpose: ArUco finds nothing, which is enough to observe WHERE it looked. */
internal open class BlankFrames(
    private val side: Int,
) : CalibrationFrames<Unit> {
    override fun latestCalibrationFrame(): Mat = Mat(side, side, CvType.CV_8UC3)

    override val rawPreview: StateFlow<Unit?> = MutableStateFlow(null)
    override val previewRotation: StateFlow<Int> = MutableStateFlow(0)
    override val boardPreview: StateFlow<Unit?> = MutableStateFlow(null)
    override val cameraHealth: StateFlow<CameraHealth> = MutableStateFlow(CameraHealth.Up)
}

/** The four board markers really rendered, so the async path finds corners to hand on. */
internal object MarkerFrames : BlankFrames(MARKER_CANVAS) {
    override fun latestCalibrationFrame(): Mat {
        val img = Mat(MARKER_CANVAS, MARKER_CANVAS, CvType.CV_8UC3, Scalar(WHITE, WHITE, WHITE))
        val dict = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
        for (id in 0..3) {
            val marker = Mat()
            Objdetect.generateImageMarker(dict, id, MARKER_PX, marker)
            val bgr = Mat()
            Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
            val (x, y) = markerOrigin(id)
            bgr.copyTo(img.submat(y, y + MARKER_PX, x, x + MARKER_PX))
        }
        return img
    }

    /** Ids in `[a8, h8, h1, a1]` order, inset from the canvas edges. */
    private fun markerOrigin(id: Int): Pair<Int, Int> {
        val far = MARKER_CANVAS - MARKER_INSET - MARKER_PX
        return when (id) {
            0 -> MARKER_INSET to MARKER_INSET
            1 -> far to MARKER_INSET
            2 -> far to far
            else -> MARKER_INSET to far
        }
    }
}
