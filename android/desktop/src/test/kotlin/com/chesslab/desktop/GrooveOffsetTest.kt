package com.chesslab.desktop

import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc

class GrooveOffsetTest {
    private fun board(shiftPx: Int): Mat {
        val mat = Mat(SIDE, SIDE, CvType.CV_8UC3, Scalar(200.0, 200.0, 200.0))
        for (k in 0..8) {
            val p = k * SIDE / 8 + shiftPx
            Imgproc.line(mat, Point(p.toDouble(), 0.0), Point(p.toDouble(), SIDE - 1.0), Scalar(20.0, 20.0, 20.0), 1)
            Imgproc.line(mat, Point(0.0, p.toDouble()), Point(SIDE - 1.0, p.toDouble()), Scalar(20.0, 20.0, 20.0), 1)
        }
        return mat
    }

    private val identity =
        (DEFAULT_MARKER_MARGIN * SIDE).toFloat().let { m ->
            floatArrayOf(-m, -m, SIDE + m, -m, SIDE + m, SIDE + m, -m, SIDE + m)
        }

    @Test
    fun `a grid on its grooves measures zero, a shifted one its shift in cells`() {
        val cell = SIDE / 8.0
        assertEquals(0.0, grooveOffset(board(0), identity, SIDE), 0.02)
        assertEquals(14 / cell, grooveOffset(board(14), identity, SIDE), 0.011, "shifted grid")
    }

    @Test
    fun `the median ignores one covered frame`() {
        assertEquals(0.01, medianOffset(listOf(0.01, 0.31, 0.0)), 1e-9)
    }

    companion object {
        const val SIDE = 800

        @JvmStatic
        @BeforeAll
        fun natives() = NativeCv.require()
    }
}
