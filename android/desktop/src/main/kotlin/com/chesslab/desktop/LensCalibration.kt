package com.chesslab.desktop

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.opencv.calib3d.Calib3d
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import java.io.File

/**
 * The camera's OPTICS, separate from the board's geometry.
 *
 * `CLAUDE.md` fixes the order and the reason: `chesslab lens` models the lens, `chesslab calibrate`
 * models the board, and the lens comes FIRST because a new lens calibration re-stamps every board
 * profile. On a barrel-distorted lens a straight groove is a curve in the image, and a homography
 * is projective — it cannot represent that. Fitting the board without undistorting first therefore
 * absorbs lens error into board geometry, which looks measured and is a confusion of causes.
 *
 * Python applies this in `camera.open_capture`; nothing in the Kotlin tree did, because the phone's
 * lens does not need it. A USB rig camera does.
 */
@Serializable
class LensCalibration(
    val cameraMatrix: List<Double>,
    val distCoeffs: List<Double>,
    val width: Int,
    val height: Int,
    val rms: Double = Double.NaN,
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        /**
         * `data/lens/calib.json`, exported from the `.npz` Python writes.
         *
         * Returns the REASON rather than a bare null: "absent" and "unreadable" are different
         * facts, and a caller that prints one for the other sends you looking in the wrong place.
         * This function learned that the hard way — the file was present and the parse failed on
         * an unknown key, and the message said it was missing.
         */
        fun load(file: File): Result<LensCalibration> =
            when {
                !file.isFile -> Result.failure(NoSuchFileException(file))
                else -> runCatching { json.decodeFromString<LensCalibration>(file.readText()) }
            }
    }
}

/**
 * Undistorts frames in place, using precomputed maps.
 *
 * `initUndistortRectifyMap` once and `remap` per frame, rather than `undistort` per frame: the
 * latter rebuilds the maps every call, which at 30 fps is the whole budget.
 *
 * The calibration is bound to the resolution it was measured at. A frame of another size is NOT
 * silently rescaled — the intrinsics would be wrong in a way nothing downstream could see.
 */
class Undistorter(
    calibration: LensCalibration,
    delivered: Size,
) : AutoCloseable {
    private val mapX = Mat()
    private val mapY = Mat()
    private val out = Mat()

    init {
        require(delivered.width.toInt() == calibration.width && delivered.height.toInt() == calibration.height) {
            "lens calibration is for ${calibration.width}x${calibration.height}, " +
                "the camera delivers ${delivered.width.toInt()}x${delivered.height.toInt()} — recalibrate at this size"
        }
        val k = Mat(3, 3, CvType.CV_64F).apply { put(0, 0, *calibration.cameraMatrix.toDoubleArray()) }
        val d = Mat(1, calibration.distCoeffs.size, CvType.CV_64F).apply { put(0, 0, *calibration.distCoeffs.toDoubleArray()) }
        // The same K for the destination: no rescaling, no cropping. Undistortion moves pixels, it
        // does not reframe the board — a changed field of view would invalidate every stored quad.
        Calib3d.initUndistortRectifyMap(k, d, Mat(), k, delivered, CvType.CV_32FC1, mapX, mapY)
        k.release()
        d.release()
    }

    fun apply(frame: Mat): Mat {
        Imgproc.remap(frame, out, mapX, mapY, Imgproc.INTER_LINEAR)
        return out
    }

    override fun close() {
        listOf(mapX, mapY, out).forEach { it.release() }
    }
}
