package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val DEFAULT_FPS = 15
private const val SECOND_US = 1_000_000L

/** A buffer starting on a P-frame is undecodable, so every trim lands on a key-frame boundary. */
class PreRollRingTest {
    private fun sample(
        ptsUs: Long,
        sync: Boolean,
        bytes: Int = 100,
    ) = PreRollSample(ByteArray(bytes), ptsUs, if (sync) 1 else 0, sync)

    private fun PreRollRing.addGop(startUs: Long) {
        add(sample(startUs, sync = true))
        add(sample(startUs + 300_000, sync = false))
        add(sample(startUs + 600_000, sync = false))
    }

    @Test
    fun `the time cap trims whole GOPs from the front, never into one`() {
        val ring = PreRollRing(maxDurationUs = 1_500_000, maxBytes = Long.MAX_VALUE)
        ring.addGop(0)
        ring.addGop(SECOND_US)
        ring.add(sample(2 * SECOND_US, sync = true))
        assertEquals(SECOND_US, ring.firstPtsUs)
        assertEquals(SECOND_US, ring.durationUs)
        assertEquals(400L, ring.bytes)
    }

    @Test
    fun `the byte cap drops the oldest GOP`() {
        val ring = PreRollRing(maxDurationUs = Long.MAX_VALUE, maxBytes = 350)
        ring.addGop(0)
        assertEquals(300L, ring.bytes)
        ring.add(sample(SECOND_US, sync = true))
        assertEquals(100L, ring.bytes)
        assertEquals(SECOND_US, ring.firstPtsUs)
    }

    @Test
    fun `the one GOP being written is never dropped by a cap`() {
        val ring = PreRollRing(maxDurationUs = SECOND_US, maxBytes = 150)
        ring.add(sample(0, sync = true))
        ring.add(sample(2 * SECOND_US, sync = false))
        assertEquals(200L, ring.bytes)
        assertEquals(2, ring.flush().size)
    }

    @Test
    fun `leading non-sync samples are dropped regardless of caps`() {
        val ring = PreRollRing(maxDurationUs = Long.MAX_VALUE, maxBytes = Long.MAX_VALUE)
        ring.add(sample(0, sync = false))
        assertNull(ring.firstPtsUs)
        assertEquals(0L, ring.bytes)
        ring.add(sample(100_000, sync = true))
        assertEquals(100_000L, ring.firstPtsUs)
    }

    @Test
    fun `flush rebases to zero and starts at a key frame`() {
        val ring = PreRollRing(maxDurationUs = Long.MAX_VALUE, maxBytes = Long.MAX_VALUE)
        ring.addGop(5 * SECOND_US)
        val flushed = ring.flush()
        assertEquals(listOf(0L, 300_000L, 600_000L), flushed.map { it.ptsUs })
        assertTrue(flushed.first().sync)
    }

    @Test
    fun `a real feed keeps the full window, not the newest GOP`() {
        // Shipped caps, 1 s GOPs at 30 fps, 20 Mbit/s: the BYTE cap binds first, and half a minute must survive.
        val ring = PreRollRing(PRE_ROLL_SECONDS * SECOND_US, preRollMaxBytes(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS))
        val frameUs = SECOND_US / 30
        for (frame in 0 until 30 * 60) {
            ring.add(sample(frame * frameUs, sync = frame % 30 == 0, bytes = 83_000))
        }
        assertTrue(
            ring.durationUs >= 30 * SECOND_US,
            "the ring held ${ring.durationUs / SECOND_US}s of a ${PRE_ROLL_SECONDS}s window",
        )
        assertTrue(ring.durationUs <= PRE_ROLL_SECONDS * SECOND_US, "and never more than the window")
        assertTrue(ring.bytes <= preRollMaxBytes(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS))
        assertTrue(ring.flush().first().sync, "a flush that starts on a P-frame decodes to nothing")
    }

    @Test
    fun `nothing is flushed twice`() {
        val ring = PreRollRing(maxDurationUs = Long.MAX_VALUE, maxBytes = Long.MAX_VALUE)
        ring.addGop(0)
        assertEquals(3, ring.flush().size)
        assertTrue(ring.flush().isEmpty(), "a second flush would write the pre-roll into the file twice")
        assertEquals(0L, ring.bytes)
    }

    @Test
    fun `the shipped caps still hold half a minute of board at the shipped bit rate`() {
        val bytesPerSample = bitRateFor(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS) / 8 / DEFAULT_FPS
        val ring = PreRollRing(PRE_ROLL_SECONDS * SECOND_US, preRollMaxBytes(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, DEFAULT_FPS))
        val frameUs = SECOND_US / DEFAULT_FPS
        for (frame in 0 until DEFAULT_FPS * 60) {
            ring.add(sample(frame * frameUs, sync = frame % DEFAULT_FPS == 0, bytes = bytesPerSample))
        }
        assertTrue(
            ring.durationUs >= 30 * SECOND_US,
            "the ring held ${ring.durationUs / SECOND_US}s of a ${PRE_ROLL_SECONDS}s window at $bytesPerSample B/sample",
        )
    }
}
