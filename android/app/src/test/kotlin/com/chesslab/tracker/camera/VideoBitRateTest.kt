package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Every case would pass against a hardwired constant except the coupling ones — which are the point. */
class VideoBitRateTest {
    @Test
    fun twoResolutionsAtOneFrameRateDifferByTheirPixelCount() {
        val small = bitRateFor(QHD_W, QHD_H, FPS)
        val large = bitRateFor(UHD_W, UHD_H, FPS)
        val pixelRatio = (UHD_W.toDouble() * UHD_H) / (QHD_W.toDouble() * QHD_H)
        assertEquals(pixelRatio, large.toDouble() / small, TOLERANCE)
    }

    @Test
    fun twiceTheFrameRateIsTwiceTheRate() {
        assertEquals(2.0, bitRateFor(QHD_W, QHD_H, FPS * 2).toDouble() / bitRateFor(QHD_W, QHD_H, FPS), TOLERANCE)
    }

    @Test
    fun theDecidedProfilesComeOutOfTheFormula() {
        assertClose(30_000_000, bitRateFor(QHD_W, QHD_H, FPS))
        assertClose(67_000_000, bitRateFor(UHD_W, UHD_H, FPS))
    }

    @Test
    fun aTinyFrameIsFlooredRatherThanBelieved() {
        assertTrue(rawBitRateFor(TINY, TINY, FPS) < MIN_VIDEO_BIT_RATE)
        assertEquals(MIN_VIDEO_BIT_RATE, bitRateFor(TINY, TINY, FPS))
    }

    @Test
    fun aCaptureProfileDerivesItsOwnRate() {
        assertEquals(bitRateFor(UHD_W, UHD_H, FPS), CaptureProfile(UHD_W, UHD_H, FPS).bitRate)
    }
}

private fun assertClose(
    decided: Int,
    computed: Int,
) {
    val off = kotlin.math.abs(computed - decided).toDouble() / decided
    assertTrue(off < DECIDED_TOLERANCE, "$computed is ${"%.2f".format(off * 100)} % off the decided $decided")
}

private const val QHD_W = 2560
private const val QHD_H = 1440
private const val UHD_W = 3840
private const val UHD_H = 2160
private const val FPS = 15
private const val TINY = 320
private const val TOLERANCE = 1e-6
private const val DECIDED_TOLERANCE = 0.005
