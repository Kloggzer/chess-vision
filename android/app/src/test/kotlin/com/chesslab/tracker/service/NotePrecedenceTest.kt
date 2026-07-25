package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.pipeline.SizeMismatch
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** A minimal `TrackerStatus`; only the fields the note precedence reads are ever set. */
internal fun statusOf(
    stuckReason: String? = null,
    alarm: TrackerEvent.Alarm? = null,
    note: String? = null,
    fen: String = "startpos",
): TrackerStatus =
    TrackerStatus(
        state = "waiting",
        fen = fen,
        z = emptyMap(),
        diffs = emptyMap(),
        census = emptyMap(),
        changed = emptySet(),
        shadowVetoed = emptySet(),
        occlusionVetoed = emptySet(),
        bestLl = 0.0,
        secondLl = 0.0,
        bestUci = null,
        stuckReason = stuckReason,
        alarm = alarm,
        confirmerKey = null,
        confirmerCount = 0,
        verifyState = null,
        pendingUci = null,
        pendingFrames = 0,
        stageTimingsMs = emptyMap(),
        fps = 0.0,
        note = note,
    )

private val ALARM = TrackerEvent.Alarm("illegal_move", listOf("e4"), "e2e4", "e4")
private val DOWN = CameraHealth.Down("in use", 3)
private val FAILED = CnnState.Failed("model missing")
private val MISMATCH = SizeMismatch("profile mismatch", 1280, 960)

class NotePrecedenceTest {
    @Test
    fun alarmBeatsStuckBeatsCameraDownBeatsCnnFailedBeatsSizeMismatch() {
        val alarmed = statusOf(stuckReason = "occluded", alarm = ALARM, note = "pipeline")
        assertTrue(resolveNote(alarmed, DOWN, FAILED, MISMATCH, "pipe")!!.startsWith("ILLEGAL MOVE?"))

        val stuck = statusOf(stuckReason = "occluded", note = "pipeline")
        assertEquals("stuck: occluded", resolveNote(stuck, DOWN, FAILED, MISMATCH, "pipe"))

        val plain = statusOf(note = "engine note")
        assertTrue(resolveNote(plain, DOWN, FAILED, MISMATCH, "pipe")!!.startsWith("camera down"))
        assertTrue(resolveNote(plain, CameraHealth.Up, FAILED, MISMATCH, "pipe")!!.startsWith("CNN safeguard OFF"))
        assertEquals(MISMATCH.note, resolveNote(plain, CameraHealth.Up, CnnState.Off, MISMATCH, "pipe"))
        assertEquals("pipe", resolveNote(plain, CameraHealth.Up, CnnState.Off, null, "pipe"))
        // Nothing wrong anywhere: the engine's own note is what the user sees.
        assertEquals("engine note", resolveNote(plain, CameraHealth.Up, CnnState.Off, null, null))
    }

    @Test
    fun cnnFailedNoteIsVisibleWhenNothingElseIsWrong() {
        // The silent-degrade regression: a failed attach used to leave the tracker running
        // diff-only with a perfectly normal-looking status line.
        val note = resolveNote(statusOf(), CameraHealth.Up, FAILED, null, null)
        assertEquals("CNN safeguard OFF: model missing — tracking diff-only", note)
    }

    @Test
    fun aReadyCnnAddsNoNote() {
        val note = resolveNote(statusOf(note = "detecting…"), CameraHealth.Up, CnnState.Ready("CPU", "model.onnx"), null, null)
        assertEquals("detecting…", note)
    }
}
