package com.chesslab.tracker.capture

import com.chesslab.engine.board.fenOf
import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.camera.CaptureProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File

/** Published by `TrackerService`: a screen that owned the encoder would stop recording when destroyed. */
interface CaptureRecorder {
    /** Early, while the position is built: the camera rebinds at 4K and the encoder re-arms. Idempotent. */
    fun prepare()

    fun release()

    fun observed(): CaptureObserved?

    /** Null when recording is off or the camera has delivered nothing yet — the screen says so. */
    fun begin(shot: Shot): CaptureRun?
}

interface CaptureRun {
    val sessionId: String

    fun step(
        ply: Int,
        orientationDeg: Int,
        fen: String,
        startedNs: Long,
    ): Boolean

    fun finish(placed: List<Target> = emptyList()): File?
}

object CaptureRecorderHost {
    private val current = MutableStateFlow<CaptureRecorder?>(null)

    val recorder: StateFlow<CaptureRecorder?> = current

    fun publish(value: CaptureRecorder?) {
        current.value = value
    }
}

/** 4K at 15 fps; the bit rate follows `BITS_PER_PIXEL` (67.2 Mbit/s, 502 MB/min, a round is 4 min). */
val CAPTURE_VIDEO_PROFILE = CaptureProfile(width = 3840, height = 2160, fps = 15)

/** Ueber die GEMESSENEN Ziele, nicht `Shot.place`: die App haengt nach ihrer Helligkeitsmessung um, und
 *  eine FEN auf den Vorschlag labelte jede Figur aufs falsche Feld. */
fun fenOfTargets(targets: List<Target>): String = fenOf(targets.associate { it.square to it.piece })

val Shot.stepCount: Int get() = orientations.coerceAtLeast(1)
