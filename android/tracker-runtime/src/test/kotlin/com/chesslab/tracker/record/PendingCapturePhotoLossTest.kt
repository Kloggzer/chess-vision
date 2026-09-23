package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** `physicalInventoryViolations` refuses it, which is what a promotion looks like. */
private const val THREE_BISHOPS = "rnbqkbnr/pppppppp/8/8/8/5B2/PPPPPPPP/RNBQKB1R w KQkq - 0 1"

private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

class PendingCapturePhotoLossTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun aGatedPlyDropsTheEarlierPlysDeferredPhotoWithoutCountingIt() {
        val controller = captureUnder(dir)
        controller.queue(1, FEN_AFTER_E4, "e4", clean = false)
        assertEquals(0, controller.recorder?.count, "an unclean commit must defer, not capture")

        // A verdict about ply 2 that throws away ply 1's deferred photo.
        controller.queue(2, THREE_BISHOPS, "e5", clean = true)

        assertNull(controller.flush(), "ply 1's deferred photo is gone — nothing is left to flush")
        assertEquals(0, controller.recorder?.count, "neither ply reached log.jsonl")
        assertEquals(
            1,
            controller.supersededFrames,
            "ply 1's photo was destroyed by a gate that judged ply 2's FEN, and nothing counted it: " +
                "reason=${controller.reason}",
        )
    }

    /** The reset came after `recorder ?: return null`, so a previous game's loss stayed. */
    @Test
    fun stopClearsTheLossCountersEvenWithoutAnOpenRecorder() {
        val controller =
            SessionCaptureController(
                source = NoFrameCaptureSource,
                open = { null },
                gates = RecordingGates(),
                prefs = { RecordingPrefs(enabled = true) },
                existingBytes = { 0L },
            )
        controller.queue(1, FEN_AFTER_E4, "e4", clean = false)
        controller.queue(2, AFTER_E5, "e5", clean = false)
        assertEquals(1, controller.supersededFrames, "ply 1's deferred photo was superseded")
        assertNull(controller.recorder, "no frame on the bus — nothing was ever opened")

        controller.stop()

        assertEquals(0, controller.supersededFrames, "reason=${controller.reason}")
        assertNull(controller.reason, "a fresh game must not report the previous game's photo loss")
    }
}
