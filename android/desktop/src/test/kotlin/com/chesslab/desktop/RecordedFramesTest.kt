package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
private const val AFTER_E4E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

private fun frame(
    elapsedNs: Long,
    fen: String,
) = """{"kind":"frame","elapsedNs":$elapsedNs,"fen":"$fen"}"""

private fun sync(
    elapsedNs: Long,
    durationNs: Long,
) = """{"kind":"video_sync","elapsedNs":$elapsedNs,"durationNs":$durationNs}"""

class RecordedFramesTest {
    /** `rg-2026-08-30-14-33-02`: eine Steigung aus den zwei ersten Sync-Zeilen traegt Faktor 2,36 und wirft den
     *  Vorlauf ins Negative. */
    @Test
    fun `a pre-roll frame lands where the video is, not on a two-point slope`(
        @TempDir dir: File,
    ) {
        val timeline = File(dir, "timeline.jsonl")
        timeline.writeText(
            listOf(
                frame(1_540_000_935_000_000L, STARTPOS),
                frame(1_540_007_291_018_272L, AFTER_E4E5),
                sync(1_540_007_265_519_210L, 6_333_333_000L),
                sync(1_540_007_322_002_595L, 6_466_666_000L),
            ).joinToString("\n") + "\n",
        )

        val times = RecordedFrames.times(timeline)!!

        assertEquals(2, times.size, "the pre-roll frame was dropped as negative")
        assertEquals(2.8138, times[0], 0.001)
        assertEquals(6358.832, times[1], 0.001)
    }

    @Test
    fun `the start position is the one the first recorded frame stood on`(
        @TempDir dir: File,
    ) {
        val timeline = File(dir, "timeline.jsonl")
        timeline.writeText(frame(1L, STARTPOS) + "\n" + frame(2L, AFTER_E4E5) + "\n")

        assertEquals(STARTPOS, RecordedFrames.startFen(timeline))
    }
}
