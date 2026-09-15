package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/**
 * Die LOGZEILE ist der Commit, nicht das JPEG. `capture` zaehlte `bytes` und `entries` hoch und
 * schrieb die Zeile danach — schlug sie fehl, blieb genau der Zustand zurueck, den der Guard zehn
 * Zeilen darueber ausdruecklich verhindert: ein Frame auf der Platte, den keine Zeile erklaert und
 * ueber den `slice` stolpert. Gefunden von Codex, 2026-09-15.
 */
class CommitBeforeLogTest {
    @TempDir
    lateinit var root: File

    @Test
    fun `a frame whose log line cannot be written is not a capture`() {
        val dir = File(root, "s1")
        val recorder = SessionRecorder(dir, SessionMeta("s1", "default", 640, 480))
        // Ein Verzeichnis dort, wo das Log steht: `appendText` kommt nicht mehr durch. Auf dem
        // Geraet ist das die volle Platte — hier die Bedingung, die sich deterministisch stellt.
        val log = File(dir, "log.jsonl")
        log.delete()
        log.mkdirs()

        val writer =
            FrameWriter { dest ->
                dest.writeBytes(ByteArray(4096))
                4096L
            }
        val rel = recorder.capture(writer, 1, FEN, "e4", FloatArray(8))

        assertNull(rel, "ohne Logzeile ist nichts aufgenommen")
        assertEquals(0, recorder.count)
        assertEquals(0L, recorder.bytes)
        assertFalse(File(dir, "frames/0000.jpg").exists(), "das verwaiste JPEG muss weg sein")
    }
}
