package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.tracker.geometry.BoardWarper
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** Engine inputs plus the full-res rectified board (for UI overlays / CNN). */
class ProcessedFrame(
    val gray: GrayImage,
    val bgr: BgrImage,
    val boardBgr: Mat,
    val timestampNs: Long,
)

/**
 * Warp → orient → CLAHE bridge between a camera [Mat] and the pure engine
 * ([GrayImage]/[BgrImage]).
 *
 * - Discrepancy #7: CLAHE (clip from settings, default 2.0, tile 8×8) is applied
 *   to the gray **detect** image every frame, identically, BEFORE the engine sees
 *   it (`tracker.py:788`, `config.py:74`). [claheClip] is a live tunable.
 * - Discrepancy #8: the engine assumes a white-POV board, so a black-POV profile
 *   is rotated 180° after warping and before the engine.
 *
 * The engine's HSV/Lab vetoes index the BGR image with geometry derived from the
 * gray width, so the engine BGR is produced at the detect resolution (matching
 * [WarpedBoard.detectGray]); the full-res board is exposed separately for overlays.
 */
class BoardFramePipeline(
    @Volatile var warper: BoardWarper,
    @Volatile var claheClip: Double,
) {
    private val whitePov get() = warper.profile.whitePov

    fun process(
        frame: Mat,
        timestampNs: Long,
    ): ProcessedFrame {
        val warped = warper.warp(frame)
        val boardBgr = warped.boardBgr
        val detectGray = warped.detectGray
        if (!whitePov) {
            Core.rotate(boardBgr, boardBgr, Core.ROTATE_180)
            Core.rotate(detectGray, detectGray, Core.ROTATE_180)
        }
        applyClahe(detectGray)

        val detectBgr = Mat()
        Imgproc.resize(boardBgr, detectBgr, detectGray.size())

        val result =
            ProcessedFrame(
                gray = detectGray.toGrayImage(),
                bgr = detectBgr.toBgrImage(),
                boardBgr = boardBgr,
                timestampNs = timestampNs,
            )
        detectGray.release()
        detectBgr.release()
        return result
    }

    private fun applyClahe(gray: Mat) {
        val clahe = Imgproc.createCLAHE(claheClip, Size(TILE, TILE))
        clahe.apply(gray, gray)
    }

    private fun Mat.toGrayImage(): GrayImage {
        val buf = ByteArray((rows() * cols()))
        get(0, 0, buf)
        return GrayImage(cols(), rows(), buf)
    }

    private fun Mat.toBgrImage(): BgrImage {
        val buf = ByteArray(rows() * cols() * CHANNELS)
        get(0, 0, buf)
        return BgrImage(cols(), rows(), buf)
    }

    private companion object {
        const val TILE = 8.0
        const val CHANNELS = 3
    }
}
