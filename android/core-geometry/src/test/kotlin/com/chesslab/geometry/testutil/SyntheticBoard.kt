package com.chesslab.geometry.testutil

import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc

/** Every cell a DISTINCT gray. The background is NOT black: the bordered crop warp must be shown to pick
 *  up real content outside the playing field. */
object SyntheticBoard {
    const val FRAME_SIDE: Int = 640
    const val QUAD_MIN: Double = 100.0
    const val QUAD_MAX: Double = 500.0
    const val BACKGROUND: Double = 60.0

    val CORNERS: List<DoubleArray> =
        listOf(
            doubleArrayOf(QUAD_MIN, QUAD_MIN),
            doubleArrayOf(QUAD_MAX, QUAD_MIN),
            doubleArrayOf(QUAD_MAX, QUAD_MAX),
            doubleArrayOf(QUAD_MIN, QUAD_MAX),
        )

    fun cellValue(
        col: Int,
        row: Int,
    ): Double = 12.0 + (row * 8 + col) * 3.0

    fun frame(): Mat {
        val img = Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3, Scalar(BACKGROUND, BACKGROUND, BACKGROUND))
        val side = (QUAD_MAX - QUAD_MIN) / 8.0
        for (row in 0 until 8) {
            for (col in 0 until 8) {
                val v = cellValue(col, row)
                Imgproc.rectangle(
                    img,
                    Point(QUAD_MIN + col * side, QUAD_MIN + row * side),
                    Point(QUAD_MIN + (col + 1) * side - 1, QUAD_MIN + (row + 1) * side - 1),
                    Scalar(v, v, v),
                    Imgproc.FILLED,
                )
            }
        }
        return img
    }

    fun sample(
        img: Mat,
        x: Int,
        y: Int,
    ): Double = img.get(y, x)[0]
}
