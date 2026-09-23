package com.chesslab.tracker.service

import android.graphics.Bitmap
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/** Downscaled so the UI never uploads a QHD texture at 5 fps. Off the analyzer thread. */
fun bgrToBitmap(
    bgr: Mat,
    maxSide: Int,
): Bitmap? {
    val side = maxOf(bgr.cols(), bgr.rows())
    val scale = if (side > maxSide) maxSide.toDouble() / side else 1.0
    val resized = if (scale < 1.0) Mat() else null
    val rgba = Mat()
    return try {
        if (resized != null) Imgproc.resize(bgr, resized, Size(), scale, scale, Imgproc.INTER_AREA)
        Imgproc.cvtColor(resized ?: bgr, rgba, Imgproc.COLOR_BGR2RGBA)
        Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888).also { Utils.matToBitmap(rgba, it) }
    } finally {
        resized?.release()
        rgba.release()
    }
}
