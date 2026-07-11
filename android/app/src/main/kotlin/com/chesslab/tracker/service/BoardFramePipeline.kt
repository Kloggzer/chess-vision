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
    /** Mean brightness of the rectified gray BEFORE CLAHE — the dark-frame gate's input. */
    val meanLuma: Double,
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
    warper: BoardWarper,
    @Volatile var claheClip: Double,
) : AutoCloseable {
    private val warperLock = Any()

    @Volatile
    var warper: BoardWarper = warper
        set(value) {
            synchronized(warperLock) {
                if (field !== value) field.close()
                field = value
            }
        }

    fun process(
        frame: Mat,
        timestampNs: Long,
    ): ProcessedFrame {
        val (warped, whitePov) =
            synchronized(warperLock) {
                val active = warper
                active.warp(frame) to active.profile.whitePov
            }
        val boardBgr = warped.boardBgr
        val detectGray = warped.detectGray
        // Detect BGR is warped straight to the small size (Python parity) instead of resized from
        // the full-res board — the interpolation differs and can flip a low-contrast recapture's
        // shadow classification.
        val detectBgr = warped.detectBgr
        return try {
            if (!whitePov) {
                Core.rotate(boardBgr, boardBgr, Core.ROTATE_180)
                Core.rotate(detectGray, detectGray, Core.ROTATE_180)
                Core.rotate(detectBgr, detectBgr, Core.ROTATE_180)
            }
            // Measured pre-CLAHE: equalization stretches a near-black scene to mid-gray,
            // which is exactly the noise amplification the dark-frame gate must catch.
            val meanLuma = Core.mean(detectGray).`val`[0]
            preprocessGray(detectGray)
            ProcessedFrame(
                gray = detectGray.toGrayImage(),
                bgr = detectBgr.toBgrImage(),
                boardBgr = boardBgr,
                timestampNs = timestampNs,
                meanLuma = meanLuma,
            )
        } catch (t: org.opencv.core.CvException) {
            boardBgr.release()
            throw t
        } finally {
            detectGray.release()
            detectBgr.release()
        }
    }

    private fun preprocessGray(gray: Mat) {
        if (claheClip > 0) {
            val clahe = Imgproc.createCLAHE(claheClip, Size(TILE, TILE))
            try {
                clahe.apply(gray, gray)
            } finally {
                clahe.collectGarbage()
                clahe.clear()
            }
        }
        // Desktop parity: motion and square evidence consume the same denoised gray.
        Imgproc.GaussianBlur(gray, gray, Size(BLUR_KERNEL, BLUR_KERNEL), 0.0)
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

    override fun close() {
        synchronized(warperLock) { warper.close() }
    }

    private companion object {
        const val TILE = 8.0
        const val BLUR_KERNEL = 5.0
        const val CHANNELS = 3
    }
}
