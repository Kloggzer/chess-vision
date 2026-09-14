package com.chesslab.tracker.record

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.Locale

private const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * `"frames/%04d.jpg".format(n)` formats with the JVM's DEFAULT locale. On a phone set to Arabic
 * (or Nepali, Marathi, …) the digits come out Arabic-Indic, so the frame file and the path written
 * into `log.jsonl` are not the ASCII names `chesslab slice` expects.
 */
class BugHunt20260914bRecorderTest {
    private val original: Locale = Locale.getDefault()

    @AfterEach
    fun restore() = Locale.setDefault(original)

    @Test
    fun `frame names are ASCII whatever the phone's locale is`(
        @TempDir dir: File,
    ) {
        Locale.setDefault(Locale.forLanguageTag("ar-EG"))
        val recorder = SessionRecorder(dir, SessionMeta("s", "p", 8, 8)) { "t" }
        val writer =
            FrameWriter { dest ->
                dest.writeText("x")
                1L
            }
        val rel = recorder.capture(writer, 1, STARTPOS, "e4", FloatArray(8))
        assertEquals("frames/0000.jpg", rel)
    }
}
