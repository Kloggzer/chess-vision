package com.chesslab.tracker.record

import com.chesslab.tracker.io.Jsonl
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** B4: ein Anhang, der nur ein PRAEFIX schreibt und wirft (volle Platte), liess den halben Satz stehen;
 *  der naechste klebte daran, und aus einem tolerierten Schwanz wurde Korruption mittendrin. */
class TornAppendTest {
    @TempDir
    lateinit var root: File

    @Test
    fun `nach einem abgerissenen Anhang bleibt das Log lesbar und vollstaendig`() {
        val dir = File(root, "s1")
        val recorder = SessionRecorder(dir, SessionMeta("s1", "default", 640, 480))
        val writer =
            FrameWriter { dest ->
                dest.writeBytes(ByteArray(16))
                16L
            }
        val log = File(dir, "log.jsonl")

        recorder.capture(writer, 1, FEN, "e4", FloatArray(8))
        // Der Zustand nach einem Anhang, der mitten in der Zeile abriss: kein Umbruch dahinter.
        log.appendText("""{"frame":"frames/0001.jpg","ply":2,"fen":"rnbqkb""")
        recorder.capture(writer, 2, FEN, "e5", FloatArray(8))
        recorder.capture(writer, 3, FEN, "Nf3", FloatArray(8))

        val rows = Jsonl.rows(log)
        assertEquals(listOf("e4", "e5", "Nf3"), rows.map { it.getValue("move_san").jsonPrimitive.content })
        assertEquals(3, recorder.count)
    }
}
