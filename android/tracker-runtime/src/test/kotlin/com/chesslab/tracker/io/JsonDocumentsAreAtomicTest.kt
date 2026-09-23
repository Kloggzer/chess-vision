package com.chesslab.tracker.io

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.record.BuildStamp
import com.chesslab.tracker.record.SETTINGS_FILE
import com.chesslab.tracker.record.SessionSettingsWriter
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.sync.TRANSFER_MARK
import com.chesslab.tracker.sync.TransferMark
import com.chesslab.tracker.sync.writeMark
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Eine `.jsonl` vertraegt eine halbe LETZTE Zeile, ein JSON-DOKUMENT nicht. */
class JsonDocumentsAreAtomicTest {
    @TempDir
    lateinit var dir: File

    /** Ein Verzeichnis, wo die Nebendatei hin muss: der Schreibversuch scheitert VOR dem Ziel. */
    private fun blockTmp(name: String) {
        File(dir, "$name.tmp").mkdirs()
        sideFiles = { File(dir, "$name.tmp") }
    }

    @AfterEach
    fun restoreSideFiles() {
        sideFiles = defaultSideFiles
    }

    @Test
    fun `settings json is written through a side file`() {
        val writer =
            SessionSettingsWriter(dir, AppSettings(), BuildStamp("0.1.0-test", 7L), TrackerConfig()) { "t" }
        val file = File(dir, SETTINGS_FILE)
        val before = file.readText()
        blockTmp(SETTINGS_FILE)
        runCatching { writer.configChanged(TrackerConfig().copy(maxChanged = 9)) }
        assertEquals(before, file.readText())
    }

    @Test
    fun `the transfer mark is written through a side file`() {
        val mark = TransferMark("http://host:3000", 1L, 9L, 3, "landed")
        writeMark(dir, mark)
        val file = File(dir, TRANSFER_MARK)
        val before = file.readText()
        blockTmp(TRANSFER_MARK)
        runCatching { writeMark(dir, mark.copy(status = "held")) }
        assertEquals(before, file.readText())
    }
}
