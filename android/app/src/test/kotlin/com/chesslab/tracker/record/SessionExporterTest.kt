package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.ZipInputStream

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

class SessionExporterTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun zipCarriesTheWholeSessionUnderItsId() {
        val rec = SessionRecorder(File(dir, "20260724-1822"), SessionMeta("20260724-1822", "default", 1920, 1080))
        rec.capture(fakeFrame(), 1, FEN, "e4", CORNERS)
        rec.finish()
        val out = ByteArrayOutputStream()
        assertEquals(3, zipSession(rec.dir, out))
        val names = mutableListOf<String>()
        ZipInputStream(ByteArrayInputStream(out.toByteArray())).use { zip ->
            generateSequence { zip.nextEntry }.forEach { names += it.name }
        }
        assertTrue(names.contains("20260724-1822/session.yaml"), names.toString())
        assertTrue(names.contains("20260724-1822/log.jsonl"), names.toString())
        assertTrue(names.contains("20260724-1822/frames/0000.jpg"), names.toString())
    }

    @Test
    fun storeReportsSizesAndDeletes() {
        val store = SessionStore(dir)
        val rec = SessionRecorder(store.create("s1"), SessionMeta("s1", "default", 1920, 1080))
        rec.capture(fakeFrame(4096), 1, FEN, "e4", CORNERS)
        assertEquals(1, store.list().single().frames)
        assertTrue(store.totalBytes() >= 4096)
        assertTrue(store.delete("s1"))
        assertTrue(store.list().isEmpty())
    }
}
