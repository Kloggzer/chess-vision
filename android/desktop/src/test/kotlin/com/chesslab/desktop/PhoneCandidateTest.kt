package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private const val START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
private const val AFTER_E4E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"

/** The sync anchor: video time zero sits at one second of system time, so videoMs = elapsedMs - 1000. */
private const val SYNC_NS = 1_000_000_000L

private fun rowsOf(
    frames: List<FrameRow> = emptyList(),
    decisions: List<DecisionRow> = emptyList(),
    events: List<Pair<Long, Long>> = emptyList(),
) = TimelineRows(listOf(SYNC_NS to 0L), frames, decisions, events)

class PhoneCandidateTest {
    @Test
    fun `the frame rule takes the first frame row showing the position`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, START), FrameRow(20L, 0L, AFTER_E4), FrameRow(30L, 0L, AFTER_E4)),
            )

        val hit = PhoneClock(rows).elapsedNs(1, AFTER_E4, 0L, Long.MIN_VALUE)

        assertEquals(20L to TimeRule.FRAME, hit)
    }

    /** A transposition repeats a placement; the bound is what keeps the second visit from the first. */
    @Test
    fun `a repeated placement after the bound is found again, an earlier one is not`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, AFTER_E4), FrameRow(20L, 0L, AFTER_E4E5), FrameRow(30L, 0L, AFTER_E4)),
            )
        val clock = PhoneClock(rows)

        assertEquals(10L, clock.elapsedNs(1, AFTER_E4, 0L, Long.MIN_VALUE)?.first)
        assertEquals(30L, clock.elapsedNs(3, AFTER_E4, 0L, 20L)?.first)
    }

    @Test
    fun `the decision rule is used when no frame row shows the position`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, START), FrameRow(20L, 0L, START)),
                decisions = listOf(DecisionRow(2, 50L)),
            )

        assertEquals(50L to TimeRule.DECISION, PhoneClock(rows).elapsedNs(2, AFTER_E4E5, 0L, Long.MIN_VALUE))
    }

    /** Both clocks are `System.currentTimeMillis()`, so the nearest row plus the difference. */
    @Test
    fun `the wall rule is the last resort`() {
        val rows = rowsOf(frames = listOf(FrameRow(1_000_000_000L, 1000L, null), FrameRow(2_000_000_000L, 2000L, null)))

        assertEquals(1_400_000_000L to TimeRule.WALL, PhoneClock(rows).elapsedNs(1, AFTER_E4, 1400L, Long.MIN_VALUE))
    }

    @Test
    fun `the frame clock takes the first decoded frame at or after the video time`() {
        val clock = PhoneFrameClock(listOf(0.0, 33.3, 66.7))

        assertEquals(2, clock.indexAt(40.0))
        assertNull(clock.indexAt(100.0))
    }
}
