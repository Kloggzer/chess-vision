package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** A tool that saw only `video.mp4` would label the first minute of a resumed recording and report success. */
class RecordingSegmentsTest {
    @TempDir
    lateinit var dir: File

    private fun touch(name: String) = File(dir, name).apply { writeText("x") }

    @Test
    fun `a single file is its own recording`() {
        val video = touch("video.mp4")
        assertEquals(listOf(video), recordingSegments(video))
    }

    @Test
    fun `the segments follow in order`() {
        val video = touch("video.mp4")
        val second = touch("video-001.mp4")
        val third = touch("video-002.mp4")
        assertEquals(listOf(video, second, third), recordingSegments(video))
    }

    @Test
    fun `a gap ends the recording — a missing 002 does not make 003 part of it`() {
        val video = touch("video.mp4")
        val second = touch("video-001.mp4")
        touch("video-003.mp4")
        assertEquals(listOf(video, second), recordingSegments(video))
    }

    @Test
    fun `nothing beside it is not a segment`() {
        val video = touch("video.mp4")
        touch("video-extra.mp4")
        touch("video.mp4.bak")
        assertEquals(listOf(video), recordingSegments(video))
    }
}
