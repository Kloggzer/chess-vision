package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc

@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class GridLinesTest {
    @Test
    fun `every fixture plane reproduces Python's coverage`() {
        val rows = GeometryFixtures.jsonl("_geometry/grid_coverage.jsonl")
        assertTrue(rows.size >= 7, "expected the 7 grid-coverage planes, got ${rows.size}")
        for (row in rows) {
            val name = row["name"] as String
            val w = GeometryFixtures.num(row["width"]).toInt()
            val h = GeometryFixtures.num(row["height"]).toInt()
            val bytes = GeometryFixtures.plane("_geometry/" + (row["plane"] as String).removePrefix("_geometry/"))
            assertEquals(w * h, bytes.size, "$name plane size")
            val mat = Mat(h, w, CvType.CV_8UC1)
            mat.put(0, 0, bytes)
            val expected = GeometryFixtures.num(row["coverage"])
            val actual = gridLineCoverage(mat)
            assertTrue(GeometryFixtures.close(expected, actual), "$name: expected $expected, got $actual")
        }
    }

    @Test
    fun `a clean synthetic grid scores one`() {
        assertEquals(1.0, gridLineCoverage(grid(320)), 0.0)
    }

    @Test
    fun `an image below the size guard reports a clear board`() {
        assertEquals(1.0, gridLineCoverage(Mat(8, 8, CvType.CV_8UC1, Scalar(0.0))), 0.0)
        assertEquals(1.0, gridLineCoverage(Mat(15, 300, CvType.CV_8UC1, Scalar(0.0))), 0.0)
    }

    @Test
    fun `a flat image has no grid lines at all`() {
        assertEquals(0.0, gridLineCoverage(Mat(320, 320, CvType.CV_8UC1, Scalar(128.0))), 0.0)
    }

    private fun grid(side: Int): Mat {
        val img = Mat(side, side, CvType.CV_8UC1, Scalar(255.0))
        val cell = side / 8.0
        for (i in 1 until 8) {
            val p = (i * cell).toInt().toDouble()
            Imgproc.line(img, Point(p, 0.0), Point(p, side - 1.0), Scalar(0.0), 1)
            Imgproc.line(img, Point(0.0, p), Point(side - 1.0, p), Scalar(0.0), 1)
        }
        return img
    }
}
