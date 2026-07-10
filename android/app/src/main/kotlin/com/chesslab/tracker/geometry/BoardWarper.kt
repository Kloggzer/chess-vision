package com.chesslab.tracker.geometry

import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.core.Point as CvPoint

/**
 * Result of warping one camera frame onto the rectified board.
 *
 * @property boardBgr full-resolution ([CalibrationProfile.boardSize] px square)
 *   BGR board for HSV/Lab colour vetoes.
 * @property detectGray half-resolution ([BoardWarper.DETECT_SCALE]) grayscale
 *   board for the per-square diff pipeline.
 *
 * Consumed by phase 01 (engine) and phase 04 (UI).
 */
class WarpedBoard(
    val boardBgr: Mat,
    val detectGray: Mat,
)

/**
 * Rectifies a camera frame onto the borderless playing field using the manual
 * calibration corners. Ports `warp_from_corners` (`calibration.py:833`) with the
 * homography from `compute_homography` (`calibration.py:289`).
 *
 * Android profiles carry no ArUco margin, so the playing field fills
 * `[0, boardSize]` exactly (margin = 0). Consumed by phase 01/04.
 */
class BoardWarper(
    val profile: CalibrationProfile,
) {
    // Source corners are stored at profile.sourceWidth/Height. The incoming analysis
    // frame may be a different resolution (rawPreview-space calibration, a camera that
    // delivers a size other than the requested enum, etc.), so scale the corners to the
    // frame's actual dimensions on every warp — otherwise the homography maps only a
    // sub-region of the frame and the board cutout is wrong. Cached per frame size.
    private var cachedSize: Pair<Int, Int>? = null
    private var cachedSrc: MatOfPoint2f? = null

    private fun srcPointsFor(
        frameWidth: Int,
        frameHeight: Int,
    ): MatOfPoint2f {
        val key = frameWidth to frameHeight
        cachedSrc?.let { if (cachedSize == key) return it }
        val sx = frameWidth.toDouble() / profile.sourceWidth.toDouble()
        val sy = frameHeight.toDouble() / profile.sourceHeight.toDouble()
        val src =
            MatOfPoint2f().apply {
                fromList(profile.corners.toList().map { CvPoint(it.x * sx, it.y * sy) })
            }
        cachedSrc = src
        cachedSize = key
        return src
    }

    /**
     * Warp [frame] to the full-res BGR board plus the half-res detection gray.
     * Both warps map directly to their target size (the detection gray is warped
     * straight to the small size — no full-res intermediate — as the desktop does).
     */
    fun warp(frame: Mat): WarpedBoard {
        val src = srcPointsFor(frame.cols(), frame.rows())
        val bs = profile.boardSize.toDouble()
        val boardBgr = Mat()
        Imgproc.warpPerspective(frame, boardBgr, homographyTo(src, bs), Size(bs, bs))

        val target = (profile.boardSize * DETECT_SCALE).toInt().toDouble()
        val small = Mat()
        Imgproc.warpPerspective(frame, small, homographyTo(src, target), Size(target, target))
        val gray = Mat()
        Imgproc.cvtColor(small, gray, Imgproc.COLOR_BGR2GRAY)
        return WarpedBoard(boardBgr, gray)
    }

    /**
     * Rescale the corners for a new capture resolution (dynamic resolution,
     * phase 03) and return a warper for it.
     */
    fun forResolution(
        width: Int,
        height: Int,
    ): BoardWarper = BoardWarper(profile.forResolution(width, height))

    /**
     * 3x3 perspective transform mapping the four image corners (a8, h8, h1, a1)
     * onto a [size]-square destination [(0,0), (size,0), (size,size), (0,size)].
     * Mirrors `compute_homography` with margin = 0.
     */
    private fun homographyTo(
        src: MatOfPoint2f,
        size: Double,
    ): Mat {
        // margin > 0: corners lie this fraction outside the field, so extend the
        // destination outward by m and the output [0,size] shows only the field.
        val m = profile.margin * size
        val dst =
            MatOfPoint2f(
                CvPoint(-m, -m),
                CvPoint(size + m, -m),
                CvPoint(size + m, size + m),
                CvPoint(-m, size + m),
            )
        return Imgproc.getPerspectiveTransform(src, dst)
    }

    companion object {
        /** Detection runs at half the board resolution (desktop parity). */
        const val DETECT_SCALE: Double = 0.5
    }
}
