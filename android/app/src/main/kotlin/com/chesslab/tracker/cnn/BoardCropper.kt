package com.chesslab.tracker.cnn

import org.opencv.core.Mat
import org.opencv.core.Rect
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * Cuts the 64 per-square crops (in [ALL_SQUARES] order) from a warped white-POV
 * BGR board with the training crop geometry (`config.py CropDefaults`):
 * `pad_up` extends the box upward for the 3D piece lean, `pad_side` expands all
 * four sides; boxes are clamped to the board (the desktop warps with an extra
 * border instead — STATUS.md note), then resized to the run's `out_size`.
 *
 * Pure crop math is separated into [cropRect] for JVM testability; the OpenCV
 * submat/resize/RGB conversion needs native libs and stays untested here.
 */
class BoardCropper(
    private val outWidth: Int,
    private val outHeight: Int,
    private val padUp: Double = PAD_UP,
    private val padSide: Double = PAD_SIDE,
) {
    /** Crop all 64 squares of a warped board [Mat] (BGR, square, white POV). */
    fun crops(board: Mat): List<SquareCrop> {
        require(board.rows() == board.cols()) { "warped board must be square" }
        val size = board.rows()
        return ALL_SQUARES.map { sq ->
            val r = cropRect(sq, size, padUp, padSide)
            val resized = Mat()
            val sub = board.submat(Rect(r.x, r.y, r.width, r.height))
            Imgproc.resize(sub, resized, Size(outWidth.toDouble(), outHeight.toDouble()))
            sub.release()
            val crop = toRgbCrop(resized)
            resized.release()
            crop
        }
    }

    private fun toRgbCrop(mat: Mat): SquareCrop {
        val bytes = ByteArray(mat.rows() * mat.cols() * CHANNELS)
        mat.get(0, 0, bytes)
        val rgb = FloatArray(bytes.size)
        for (p in bytes.indices step CHANNELS) {
            // BGR byte order -> RGB floats 0..255.
            rgb[p] = (bytes[p + 2].toInt() and BYTE_MASK).toFloat()
            rgb[p + 1] = (bytes[p + 1].toInt() and BYTE_MASK).toFloat()
            rgb[p + 2] = (bytes[p].toInt() and BYTE_MASK).toFloat()
        }
        return SquareCrop(mat.cols(), mat.rows(), rgb)
    }

    /** Axis-aligned crop box in board pixels. */
    data class CropRect(
        val x: Int,
        val y: Int,
        val width: Int,
        val height: Int,
    )

    companion object {
        /** `config.py CropDefaults.pad_up` — 3D pieces lean into the rank behind. */
        const val PAD_UP: Double = 0.35

        /** `config.py CropDefaults.pad_side` — symmetric expansion, all 4 sides. */
        const val PAD_SIDE: Double = 0.05

        private const val CHANNELS = 3
        private const val BYTE_MASK = 0xFF
        private const val FILES = "abcdefgh"
        private const val RANKS = 8

        /**
         * Crop box of [square] on a white-POV board of [boardSize] px: the base
         * cell expanded by pad_side all around and pad_up upward (toward the
         * rank behind), clamped to the board.
         */
        fun cropRect(
            square: String,
            boardSize: Int,
            padUp: Double = PAD_UP,
            padSide: Double = PAD_SIDE,
        ): CropRect {
            val cell = boardSize / RANKS.toDouble()
            val file = FILES.indexOf(square[0])
            val rank = square[1].digitToInt()
            val xLeft = file * cell - padSide * cell
            val xRight = (file + 1) * cell + padSide * cell
            val yTop = (RANKS - rank) * cell - (padUp + padSide) * cell
            val yBottom = (RANKS - rank + 1) * cell + padSide * cell
            val x0 = xLeft.coerceAtLeast(0.0).toInt()
            val y0 = yTop.coerceAtLeast(0.0).toInt()
            val x1 = xRight.coerceAtMost(boardSize.toDouble()).toInt()
            val y1 = yBottom.coerceAtMost(boardSize.toDouble()).toInt()
            return CropRect(x0, y0, x1 - x0, y1 - y0)
        }
    }
}
