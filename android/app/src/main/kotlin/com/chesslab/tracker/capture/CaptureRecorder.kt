package com.chesslab.tracker.capture

import com.chesslab.engine.board.fenOf
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File

/**
 * What a run can do, as the three screens see it. Published by `TrackerService` like the running
 * game is (`GameSessionHost`): arming the encoder and opening a bundle belong to the service, and a
 * screen that owned them would stop recording the moment it was destroyed.
 */
interface CaptureRecorder {
    /** Null when recording is off or the camera has delivered nothing yet — the screen says so. */
    fun begin(shot: Shot): CaptureRun?
}

interface CaptureRun {
    val sessionId: String

    /**
     * The still for [ply], and with it the step that began at [startedNs] — the schema's
     * `elapsed_ns`. Its end is stamped here, at the grab.
     */
    fun step(
        ply: Int,
        orientationDeg: Int,
        fen: String,
        startedNs: Long,
    ): Boolean

    /** Writes `capture.json` beside `log.jsonl` and closes the bundle. */
    fun finish(): File?
}

object CaptureRecorderHost {
    private val current = MutableStateFlow<CaptureRecorder?>(null)

    val recorder: StateFlow<CaptureRecorder?> = current

    fun publish(value: CaptureRecorder?) {
        current.value = value
    }
}

/** The declared position: a shot names the squares it fills, everything else is empty. */
fun Shot.boardFen(): String = fenOf(place.associate { it.square to it.piece })

/** `orientations` is what the planner asked for; below 1 there is still one shot to take. */
val Shot.stepCount: Int get() = orientations.coerceAtLeast(1)
