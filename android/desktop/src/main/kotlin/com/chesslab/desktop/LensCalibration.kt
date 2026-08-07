package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
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
 * Python applies this in `camera.open_capture`. This is the STORED form only — the optics
 * themselves are `LensModel` in `:core-geometry`, shared by both hosts.
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

/** The stored form as the optical model the shared [com.chesslab.geometry.Undistorter] takes. */
fun LensCalibration.model(): LensModel = LensModel(cameraMatrix.toDoubleArray(), distCoeffs.toDoubleArray())
