package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar

@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class CropsTest {
    @Test
    fun `the warp border always covers the pad, so no edge crop is black padded`() {
        // The box can no longer reach past the border; the black-pad path stays as a guard no geometry should trigger.
        val geom = BoardGeometry(boardSize = 640, padSide = 0.25)
        val bordered = warpBoardForCrops(SyntheticBoard.frame(), geom, SyntheticBoard.CORNERS)
        val crop = cropSquare(bordered, "a8", geom)
        assertTrue(SyntheticBoard.sample(crop, 64, 0) > 0.0, "top row is board surroundings, not black pad")
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

    @Test
    fun `sequential scratch cropper is pixel-identical for every square`() {
        val geometry = BoardGeometry(boardSize = 640, padSide = 0.25, outW = 80, outH = 80)
        val bordered = warpBoardForCrops(SyntheticBoard.frame(), geometry, SyntheticBoard.CORNERS)
        try {
            SquareCropper().use { cropper ->
                allSquares().forEach { square ->
                    val expected = cropSquare(bordered, square, geometry)
                    try {
                        assertEquals(0.0, Core.norm(expected, cropper.crop(bordered, square, geometry), Core.NORM_INF), square)
                    } finally {
                        expected.release()
                    }
                }
            }
        } finally {
            bordered.release()
        }
    }
}
