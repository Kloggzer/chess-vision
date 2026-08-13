package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.random.Random

@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class BoardGrayTest {
    @Test
    fun `histogram band medians equal sorted reference for odd and even spans`() {
        val width = 37
        val height = 29
        val bytes = ByteArray(width * height).also(Random(42)::nextBytes)
        val mat = Mat(height, width, CvType.CV_8UC1)
        mat.put(0, 0, bytes)
        try {
            val gray = BoardGray(mat)
            for ((lo, hi) in listOf(0 to height, 3 to 20, 7 to 24)) {
                val expected = DoubleArray(width) { x -> medianOf(DoubleArray(hi - lo) { y -> u8(bytes[(lo + y) * width + x]) }) }
                assertArrayEquals(expected, gray.columnMedians(lo, hi))
            }
            for ((lo, hi) in listOf(0 to width, 2 to 20, 9 to 34)) {
                val expected = DoubleArray(height) { y -> medianOf(DoubleArray(hi - lo) { x -> u8(bytes[y * width + lo + x]) }) }
                assertArrayEquals(expected, gray.rowMedians(lo, hi))
            }
        } finally {
            mat.release()
        }
    }

    private fun u8(value: Byte): Double = (value.toInt() and 0xFF).toDouble()
}
