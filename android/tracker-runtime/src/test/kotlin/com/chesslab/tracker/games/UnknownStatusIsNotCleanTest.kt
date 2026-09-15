package com.chesslab.tracker.games

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

private val CORNERS = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)

private fun stub(dest: File): Long {
    dest.writeBytes(ByteArray(16))
    return 16L
}

/**
 * `isClean` beantwortet mit `status?.x == null` drei Fragen auf einmal, und bei `status == null`
 * sagen alle drei ja: "wir wissen nichts ueber das Brett" wird zu "das Brett ist sauber". Der
 * Status-Fluss startet auf `null` (`GameSessionWiring`), also trifft das jedes Ereignis vor der
 * ersten Statusmeldung — und loest genau das aus, was das KDoc verhindern soll: die aufgeschobene
 * Aufnahme wird ausgeloest, ohne dass irgendwer die Hand ueber dem Brett ausgeschlossen hat.
 */
class UnknownStatusIsNotCleanTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `an unknown status never releases the deferred photo`() {
        val capture = controller()
        val controller =
            GameSessionController(
                store = GameStore(File(dir, "games").also(File::mkdirs)),
                capture = capture,
                now = { 0L },
                idFor = { "g$it" },
            )
        // Ply 1 committed with a hand in the frame: the photo waits for proof the board is clear.
        capture.queue(1, AFTER_E4, "e4", clean = false)

        controller.onEvent(TrackerEvent.ReAnchored, status = null)

        assertEquals(0, capture.recorder?.count, "ohne Status ist nichts bewiesen, also darf nichts geschrieben werden")
    }

    private fun controller() =
        SessionCaptureController(
            source =
                object : CaptureSource {
                    override fun grab(): CaptureFrame = CaptureFrame(1920, 1080, CORNERS, FrameWriter(::stub))

                    override fun geometryNote(): String? = null
                },
            open = { SessionRecorder(File(dir, "s").also(File::mkdirs), SessionMeta("s", "default", it.width, it.height)) },
            gates = RecordingGates(),
            prefs = { RecordingPrefs(enabled = true) },
            existingBytes = { 0L },
        )
}
