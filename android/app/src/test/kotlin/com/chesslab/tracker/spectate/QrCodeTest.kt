package com.chesslab.tracker.spectate

import com.google.zxing.BinaryBitmap
import com.google.zxing.LuminanceSource
import com.google.zxing.common.BitMatrix
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** ZXing's JavaSE image sources are not on the Android classpath. */
private class MatrixSource(
    private val matrix: BitMatrix,
) : LuminanceSource(matrix.width, matrix.height) {
    override fun getRow(
        y: Int,
        row: ByteArray?,
    ): ByteArray {
        val out = if (row != null && row.size >= width) row else ByteArray(width)
        for (x in 0 until width) out[x] = if (matrix[x, y]) 0 else BRIGHT
        return out
    }

    override fun getMatrix(): ByteArray {
        val out = ByteArray(width * height)
        for (y in 0 until height) getRow(y, ByteArray(width)).copyInto(out, y * width)
        return out
    }

    private companion object {
        const val BRIGHT: Byte = -1
    }
}

class QrCodeTest {
    @Test
    fun qrEncodesTheDisplayedUrl() {
        val url = "http://192.168.1.42:$SPECTATOR_PORT"
        val bitmap = BinaryBitmap(HybridBinarizer(MatrixSource(QrCode.matrixFor(url, 512))))
        assertEquals(url, QRCodeReader().decode(bitmap).text)
    }

    @Test
    fun qrSizeIsClamped() {
        assertEquals(64, QrCode.clampSize(10))
        assertEquals(2048, QrCode.clampSize(9999))
        assertEquals(512, QrCode.clampSize(512))
        assertEquals(64, QrCode.matrixFor("http://10.0.0.2:$SPECTATOR_PORT", 1).width)
    }
}
