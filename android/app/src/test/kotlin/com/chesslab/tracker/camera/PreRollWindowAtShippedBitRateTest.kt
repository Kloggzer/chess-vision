package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val SECOND_US = 1_000_000L
private const val DEFAULT_FPS = 15

/**
 * The same feed `PreRollRingTest` claims to model, sized from [bitRateFor] instead of from the
 * retired 20 Mbit/s it hardcodes.
 */
class PreRollWindowAtShippedBitRateTest {
    @Test
    fun `the shipped caps still hold half a minute of board`() {
        val bytesPerSample = bitRateFor(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS) / 8 / DEFAULT_FPS
        val ring = PreRollRing(PRE_ROLL_SECONDS * SECOND_US, preRollMaxBytes(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS))
        val frameUs = SECOND_US / DEFAULT_FPS
        for (frame in 0 until DEFAULT_FPS * 60) {
            ring.add(PreRollSample(ByteArray(bytesPerSample), frame * frameUs, 0, sync = frame % DEFAULT_FPS == 0))
        }
        assertTrue(
            ring.durationUs >= 30 * SECOND_US,
            "the ring held ${ring.durationUs / SECOND_US}s of a ${PRE_ROLL_SECONDS}s window at $bytesPerSample B/sample",
        )
    }
}
