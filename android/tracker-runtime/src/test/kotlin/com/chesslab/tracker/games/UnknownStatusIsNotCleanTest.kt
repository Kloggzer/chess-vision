package com.chesslab.tracker.games

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.record.FEN_AFTER_E4
import com.chesslab.tracker.record.captureUnder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** The status flow starts on `null`, so every event before the first status released the deferred photo. */
class UnknownStatusIsNotCleanTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `an unknown status never releases the deferred photo`() {
        val capture = captureUnder(dir)
        val controller =
            GameSessionController(
                store = GameStore(File(dir, "games").also(File::mkdirs)),
                capture = capture,
                now = { 0L },
                idFor = { "g$it" },
            )
        capture.queue(1, FEN_AFTER_E4, "e4", clean = false)

        controller.onEvent(TrackerEvent.ReAnchored, status = null)

        assertEquals(0, capture.recorder?.count, "ohne Status ist nichts bewiesen, also darf nichts geschrieben werden")
    }
}
