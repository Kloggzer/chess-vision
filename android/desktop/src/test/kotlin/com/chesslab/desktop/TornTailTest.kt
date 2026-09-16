package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"

/** Der Schreiber wurde mitten in der Zeile erschlagen: kein Umbruch dahinter. */
private const val HALF = "{\"ply\":2,\"fen\":\"rnbqkb"

/**
 * Das Telefon haengt `log.jsonl` und `timeline.jsonl` Zeile fuer Zeile an, die Web-App
 * `corrections.jsonl` — eine halbe LETZTE Zeile ist erwartbar und kein Defekt.
 */
class TornTailTest {
    @TempDir
    lateinit var dir: File

    private fun write(
        name: String,
        text: String,
    ): File = File(dir, name).also { it.writeText(text) }

    @Test
    fun `logMarks survives a half written last line`() {
        val log =
            write(
                "log.jsonl",
                "{\"frame\":\"frames/0000.jpg\",\"ply\":1,\"fen\":\"$E4\",\"ts\":\"2026-08-13T19:34:23Z\"," +
                    "\"move_san\":\"e4\",\"corners\":[[0.0,0.0],[1.0,0.0],[1.0,1.0],[0.0,1.0]]}\n" + HALF,
            )
        assertEquals(listOf(1), logMarks(log, 0.0).map { it.ply })
    }

    @Test
    fun `correctionMap survives a half written last line`() {
        val file =
            write(
                "corrections.jsonl",
                "{\"session_id\":\"s\",\"frame\":\"000001\",\"square\":\"a1\",\"label\":\"wP\"}\n" +
                    "{\"session_id\":\"s\",\"frame\":\"000002\",\"squar",
            )
        assertEquals(mapOf("000001" to mapOf("a1" to "wP")), correctionMap(file, "s"))
    }

    @Test
    fun `a broken line in the MIDDLE of a timeline is loud`() {
        val timeline =
            write(
                "timeline.jsonl",
                "{\"kind\":\"video_sync\",\"elapsedNs\":0,\"durationNs\":0}\n" +
                    "{\"kind\":\"frame\",\"elapsed\n" +
                    "{\"kind\":\"frame\",\"elapsedNs\":1000000}\n",
            )
        assertThrows(RuntimeException::class.java) { RecordedFrames.times(timeline) }
    }
}
