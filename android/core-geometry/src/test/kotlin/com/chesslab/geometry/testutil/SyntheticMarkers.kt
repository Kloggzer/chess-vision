package com.chesslab.geometry.testutil

import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect

object SyntheticMarkers {
    const val CANVAS: Int = 800
    const val MARKER_PX: Int = 120
    const val INSET: Int = 120

    fun origin(id: Int): Pair<Int, Int> {
        val far = CANVAS - INSET - MARKER_PX
        return when (id) {
            0 -> INSET to INSET
            1 -> far to INSET
            2 -> far to far
            else -> INSET to far
        }
    }

    fun center(id: Int): DoubleArray {
        val (x, y) = origin(id)
        return doubleArrayOf(x + MARKER_PX / 2.0 - 0.5, y + MARKER_PX / 2.0 - 0.5)
    }

    fun frame(ids: List<Int> = listOf(0, 1, 2, 3)): Mat {
        val img = Mat(CANVAS, CANVAS, CvType.CV_8UC3, Scalar(255.0, 255.0, 255.0))
        val dict = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
        for (id in ids) {
            val marker = Mat()
            Objdetect.generateImageMarker(dict, id, MARKER_PX, marker)
            val bgr = Mat()
            Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
            val (x, y) = origin(id)
            bgr.copyTo(img.submat(y, y + MARKER_PX, x, x + MARKER_PX))
        }
        return img
    }

    fun blank(): Mat = Mat(CANVAS, CANVAS, CvType.CV_8UC3, Scalar(255.0, 255.0, 255.0))
}
