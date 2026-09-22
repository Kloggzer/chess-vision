package com.chesslab.tracker.capture

import com.chesslab.tracker.io.defaultSideFiles
import com.chesslab.tracker.io.sideFiles
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * `capture.json` faehrt zum PC und wird dort gegen `docs/capture-session.schema.json` gelesen —
 * eine halb geschriebene Datei ist dort kein toleriertes Ende, sondern kaputtes JSON.
 */
class CaptureSessionAtomicTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `capture json is written through a side file`() {
        val session = CaptureSession(shotId = "s1", height = "normal")
        writeCaptureSession(dir, session)
        val file = File(dir, CAPTURE_FILE)
        val before = file.readText()
        File(dir, "$CAPTURE_FILE.tmp").mkdirs()
        sideFiles = { File(dir, "$CAPTURE_FILE.tmp") }
        runCatching { writeCaptureSession(dir, session.copy(note = "zweiter Lauf")) }
        assertEquals(before, file.readText())
    }

    @AfterEach
    fun restoreSideFiles() {
        sideFiles = defaultSideFiles
    }
}
