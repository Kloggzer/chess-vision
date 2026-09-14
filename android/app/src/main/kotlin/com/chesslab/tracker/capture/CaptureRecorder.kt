package com.chesslab.tracker.capture

import com.chesslab.engine.board.fenOf
import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.camera.CaptureProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File

/**
 * What a run can do, as the three screens see it. Published by `TrackerService` like the running
 * game is (`GameSessionHost`): arming the encoder and opening a bundle belong to the service, and a
 * screen that owned them would stop recording the moment it was destroyed.
 */
interface CaptureRecorder {
    /**
     * The capture profile goes on while the human is still building the position: the camera has to
     * rebind at 4K and the encoder has to re-arm at the new size, and that is time this screen has
     * anyway. Idempotent.
     */
    fun prepare()

    /** The user's own camera settings back. The game path may not inherit a capture profile. */
    fun release()

    /** What the device did with [prepare]'s profile — null until something was armed. */
    fun observed(): CaptureObserved?

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
    fun finish(placed: List<Target> = emptyList()): File?
}

object CaptureRecorderHost {
    private val current = MutableStateFlow<CaptureRecorder?>(null)

    val recorder: StateFlow<CaptureRecorder?> = current

    fun publish(value: CaptureRecorder?) {
        current.value = value
    }
}

/**
 * 4K at 15 fps (2026-09-13). The bit rate is not named here — it follows the picture through
 * `BITS_PER_PIXEL`, which lands on 67,2 Mbit/s and 502 MB/min. A turntable round is four minutes.
 */
val CAPTURE_VIDEO_PROFILE = CaptureProfile(width = 3840, height = 2160, fps = 15)

/**
 * Die FEN der Stellung, die WIRKLICH steht. Ueber die gemessenen Ziele und nicht ueber
 * `Shot.place`: der Plan schlaegt Felder nach dem Korpus-Median vor, die App haengt nach ihrer
 * Helligkeitsmessung um, und eine FEN auf den Vorschlag labelte jede Figur aufs falsche Feld.
 */
fun fenOfTargets(targets: List<Target>): String = fenOf(targets.associate { it.square to it.piece })

/** `orientations` is what the planner asked for; below 1 there is still one shot to take. */
val Shot.stepCount: Int get() = orientations.coerceAtLeast(1)
