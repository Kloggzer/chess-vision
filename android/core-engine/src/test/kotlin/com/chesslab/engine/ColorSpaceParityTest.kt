package com.chesslab.engine

import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertConsumed
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

/** <= 1 LSB per channel, since OpenCV's 8-bit path is fixed-point; the DERIVED sets must still be exact
 *  (`ShadowGamutParityTest`). */
class ColorSpaceParityTest {
    @Serializable
    private data class Patch(
        val name: String,
        val width: Int,
        val height: Int,
        val channels: Int,
    )

    @Serializable
    private data class ColorSpaceMeta(
        val patches: List<Patch>,
    )

    @Test
    fun bgrToHsvMatchesOpenCv() = comparePatches("hsv") { bgr, w, h, out -> bgrToHsv(bgr, w, h, out) }

    @Test
    fun bgrToLabMatchesOpenCv() = comparePatches("lab") { bgr, w, h, out -> bgrToLab(bgr, w, h, out) }

    /** Pure red must land on H == 0, never on the wrapped 180. */
    @Test
    fun hueIsCircular() {
        val out = ByteArray(CHANNELS * 2)
        bgrToHsv(byteArrayOf(0, 0, RED, 1, 0, RED), 2, 1, out)

        assertEquals(0, out[0].toInt() and BYTE_MASK, "pure red hue")
        val wrapped = out[CHANNELS].toInt() and BYTE_MASK
        assertTrue(wrapped == 0 || wrapped >= HUE_NEAR_WRAP, "near-red hue must not sit mid-range: $wrapped")
    }

    private fun comparePatches(
        space: String,
        convert: (ByteArray, Int, Int, ByteArray) -> Unit,
    ) {
        val meta: ColorSpaceMeta = json.decodeFromString(ParityFixtures.colorSpaceMeta())
        assertConsumed(meta.patches, "_colorspace/meta.json patches")
        for (patch in meta.patches) {
            val bgr = ParityFixtures.colorSpacePlane(patch.name, "bgr")
            val expected = ParityFixtures.colorSpacePlane(patch.name, space)
            val need = patch.width * patch.height * patch.channels
            assertEquals(need, bgr.size, "${patch.name}.bgr plane size")
            assertEquals(need, expected.size, "${patch.name}.$space plane size")

            val actual = ByteArray(need)
            convert(bgr, patch.width, patch.height, actual)

            val maxDev = IntArray(CHANNELS)
            val sumDev = LongArray(CHANNELS)
            for (i in 0 until need) {
                val dev = abs((expected[i].toInt() and BYTE_MASK) - (actual[i].toInt() and BYTE_MASK))
                val ch = i % CHANNELS
                if (dev > maxDev[ch]) maxDev[ch] = dev
                sumDev[ch] += dev
            }
            val pixels = patch.width * patch.height
            for (ch in 0 until CHANNELS) {
                val mean = sumDev[ch].toDouble() / pixels
                assertTrue(
                    maxDev[ch] <= MAX_LSB,
                    "${patch.name}.$space channel $ch: max deviation ${maxDev[ch]} > $MAX_LSB LSB",
                )
                assertTrue(
                    mean < MEAN_LSB,
                    "${patch.name}.$space channel $ch: mean deviation $mean >= $MEAN_LSB",
                )
            }
        }
    }

    private companion object {
        const val CHANNELS = 3
        const val BYTE_MASK = 0xFF
        const val MAX_LSB = 1
        const val MEAN_LSB = 0.2
        const val HUE_NEAR_WRAP = 175

        const val RED: Byte = -1
        val json = Json { ignoreUnknownKeys = true }
    }
}
