package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Calibrated by default: `corners` is what tells "not calibrated" from a stalled detection. */
private val CALIBRATED = floatArrayOf(10f, 20f, 110f, 22f, 108f, 120f, 12f, 118f)

private fun status(
    state: String = STATE_WAITING,
    fps: Double = 0.0,
    cameraFps: Double = 30.0,
    note: String? = null,
    stuckReason: String? = null,
    alarm: TrackerEvent.Alarm? = null,
    corners: FloatArray? = CALIBRATED,
): TrackerStatus =
    idleTrackerStatus().copy(
        state = state,
        fps = fps,
        cameraFps = cameraFps,
        note = note,
        stuckReason = stuckReason,
        alarm = alarm,
        corners = corners,
    )

class StatusUiModelTest {
    /**
     * `waiting`, `moving` and `move` are ONE label and three tones. They are visible for a fraction
     * of a second each, so the word cannot tell them apart — but the colour still does, and that is
     * the only live feedback the header has.
     */
    @Test
    fun theThreeRunningStatesShareALabelAndKeepTheirTones() {
        val running = listOf(STATE_WAITING, STATE_MOVING, STATE_MOVE)
        running.forEach { assertEquals(TrackerLabel.LIVE, trackingUiState(status(it, fps = 12.0)).state, it) }
        val tones = running.map { trackingUiState(status(it, fps = 12.0)).tone }
        assertEquals(tones.size, tones.toSet().size)
        assertEquals(StateTone.Idle, trackingUiState(status(STATE_WAITING, fps = 12.0)).tone)
        assertEquals(StateTone.Busy, trackingUiState(status(STATE_MOVING, fps = 12.0)).tone)
        assertEquals(StateTone.Active, trackingUiState(status(STATE_MOVE, fps = 12.0)).tone)
        assertEquals(TrackerLabel.HAND_OVER_BOARD, trackingUiState(status(STATE_OCCLUDED, fps = 12.0)).state)
        assertEquals(StateTone.Busy, trackingUiState(status(STATE_OCCLUDED, fps = 12.0)).tone)
    }

    /** The fallback may not print an engine identifier at a user. */
    @Test
    fun anUnknownEngineStateIsStillJustLive() {
        assertEquals(TrackerLabel.LIVE, trackingUiState(status("some_new_engine_state", fps = 12.0)).state)
    }

    /**
     * Frames arrive, the board is fitted, and nothing ticks. This used to live only in `fpsDetail`;
     * as a label it survives the frame rate leaving the screen.
     */
    @Test
    fun aStalledEngineOnALiveCameraIsItsOwnLabel() {
        val stalled = trackingUiState(status(fps = 0.0, cameraFps = 30.0))
        assertEquals(TrackerLabel.NO_DETECTION, stalled.state)
        assertEquals(StateTone.Busy, stalled.tone)
        val alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), "g1f3", "Nf3")
        assertEquals(
            TrackerLabel.POSITION_LOST,
            trackingUiState(status(fps = 0.0, alarm = alarm)).state,
            "a latched alarm outranks a stalled engine",
        )
    }

    @Test
    fun aReleasedCameraAndNoTrackerAreDifferentLabels() {
        assertEquals(TrackerLabel.CAMERA_OFF, trackingUiState(status(fps = 12.0), cameraOn = false).state)
        assertEquals(TrackerLabel.NOT_TRACKING, trackingUiState(status(fps = 12.0), tracking = false).state)
    }

    @Test
    fun alarmPresentSetsBoardTintAndPinsTheStateLine() {
        val alarm = TrackerEvent.Alarm("illegal_move", listOf("e4", "d5"), "g1f3", "Nf3")
        val ui = trackingUiState(status(state = STATE_MOVING, alarm = alarm))
        assertTrue(ui.boardTinted)
        assertEquals(StateTone.Alarm, ui.tone)
        // The engine blocks every commit while alarmed: the line may not report progress.
        assertNotEquals(TrackerLabel.LIVE, ui.state)
        assertEquals("illegal_move", ui.alarm?.kind)
        assertEquals(listOf("e4", "d5"), ui.alarm?.conflicts)
        assertEquals("Nf3", ui.alarm?.guessSan)
        assertFalse(trackingUiState(status(state = STATE_MOVING)).boardTinted)
    }

    @Test
    fun theInfoLineShowsWhatTheResolverAlreadyDecided() {
        // Changed 2026-08-01. This used to re-rank `stuckReason` above `status.note` — a SECOND
        // resolver for one slot, and it discarded the first one's top rung: a latched alarm always
        // sets `stuck: no_legal_move`, so the board went red while the line beside it explained
        // something else. `StatusPublisher.resolveNote` owns the precedence; the UI renders it.
        assertEquals("note text", trackingUiState(status(note = "note text")).infoLine)
        assertEquals(
            "note text",
            trackingUiState(status(note = "note text", stuckReason = "too_many_changed")).infoLine,
            "the resolver already folded the stuck reason into the note; the UI must not re-rank",
        )
        assertNull(trackingUiState(status()).infoLine)
    }

    @Test
    fun fpsIsRoundedToOneDecimal() {
        assertEquals("12.4 fps", trackingUiState(status(fps = 12.44, cameraFps = 12.44)).fpsText)
        assertEquals("12.5 fps", trackingUiState(status(fps = 12.45123, cameraFps = 12.45)).fpsText)
    }

    /**
     * The bug this pair exists for: an uncalibrated board discards every frame, so the engine rate
     * is 0 while the camera runs at 30 — and a bare "0.0 fps" reads as a dead camera.
     */
    @Test
    fun aStalledDetectionOverALiveCameraSaysSoInsteadOfShowingZero() {
        val uncalibrated = trackingUiState(status(fps = 0.0, cameraFps = 29.6, corners = null))
        assertEquals("camera 30 fps", uncalibrated.fpsText)
        assertEquals("not calibrated", uncalibrated.fpsDetail)
        // Calibrated and still not ticking is a DIFFERENT problem (dark frame, degenerate warp).
        val stalled = trackingUiState(status(fps = 0.0, cameraFps = 29.6))
        assertEquals("camera 30 fps", stalled.fpsText)
        assertEquals("no detection", stalled.fpsDetail)
    }

    @Test
    fun aDeadFeedIsNeverReportedAsARate() {
        assertEquals("no frames", trackingUiState(status(fps = 0.0, cameraFps = 0.0)).fpsText)
        assertNull(trackingUiState(status(fps = 0.0, cameraFps = 0.0)).fpsDetail)
        // The camera being released outranks every engine number (see the class doc).
        assertEquals("camera off", trackingUiState(status(fps = 14.8), cameraOn = false).fpsText)
        assertNull(trackingUiState(status(fps = 14.8), cameraOn = false).fpsDetail)
    }

    @Test
    fun theCameraRateIsShownOnlyWhenDetectionIsBehindIt() {
        // Both rates equal: the second number would be the first one again.
        assertNull(trackingUiState(status(fps = 29.4, cameraFps = 30.0)).fpsDetail)
        val dropping = trackingUiState(status(fps = 15.0, cameraFps = 30.0))
        assertEquals("15.0 fps", dropping.fpsText)
        assertEquals("camera 30", dropping.fpsDetail)
    }

    /**
     * Not tracking is not the same as a paused camera, and neither may be reported as engine state.
     *
     * The app now opens with no service at all (specs/43), so the header's top rung is "there is no
     * tracker" — a stale "WAITING · 14.8 fps" over nothing at all is the lie this outranks.
     */
    @Test
    fun notTrackingOutranksThePausedCameraAndEveryEngineState() {
        val off = trackingUiState(status(state = STATE_MOVING, fps = 14.8), tracking = false)
        assertEquals(TrackerLabel.NOT_TRACKING, off.state)
        assertEquals(StateTone.Idle, off.tone)
        assertEquals("camera off", off.fpsText)
        assertNull(off.fpsDetail)
        // A paused camera keeps its game and says so; no tracker has none to keep.
        val paused = trackingUiState(status(fps = 14.8), cameraOn = false)
        assertEquals(TrackerLabel.CAMERA_OFF, paused.state)
        assertNotEquals(paused.infoLine, off.infoLine)
    }

    @Test
    fun changedShadowAndOcclusionSetsMapToThreeDistinctOverlayLayers() {
        val ui =
            trackingUiState(
                idleTrackerStatus().copy(
                    changed = setOf("e2", "e4"),
                    shadowVetoed = setOf("d4"),
                    occlusionVetoed = setOf("h8"),
                ),
            )
        assertEquals(setOf("e2", "e4"), ui.overlay.changed)
        assertEquals(setOf("d4"), ui.overlay.shadowVetoed)
        assertEquals(setOf("h8"), ui.overlay.occlusionVetoed)
        // Invariant 2: shadow PRESERVES z, occlusion ZEROES it — merging the sets hides that.
        assertTrue(
            ui.overlay.changed
                .intersect(ui.overlay.shadowVetoed)
                .isEmpty(),
        )
        assertTrue(
            ui.overlay.shadowVetoed
                .intersect(ui.overlay.occlusionVetoed)
                .isEmpty(),
        )
    }

    /** D06b-4: without this the overlay is parameterized for a quad it can never draw. */
    @Test
    fun theBoardCornersReachTheOverlay() {
        val corners = floatArrayOf(10f, 20f, 110f, 22f, 108f, 120f, 12f, 118f)
        assertArrayEquals(corners, trackingUiState(idleTrackerStatus().copy(corners = corners)).corners)
        assertNull(trackingUiState(idleTrackerStatus()).corners)
    }

    /**
     * **The filled button is whatever the screen needs NOW** (specs/49). Ranked exactly like the
     * header: no tracker outranks a released camera, which outranks a board that was never fitted.
     */
    @Test
    fun theTaskIsWhateverTheScreenNeedsNow() {
        assertEquals(TrackerTask.START, trackingUiState(status(), tracking = false).task)
        assertEquals(TrackerTask.RESUME_CAMERA, trackingUiState(status(), cameraOn = false).task)
        assertEquals(TrackerTask.CALIBRATE, trackingUiState(status(corners = null)).task)
        assertEquals(TrackerTask.WATCH, trackingUiState(status(fps = 14.8)).task)
        // A released camera on an uncalibrated board is still a released camera — taking it back is
        // the only act that can lead anywhere, and it must not be ranked under Calibrate.
        assertEquals(TrackerTask.RESUME_CAMERA, trackingUiState(status(corners = null), cameraOn = false).task)
    }

    /**
     * `ready` is what decides which of the two layouts renders, and it needs BOTH a geometry and
     * frames. Corners with a dead feed is the case that would otherwise draw a board, an eval bar
     * and a move list over a camera that is delivering nothing.
     */
    @Test
    fun readyNeedsGeometryAndFrames() {
        assertTrue(trackingUiState(status(fps = 14.8)).ready)
        assertFalse(trackingUiState(status(corners = null)).ready)
        assertFalse(trackingUiState(status(fps = 0.0, cameraFps = 0.0)).ready)
        assertFalse(trackingUiState(status(), cameraOn = false).ready)
        assertFalse(trackingUiState(status(), tracking = false).ready)
    }

    /** A latched alarm is a state of a game being WATCHED — the alarm card owns the filled button. */
    @Test
    fun anAlarmDoesNotLeaveTheWatchingLayout() {
        val alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), null, null)
        val ui = trackingUiState(status(fps = 14.8, alarm = alarm))
        assertTrue(ui.ready)
        assertEquals(TrackerTask.WATCH, ui.task)
    }
}
