package com.chesslab.tracker.record

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** `[a8, h8, h1, a1]`, source pixels — entry.md invariant 11. */
val CORNERS = floatArrayOf(10f, 20f, 110f, 22f, 112f, 122f, 12f, 120f)

fun fakeFrame(bytes: Int = 1000) =
    FrameWriter { dest ->
        dest.writeBytes(ByteArray(bytes))
        bytes.toLong()
    }

class SessionRecorderTest {
    @TempDir
    lateinit var dir: File

    private fun recorder(id: String = "20260724-182233") =
        SessionRecorder(File(dir, id), SessionMeta(id, "default", 1920, 1080)) { "2026-07-24T18:22:33Z" }

    @Test
    fun recorderWritesSliceCompatibleLog() {
        val rec = recorder()
        assertEquals("frames/0000.jpg", rec.capture(fakeFrame(), ply = 1, fen = FEN, moveSan = "e4", corners = CORNERS))
        val line = File(rec.dir, "log.jsonl").readLines().single()
        val entry = Json.parseToJsonElement(line)
        val obj = entry as kotlinx.serialization.json.JsonObject
        assertEquals("frames/0000.jpg", obj.getValue("frame").jsonPrimitive.content)
        assertEquals(
            1,
            obj
                .getValue("ply")
                .jsonPrimitive.content
                .toInt(),
        )
        assertEquals(FEN, obj.getValue("fen").jsonPrimitive.content)
        assertEquals("e4", obj.getValue("move_san").jsonPrimitive.content)
        val corners = obj.getValue("corners").jsonArray
        assertEquals(4, corners.size)
        assertEquals(listOf(10.0, 20.0), corners[0].jsonArray.map { it.jsonPrimitive.content.toDouble() })
        assertEquals(listOf(12.0, 120.0), corners[3].jsonArray.map { it.jsonPrimitive.content.toDouble() })
        assertTrue(File(rec.dir, "frames/0000.jpg").isFile)
    }

    @Test
    fun sessionYamlCarriesTheDesktopKeys() {
        val yaml = File(recorder().dir, "session.yaml").readLines().map { it.substringBefore(":") }
        assertEquals(listOf("session_id", "profile", "mode", "created_at", "camera_index", "frame_size", "notes"), yaml)
        assertTrue(File(dir, "20260724-182233/session.yaml").readText().contains("frame_size: [1920, 1080]"))
    }

    @Test
    fun undoRemovesTheCapturedFrame() {
        val rec = recorder()
        rec.capture(fakeFrame(), 1, FEN, "e4", CORNERS)
        rec.capture(fakeFrame(), 2, FEN, "e5", CORNERS)
        assertTrue(rec.undoLast())
        assertEquals(1, rec.count)
        assertFalse(File(rec.dir, "frames/0001.jpg").exists())
        assertEquals(1, File(rec.dir, "log.jsonl").readLines().size)
        assertEquals(1000L, rec.bytes)
    }

    @Test
    fun aFrameThatCannotBeWrittenIsNotLogged() {
        val rec = recorder()
        assertNull(rec.capture({ 0L }, 1, FEN, null, CORNERS))
        assertEquals(0, rec.count)
        assertEquals("", File(rec.dir, "log.jsonl").readText())
    }

    @Test
    fun finishReportsFramesAndBytes() {
        val rec = recorder()
        rec.capture(fakeFrame(2048), 1, FEN, "e4", CORNERS)
        val result = rec.finish()
        assertEquals("20260724-182233", result.sessionId)
        assertEquals(1, result.frames)
        assertEquals(2048L, result.bytes)
    }

    @Test
    fun videoMetadataIsWrittenWithoutChangingTheSliceLog() {
        val rec = recorder()
        rec.updateVideo(SessionVideoMeta(2560, 1440, 12_000_000_000L, 42_000_000L))
        val yaml = File(rec.dir, "session.yaml").readText()
        assertTrue(yaml.contains("video_file: video.mp4"))
        assertTrue(yaml.contains("video_size: [2560, 1440]"))
        assertTrue(yaml.contains("video_duration_ns: 12000000000"))
        assertEquals("", File(rec.dir, "log.jsonl").readText())
    }
}
