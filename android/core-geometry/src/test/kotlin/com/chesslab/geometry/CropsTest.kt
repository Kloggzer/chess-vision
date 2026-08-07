package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar

/** Tier C — `labeling.py:112 crop_square` and `imgops.py:14`. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class CropsTest {
    @Test
    fun `overhang is black padded, never replicated`() {
        // padUp > padSide: the crop box reaches above what the border covers, so the top of
        // the a8 crop is genuine BLACK padding.
        val tall = BoardGeometry(boardSize = 640, padSide = 0.10, padUp = 0.50)
        val bordered = warpBoardForCrops(SyntheticBoard.frame(), tall, SyntheticBoard.CORNERS)
        val crop = cropSquare(bordered, "a8", tall)
        assertEquals(0.0, SyntheticBoard.sample(crop, 64, 0), 0.0, "top row is black pad, not replicated background")
        assertTrue(SyntheticBoard.sample(crop, 64, 127) > 0.0, "the bottom of the crop still has content")
    }

    @Test
    fun `resizeKeepAspect letterboxes a 2 to 1 region with black bars`() {
        val wide = Mat(100, 200, CvType.CV_8UC3, Scalar(255.0, 255.0, 255.0))
        val out = resizeKeepAspect(wide, 128, 128)
        assertEquals(128, out.width())
        assertEquals(128, out.height())
        // s = 128/200 = 0.64 -> 128 x 64, blitted at y = 32.
        assertEquals(0.0, SyntheticBoard.sample(out, 64, 0), 0.0, "top bar is black")
        assertEquals(0.0, SyntheticBoard.sample(out, 64, 127), 0.0, "bottom bar is black")
        assertEquals(255.0, SyntheticBoard.sample(out, 64, 64), 0.0, "content is centred")
        assertEquals(255.0, SyntheticBoard.sample(out, 0, 64), 0.0, "content spans the full width")
    }

    @Test
    fun `resizeKeepAspect on an empty region yields a black canvas`() {
        val out = resizeKeepAspect(Mat(0, 0, CvType.CV_8UC3), 128, 128)
        assertEquals(128, out.width())
        assertEquals(0.0, SyntheticBoard.sample(out, 64, 64), 0.0)
    }

    @Test
    fun `a degenerate box is widened to one pixel instead of throwing`() {
        // padSide = -0.5 collapses the box; Python's guard turns it into a 1 px box.
        val degenerate = BoardGeometry(boardSize = 640, padSide = -0.5)
        val bordered = warpBoardForCrops(SyntheticBoard.frame(), degenerate, SyntheticBoard.CORNERS)
        val crop = cropSquare(bordered, "d4", degenerate)
        assertEquals(128, crop.width())
        assertEquals(128, crop.height())
    }
}
