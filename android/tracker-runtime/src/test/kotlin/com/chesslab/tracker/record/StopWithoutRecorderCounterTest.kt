package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** After 1. e4 — an ordinary position, so no gate refuses it. */
private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** After 1. e4 e5. */
private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

/** The camera has not delivered a frame yet: `start()` cannot open a recorder. */
private class NoFrameSource : CaptureSource {
    override fun grab(): CaptureFrame? = null

    override fun geometryNote(): String? = null
}

/**
 * `supersededFrames` counts in `queue()`, which runs with no recorder open, but `stop()` resets it
 * only after `recorder ?: return null`. The loss of a PREVIOUS game therefore stays on `reason`.
 */
class StopWithoutRecorderCounterTest {
    private fun controller() =
        SessionCaptureController(
            source = NoFrameSource(),
            open = { null },
            gates = RecordingGates(),
            prefs = { RecordingPrefs(enabled = true) },
            existingBytes = { 0L },
        )

    @Test
    fun stopClearsTheLossCountersEvenWithoutAnOpenRecorder() {
        val controller = controller()
        controller.queue(1, AFTER_E4, "e4", clean = false)
        controller.queue(2, AFTER_E5, "e5", clean = false)
        assertEquals(1, controller.supersededFrames, "ply 1's deferred photo was superseded")
        assertNull(controller.recorder, "no frame on the bus — nothing was ever opened")

        controller.stop()

        assertEquals(
            0,
            controller.supersededFrames,
            "stop() ends the game, so its loss counters belong to it and must not survive it. " +
                "reason=${controller.reason}",
        )
        assertNull(controller.reason, "a fresh game must not report the previous game's photo loss")
    }
}
