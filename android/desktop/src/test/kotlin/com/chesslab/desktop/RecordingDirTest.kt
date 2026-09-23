package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.io.File

class RecordingDirTest {
    private val video = File("elsewhere/2026-09-19-15-50-28.mp4")

    @Test
    fun `the candidate lives under the video stem`() {
        assertEquals(
            File(File(RECORDINGS_DIR, "2026-09-19-15-50-28"), "candidate.json"),
            candidateFileFor(video, ReplayOptions()),
        )
    }

    @Test
    fun `name= wins over the video stem`() {
        assertEquals(
            File(File(RECORDINGS_DIR, "rec-x"), "candidate.json"),
            candidateFileFor(File("sessions/abc/video.mp4"), ReplayOptions.parse(listOf("name=rec-x"))),
        )
    }

    @Test
    fun `a live camera without name= has no recording`() {
        assertNull(recordingDirOf(ReplayOptions(), null))
        assertEquals(File(RECORDINGS_DIR, "rec-x"), recordingDirOf(ReplayOptions(name = "rec-x"), null))
    }
}
