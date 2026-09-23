package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.pipeline.SizeMismatch
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

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
    private var now = 10_000L
    private val throttle = NoteThrottle { now }

    private fun noted(text: String) = throttle.accept(TrackerEvent.Note(text))

    @Test
    fun alarmBeatsStuckBeatsCameraDownBeatsCnnFailedBeatsSizeMismatch() {
        val alarmed = statusOf(stuckReason = "occluded", alarm = ALARM, note = "pipeline")
        val note = resolveNote(alarmed, DOWN, FAILED, MISMATCH, "pipe")!!
        assertTrue(note.startsWith("Position lost"), note)
        // The note doubles as the background notification: guess and action.
        assertTrue(note.contains("e4"), note)
        assertTrue(note.contains("Open the app"), note)

        val stuck = statusOf(stuckReason = "occluded", note = "pipeline")
        assertEquals("stuck: occluded", resolveNote(stuck, DOWN, FAILED, MISMATCH, null))
        // With a pipeline note the stuck reason is the previous frame's.
        assertTrue(resolveNote(stuck, DOWN, FAILED, MISMATCH, "pipe")!!.startsWith("camera down"))
        assertEquals("pipe", resolveNote(stuck, CameraHealth.Up, CnnState.Off, null, "pipe"))

        val plain = statusOf(note = "engine note")
        assertTrue(resolveNote(plain, DOWN, FAILED, MISMATCH, "pipe")!!.startsWith("camera down"))
        assertTrue(resolveNote(plain, CameraHealth.Up, FAILED, MISMATCH, "pipe")!!.startsWith("CNN safeguard OFF"))
        assertEquals(MISMATCH.note, resolveNote(plain, CameraHealth.Up, CnnState.Off, MISMATCH, "pipe"))
        assertEquals("pipe", resolveNote(plain, CameraHealth.Up, CnnState.Off, null, "pipe"))
        assertEquals("engine note", resolveNote(plain, CameraHealth.Up, CnnState.Off, null, null))
    }

    @Test
    fun aStoppedCameraNeverPromisesARetry() {
        // `Off` is the user's own doing: "retrying in 3s" would be a lie.
        val note = resolveNote(statusOf(note = "engine note"), CameraHealth.Off, FAILED, MISMATCH, "pipe")
        assertEquals("tracking stopped — the camera is released", note)
    }

    @Test
    fun cnnFailedNoteIsVisibleWhenNothingElseIsWrong() {
        // A failed attach once left a perfectly normal-looking status line.
        val note = resolveNote(statusOf(), CameraHealth.Up, FAILED, null, null)
        assertEquals("CNN safeguard OFF: model missing — tracking diff-only", note)
    }

    @Test
    fun aReadyCnnAddsNoNote() {
        val note = resolveNote(statusOf(note = "detecting…"), CameraHealth.Up, CnnState.Ready("CPU", "model.onnx"), null, null)
        assertEquals("detecting…", note)
    }

    @Test
    fun theSameTextIsNeverRepeated() {
        assertTrue(noted("holding reference for 3s"))
        now += 10_000
        assertFalse(noted("holding reference for 3s"), "identical text says nothing new")
    }

    @Test
    fun aDifferentTextWithinTheGapIsDropped() {
        assertTrue(noted("Change on 7 squares"))
        now += MIN_NOTE_GAP_MS - 1
        assertFalse(noted("Change on 8 squares"), "the count changes on nearly every frame")
        now += 1
        assertTrue(noted("Change on 9 squares"), "after the gap the next text is logged")
    }

    @Test
    fun stuckLinesAreNeverDropped() {
        assertTrue(throttle.accept(TrackerEvent.Stuck("too_many_changed")))
        assertTrue(throttle.accept(TrackerEvent.Stuck("too_many_changed")))
        assertTrue(noted("Change on 7 squares"), "a stuck line does not consume the note budget")
    }
}
