package com.chesslab.tracker.spectate

import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.common.BitMatrix
import com.google.zxing.qrcode.QRCodeWriter

private const val QR_MIN_PX = 64
private const val QR_MAX_PX = 2048
private const val QR_MARGIN = 1
private const val BLACK = 0xFF000000.toInt()
private const val WHITE = 0xFFFFFFFF.toInt()

/** Split so [matrixFor] (pure ZXing) is testable on the desktop JVM; only [forUrl] needs a `Bitmap`. */
object QrCode {
    /** Below 64 px a phone camera cannot resolve the modules; above 2048 px it is a pointless allocation. */
    fun clampSize(sizePx: Int): Int = sizePx.coerceIn(QR_MIN_PX, QR_MAX_PX)

    fun matrixFor(
        url: String,
        sizePx: Int,
    ): BitMatrix {
        val size = clampSize(sizePx)
        return QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to QR_MARGIN))
    }

    fun forUrl(
        url: String,
        sizePx: Int,
    ): Bitmap {
        val matrix = matrixFor(url, sizePx)
        val pixels = IntArray(matrix.width * matrix.height)
        for (y in 0 until matrix.height) {
            for (x in 0 until matrix.width) {
                pixels[y * matrix.width + x] = if (matrix[x, y]) BLACK else WHITE
            }
        }
        return Bitmap.createBitmap(pixels, matrix.width, matrix.height, Bitmap.Config.ARGB_8888)
    }
}
