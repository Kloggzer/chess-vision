package com.chesslab.tracker.record

import com.chesslab.tracker.io.Jsonl
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.Locale

class SessionRecorderLogTest {
    @TempDir
    lateinit var root: File

    private val dir by lazy { File(root, "s1") }

    private fun recorder() = SessionRecorder(dir, SessionMeta("s1", "default", 640, 480))

    /** Die LOGZEILE ist der Commit, nicht das JPEG: sonst ein Frame, den keine Zeile erklaert. */
    @Test
    fun `a frame whose log line cannot be written is not a capture`() {
        val recorder = recorder()
        // Ein Verzeichnis statt des Logs: auf dem Geraet die volle Platte, hier deterministisch.
        val log = File(dir, "log.jsonl")
        log.delete()
        log.mkdirs()

        val rel = recorder.capture(stubWriter(4096), 1, FEN_AFTER_E4, "e4", FloatArray(8))

        assertNull(rel, "ohne Logzeile ist nichts aufgenommen")
        assertEquals(0, recorder.count)
        assertEquals(0L, recorder.bytes)
        assertFalse(File(dir, "frames/0000.jpg").exists(), "das verwaiste JPEG muss weg sein")
    }

    /** Ein Anhang, der nur ein PRAEFIX schrieb, liess den halben Satz stehen, und der naechste klebte daran. */
    @Test
    fun `nach einem abgerissenen Anhang bleibt das Log lesbar und vollstaendig`() {
        val recorder = recorder()
        val log = File(dir, "log.jsonl")

        recorder.capture(stubWriter(), 1, FEN_AFTER_E4, "e4", FloatArray(8))
        log.appendText("""{"frame":"frames/0001.jpg","ply":2,"fen":"rnbqkb""")
        recorder.capture(stubWriter(), 2, FEN_AFTER_E4, "e5", FloatArray(8))
        recorder.capture(stubWriter(), 3, FEN_AFTER_E4, "Nf3", FloatArray(8))

        val rows = Jsonl.rows(log)
        assertEquals(listOf("e4", "e5", "Nf3"), rows.map { it.getValue("move_san").jsonPrimitive.content })
        assertEquals(3, recorder.count)
    }

    /** The default locale gave Arabic-Indic digits on an `ar-EG` phone. */
    @Test
    fun `frame names are ASCII whatever the phone's locale is`() {
        val original = Locale.getDefault()
        try {
            Locale.setDefault(Locale.forLanguageTag("ar-EG"))
            val recorder = SessionRecorder(dir, SessionMeta("s", "p", 8, 8)) { "t" }
            assertEquals("frames/0000.jpg", recorder.capture(stubWriter(1), 1, FEN_AFTER_E4, "e4", FloatArray(8)))
        } finally {
            Locale.setDefault(original)
        }
    }
}
