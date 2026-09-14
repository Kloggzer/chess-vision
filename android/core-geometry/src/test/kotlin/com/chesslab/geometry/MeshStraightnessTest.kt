package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import kotlin.math.abs

/**
 * The point of the tilt and curvature stages: a board whose line family fans AND bows like a
 * barrel residual is drawn synthetically. After [straightenBoard] every edge stands vertical in
 * its plain crop and the edge STITCHED down a whole column is straight — while the linear stage
 * provably still shows the bow the coordinator measured on real frame 004251.
 */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class MeshStraightnessTest {
    private val geom = BoardGeometry(boardSize = BS, padSide = 0.05, outW = OUT, outH = OUT)

    private val xs = DoubleArray(9) { it / 8.0 }

    private val tx = DoubleArray(9) { -0.03 + 0.0075 * it }

    private val cx = DoubleArray(9) { CURV_TOP - CURV_STEP * it }

    private fun linePos(
        k: Int,
        t: Double,
    ): Double = xs[k] + tx[k] * (t - 0.5) + cx[k] * (t - 0.5) * (t - 0.5)

    // Sub-pixel endpoints via `shift`: plain `line` rounds to whole pixels, and that staircase
    // alone measures as a 0.7 px slant — the ruler must be finer than what it judges.
    private fun board(): Mat {
        val b = cropBorderPx(geom)
        val n = BS + 2 * b
        val img = Mat(n, n, CvType.CV_8UC3, Scalar(BG, BG, BG))
        for (k in 0..8) {
            var last: Point? = null
            var y = 0.0
            while (y <= n - 1.0) {
                val x = b + linePos(k, (y - b) / BS) * BS
                val at = Point(Math.rint(x * SUBPX), Math.rint(y * SUBPX))
                last?.let { Imgproc.line(img, it, at, Scalar(INK, INK, INK), 2, Imgproc.LINE_AA, SHIFT) }
                last = at
                y += SEGMENT
            }
        }
        return img
    }

    private fun lineCentre(
        crop: Mat,
        rows: IntRange,
    ): Double {
        var weight = 0.0
        var moment = 0.0
        for (y in rows) {
            for (x in 0..WINDOW) {
                val dark = maxOf(0.0, THRESHOLD - crop.get(y, x)[0])
                weight += dark
                moment += dark * x
            }
        }
        require(weight > 0.0) { "no line inside the window" }
        return moment / weight
    }

    // The b-file, not the a-file: the outermost line's excursion legitimately leaves the crop
    // border and its black overhang would poison the centroid; its interior neighbour still
    // carries a real-magnitude bow (c = 0.0375, an 8 px sagitta over this board).
    private fun columnEdges(mesh: GridMesh): List<Triple<Double, Double, Double>> {
        // Once, over the whole raster — then the cut is the same plain rectangle every consumer uses.
        val warped = straightenBoard(board(), mesh, BS, cropBorderPx(geom))
        return (1..8).map { rank ->
            val crop = cropSquare(warped, "b$rank", geom)
            Triple(lineCentre(crop, TOP), lineCentre(crop, MIDDLE), lineCentre(crop, BOTTOM))
        }
    }

    private fun stitchedBow(edges: List<Triple<Double, Double, Double>>): Double {
        val mids = edges.map { it.second }
        return abs((mids.first() + mids.last()) / 2 - (mids[3] + mids[4]) / 2)
    }

    @Test
    fun `curved cut edges are vertical per crop and straight across the stitched column`() {
        val edges = columnEdges(GridMesh(xs, xs.copyOf(), tx, DoubleArray(9), cx, DoubleArray(9)))
        for ((rank, edge) in edges.withIndex()) {
            val slant = abs(edge.first - edge.third)
            val bow = abs(edge.second - (edge.first + edge.third) / 2)
            assertTrue(slant <= STRAIGHT_PX, "c${rank + 1}: slant $slant px after the curved cut")
            assertTrue(bow <= STRAIGHT_PX, "c${rank + 1}: in-crop bow $bow px after the curved cut")
        }
        val mids = edges.map { it.second }
        val spread = mids.max() - mids.min()
        assertTrue(spread <= STRAIGHT_PX, "stitched c-file edge wanders $spread px across the column")
    }

    @Test
    fun `the linear stage still shows the bow, or the fixture proves nothing`() {
        val bow = stitchedBow(columnEdges(GridMesh(xs, xs.copyOf(), tx, DoubleArray(9))))
        assertTrue(bow > CONTROL_PX, "the drawn curvature must bow the linear stitch, measured $bow px")
    }

    private companion object {
        const val BS = 640
        const val OUT = 128
        const val BG = 205.0
        const val INK = 20.0
        const val THRESHOLD = 150.0
        const val SEGMENT = 8.0
        const val SHIFT = 4
        const val SUBPX = 16.0
        const val CURV_TOP = 0.05
        const val CURV_STEP = 0.0125
        const val WINDOW = 17
        const val STRAIGHT_PX = 0.3
        const val CONTROL_PX = 1.0
        val TOP = 12..22
        val MIDDLE = 55..75
        val BOTTOM = 105..115
    }
}
