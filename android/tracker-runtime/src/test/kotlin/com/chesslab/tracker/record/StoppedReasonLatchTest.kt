package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/**
 * Loeschen ist das einzige Mittel des Nutzers gegen "limit reached" — es muss auch wirken.
 * Der Riegel rastete dauerhaft ein, also nahm die App bis zum Prozessneustart nichts mehr auf.
 */
class StoppedReasonLatchTest {
    private object NoFrames : CaptureSource {
        override fun grab(): CaptureFrame? = null

        override fun geometryNote(): String? = null
    }

    private fun capped() =
        SessionCaptureController(
            source = NoFrames,
            open = { error("no recorder in this test") },
            gates = RecordingGates(),
            prefs = { RecordingPrefs(enabled = true, capBytes = 1L) },
            // Schon ueber der Kappe, bevor irgendetwas laeuft.
            existingBytes = { 2L },
        )

    @Test
    fun `the size-cap latch does not survive the next game`() {
        val capture = capped()
        capture.queue(ply = 1, fen = FEN, san = "e4", clean = true)
        assertNotNull(capture.stoppedReason, "Aufbau: die Kappe muss zuerst greifen")

        capture.stop()

        assertNull(
            capture.stoppedReason,
            "der Riegel rastete dauerhaft ein — auch geloeschte Aufnahmen halfen dann nicht mehr",
        )
    }
}
