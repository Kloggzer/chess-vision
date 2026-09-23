package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Mat

/** Tier C — entry.md invariant 1. The borderless detection warp and the bordered crop warp are
 *  two DIFFERENT things and this test exists to make a future "simplification" fail loudly. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class WarpTest {
    private val geom = BoardGeometry(boardSize = 640, padSide = 0.10)

    @Test
    fun `the borderless warp puts the playing field on zero to targetSize`() {
        val frame = SyntheticBoard.frame()
        val warped = warpFromCorners(frame, geom, SyntheticBoard.CORNERS)
        assertEquals(640, warped.width())
        assertEquals(640, warped.height())
        for (row in 0 until 8) {
            for (col in 0 until 8) {
                val x = ((col + 0.5) * 80).toInt()
                val y = ((row + 0.5) * 80).toInt()
                assertEquals(
                    SyntheticBoard.cellValue(col, row),
                    SyntheticBoard.sample(warped, x, y),
                    1.0,
                    "cell ($col,$row) centre",
                )
            }
        }
    }

    @Test
    fun `target size scales rows 0 and 1 only - proportional coordinates`() {
        val frame = SyntheticBoard.frame()
        val small = warpFromCorners(frame, geom, SyntheticBoard.CORNERS, targetSize = 320)
        val big = warpFromCorners(frame, geom, SyntheticBoard.CORNERS, targetSize = 1280)
        assertEquals(320, small.width())
        assertEquals(1280, big.width())
        for (row in 0 until 8) {
            for (col in 0 until 8) {
                val expected = SyntheticBoard.cellValue(col, row)
                assertEquals(expected, SyntheticBoard.sample(small, ((col + 0.5) * 40).toInt(), ((row + 0.5) * 40).toInt()), 1.0)
                assertEquals(expected, SyntheticBoard.sample(big, ((col + 0.5) * 160).toInt(), ((row + 0.5) * 160).toInt()), 1.0)
            }
        }
    }

    @Test
    fun `the crop warp is the borderless warp shifted by exactly B on a larger canvas`() {
        val frame = SyntheticBoard.frame()
        val b = cropBorderPx(geom)
        assertEquals(8, b, "0.10 * 80 = 8 at boardSize 640")
        val borderless = warpFromCorners(frame, geom, SyntheticBoard.CORNERS)
        val bordered = warpBoardForCrops(frame, geom, SyntheticBoard.CORNERS)
        assertEquals(640 + 2 * b, bordered.width())
        assertEquals(640 + 2 * b, bordered.height())
        for (row in 0 until 8) {
            for (col in 0 until 8) {
                val x = ((col + 0.5) * 80).toInt()
                val y = ((row + 0.5) * 80).toInt()
                assertEquals(
                    SyntheticBoard.sample(borderless, x, y),
                    SyntheticBoard.sample(bordered, x + b, y + b),
                    1.0,
                    "cell ($col,$row) must sit at +B in the bordered warp",
                )
            }
        }
        // The border really carries the source background, not black padding.
        assertEquals(SyntheticBoard.BACKGROUND, SyntheticBoard.sample(bordered, 2, 2), 1.0)
    }

    @Test
    fun `both warps write into a caller supplied destination`() {
        val frame = SyntheticBoard.frame()
        val dstA = Mat()
        val dstB = Mat()
        assertSame(dstA, warpFromCorners(frame, geom, SyntheticBoard.CORNERS, targetSize = 320, dst = dstA))
        assertSame(dstB, warpBoardForCrops(frame, geom, SyntheticBoard.CORNERS, dst = dstB))
        assertEquals(320, dstA.width())
        assertEquals(640 + 2 * cropBorderPx(geom), dstB.width())
    }

    @Test
    fun `seam conversion round trips a warp`() {
        val frame = SyntheticBoard.frame()
        val warped = warpFromCorners(frame, geom, SyntheticBoard.CORNERS, targetSize = 320)
        val bgr = toBgrImage(warped)
        assertEquals(320, bgr.width)
        assertEquals(320 * 320 * 3, bgr.data.size)
        val gray = GrayPipeline(claheClip = 0.0).toGray(warped)
        val g = toGrayImage(gray)
        assertEquals(320 * 320, g.data.size)
    }
}
