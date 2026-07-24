package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar

/** Tier C — `labeling.py:112 crop_square`, `:137 crops_for_frame`, `imgops.py:14`. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class CropsTest {
    private val geom = BoardGeometry(boardSize = 640, padSide = 0.10)

    @Test
    fun `64 crops in all squares order, each 128x128 BGR`() {
        val crops = cropsForFrame(SyntheticBoard.frame(), SyntheticBoard.CORNERS, geom)
        assertEquals(64, crops.size)
        for (crop in crops) {
            assertEquals(128, crop.width())
            assertEquals(128, crop.height())
            assertEquals(CvType.CV_8UC3, crop.type())
        }
        // allSquares() order: index 0 is a1 (bottom-left, board row 7), index 63 is h8.
        val a1 = SyntheticBoard.sample(crops[0], 64, 64)
        val h8 = SyntheticBoard.sample(crops[63], 64, 64)
        assertEquals(SyntheticBoard.cellValue(0, 7), a1, 1.0, "crops[0] must be a1")
        assertEquals(SyntheticBoard.cellValue(7, 0), h8, 1.0, "crops[63] must be h8")
    }

    @Test
    fun `the corner square a8 has real content on all sides - the bordered warp works`() {
        val crops = cropsForFrame(SyntheticBoard.frame(), SyntheticBoard.CORNERS, geom)
        val a8 = crops[allSquares().indexOf("a8")]
        // padSide 0.10 of a 128 px crop ~ 10 px of border per side. On the OUTER two sides
        // (left, top) that must be the source background (60), NOT black - i.e. the crop came
        // from warpBoardForCrops, not from the borderless warp.
        assertEquals(SyntheticBoard.BACKGROUND, SyntheticBoard.sample(a8, 2, 64), 2.0, "a8 left border")
        assertEquals(SyntheticBoard.BACKGROUND, SyntheticBoard.sample(a8, 64, 2), 2.0, "a8 top border")
        // The inner two sides show the neighbouring cells, which are also non-black.
        assertTrue(SyntheticBoard.sample(a8, 125, 64) > 0.0, "a8 right border (b8)")
        assertTrue(SyntheticBoard.sample(a8, 64, 125) > 0.0, "a8 bottom border (a7)")
    }

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
