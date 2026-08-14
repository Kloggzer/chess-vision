package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val SECOND_US = 1_000_000L

/**
 * The ring's rules, on the JVM: a buffer that ever starts on a P-frame is undecodable, so every
 * trim lands on a key-frame boundary — the same lesson the muxer segmentation learned first.
 */
class PreRollRingTest {
    private fun sample(
        ptsUs: Long,
        sync: Boolean,
        bytes: Int = 100,
    ) = PreRollSample(ByteArray(bytes), ptsUs, if (sync) 1 else 0, sync)

    /** GOP starting at [startUs]: one sync sample and two P-frames, 300 ms apart. */
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
        // Span 0..2 s exceeded 1.5 s: GOP 0 goes entirely; the buffer starts at the 1 s key frame.
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
        // A single GOP over the cap: dropping it would leave the flush with nothing decodable,
        // and at 1 s GOPs / 20 Mbit a real GOP cannot approach either cap anyway.
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
        // The shape of the phone's stream, not a miniature: the shipped caps, 1 s GOPs at 30 fps,
        // ~83 kB a sample (20 Mbit/s), fed for a minute. Measured on the device 2026-08-14 the
        // finished recording carried 1.4 s — one GOP — ahead of the commit, so the assertion that
        // matters is the FLOOR: whatever the trim drops, a full window must survive it.
        val ring = PreRollRing(PRE_ROLL_SECONDS * SECOND_US, PRE_ROLL_MAX_BYTES)
        val frameUs = SECOND_US / 30
        for (frame in 0 until 30 * 60) {
            ring.add(sample(frame * frameUs, sync = frame % 30 == 0, bytes = 83_000))
        }
        assertTrue(
            ring.durationUs >= 19 * SECOND_US,
            "the ring held ${ring.durationUs / SECOND_US}s of a ${PRE_ROLL_SECONDS}s window",
        )
        assertTrue(ring.durationUs <= PRE_ROLL_SECONDS * SECOND_US, "and never more than the window")
        assertTrue(ring.bytes <= PRE_ROLL_MAX_BYTES)
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
}
