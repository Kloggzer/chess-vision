package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc

/** A locally erased grid (a hand) named in the ENGINE's convention — on the flipped board a wrong
 *  inverse of `squareToColRow` would veto the mirror-image squares. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class GridOcclusionTest {
    private val geom = BoardGeometry(boardSize = SIDE)

    @Test
    fun `a clean grid occludes nothing`() {
        assertEquals(0L, gridOccludedSquares(grid(), geom, PAD))
    }

    @Test
    fun `an erased block reads as the squares under it`() {
        assertEquals(bits("g3", "h3", "g2", "h2"), gridOccludedSquares(erased(), geom, PAD))
    }

    @Test
    fun `parallel bands are bit exact`() {
        val image = erased()
        assertEquals(gridOccludedSquares(image, geom, PAD), gridOccludedSquares(image, geom, PAD, parallel = true))
    }

    @Test
    fun `the flipped board names the mirror squares`() {
        val flipped = geom.copy(whitePov = false)
        assertEquals(bits("b6", "a6", "b7", "a7"), gridOccludedSquares(erased(), flipped, PAD))
    }

    /** Raw indices in `Squares.ALL` order (a1=0, b1=1, .. h8): a helper sharing the production
     *  packing cannot catch a transposition, since only the a1-h8 diagonal survives one. */
    @Test
    fun `the mask is packed rank major`() {
        assertEquals((1L shl E4) or (1L shl E5), gridOccludedSquares(erasedFile(), geom, PAD))
        val flipped = geom.copy(whitePov = false)
        assertEquals((1L shl D4) or (1L shl D5), gridOccludedSquares(erasedFile(), flipped, PAD))
    }

    @Test
    fun `a pad too small for the outer window never accuses the outer lines`() {
        // Interior lines only, no pad: the outer lines are unmeasurable and must read FOUND,
        // so edge squares carry no standing missing edge.
        val img = Mat(SIDE, SIDE, CvType.CV_8UC1, Scalar(WHITE))
        val cell = SIDE / 8.0
        for (i in 1 until 8) {
            val p = pyRound(i * cell).toDouble()
            Imgproc.line(img, Point(p, 0.0), Point(p, SIDE - 1.0), Scalar(0.0), GROOVE)
            Imgproc.line(img, Point(0.0, p), Point(SIDE - 1.0, p), Scalar(0.0), GROOVE)
        }
        assertEquals(0L, gridOccludedSquares(img, geom, 0))
    }

    /** White canvas with all 9 black grid lines per axis, drawn across the padded warp. */
    private fun grid(): Mat {
        val side = SIDE + 2 * PAD
        val img = Mat(side, side, CvType.CV_8UC1, Scalar(WHITE))
        val cell = SIDE / 8.0
        for (i in 0..8) {
            val p = (PAD + pyRound(i * cell)).toDouble()
            Imgproc.line(img, Point(p, 0.0), Point(p, side - 1.0), Scalar(0.0), GROOVE)
            Imgproc.line(img, Point(0.0, p), Point(side - 1.0, p), Scalar(0.0), GROOVE)
        }
        return img
    }

    /** [grid] with the lines wiped under a 2x2-cell "hand" at warp cells g2..h3 (white POV). */
    private fun erased(): Mat {
        val img = grid()
        val cell = SIDE / 8.0
        val x0 = PAD + pyRound(6 * cell) - RUB
        val y0 = PAD + pyRound(5 * cell) - RUB
        val x1 = PAD + pyRound(8 * cell) + RUB
        val y1 = PAD + pyRound(7 * cell) + RUB
        Imgproc.rectangle(img, Point(x0.toDouble(), y0.toDouble()), Point(x1.toDouble(), y1.toDouble()), Scalar(WHITE), -1)
        return img
    }

    /** [grid] with one FILE of two cells wiped — warp cells (col 4, rows 3-4), i.e. e5 and e4. */
    private fun erasedFile(): Mat {
        val img = grid()
        val cell = SIDE / 8.0
        val x0 = PAD + pyRound(4 * cell) - RUB
        val y0 = PAD + pyRound(3 * cell) - RUB
        val x1 = PAD + pyRound(5 * cell) + RUB
        val y1 = PAD + pyRound(5 * cell) + RUB
        Imgproc.rectangle(img, Point(x0.toDouble(), y0.toDouble()), Point(x1.toDouble(), y1.toDouble()), Scalar(WHITE), -1)
        return img
    }

    private fun bits(vararg squares: String): Long {
        var out = 0L
        for (sq in squares) {
            val file = sq[0] - 'a'
            val rank = sq[1] - '0'
            out = out or (1L shl ((rank - 1) * 8 + file))
        }
        return out
    }

    private companion object {
        const val SIDE = 320
        const val PAD = 12
        const val WHITE = 255.0

        /** 3 px, not 1: `halfDepthCentroid` refuses a run under 3 samples, like a real groove has. */
        const val GROOVE = 3

        /** Erase a little past the boundary lines so the rectangle's own edge leaves no groove. */
        const val RUB = 4

        const val E4 = 28
        const val E5 = 36
        const val D4 = 27
        const val D5 = 35
    }
}
