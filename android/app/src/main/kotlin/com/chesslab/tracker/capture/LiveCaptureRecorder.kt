package com.chesslab.tracker.capture

import android.os.SystemClock
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.RecordingBundleHost
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import com.chesslab.tracker.record.SessionStore
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The game path's own pieces, driven without a game: `SessionRecorder` writes the bundle,
 * `RecordingBundleHost` arms the encoder and names the video file. `moveSan` is null because a
 * turn is not a move — see `02-erfassungs-modus.md`.
 */
class LiveCaptureRecorder(
    private val source: CaptureSource,
    private val sessions: SessionStore,
    private val profileName: () -> String,
    private val host: RecordingBundleHost,
    private val prefs: () -> RecordingPrefs,
    private val newId: () -> String = { SimpleDateFormat(ID_FORMAT, Locale.US).format(Date()) },
    private val clock: () -> Long = SystemClock::elapsedRealtimeNanos,
) : CaptureRecorder {
    /** No video, no capture: the turning pan IS the material, and stills alone would not carry it. */
    override fun begin(shot: Shot): CaptureRun? {
        if (!prefs().enabled) return null
        host.armVideo()
        val frame = source.sessionFrame() ?: return null
        val id = newId()
        val recorder =
            SessionRecorder(
                sessions.create(id),
                SessionMeta(id, profileName(), frame.width, frame.height, notes = shot.id, mode = CAPTURE_MODE),
            )
        host.opened(recorder)
        return BundleCaptureRun(shot, recorder, source, clock) { host.finished() }
    }
}

/**
 * One run over one bundle. Testable against the REAL `SessionRecorder` because everything Android
 * about it — the encoder, the clock — arrives as a lambda.
 */
class BundleCaptureRun(
    private val shot: Shot,
    private val recorder: SessionRecorder,
    private val source: CaptureSource,
    private val clock: () -> Long,
    private val onFinished: () -> Unit = {},
) : CaptureRun {
    private val steps = mutableListOf<CaptureStep>()

    override val sessionId: String get() = recorder.sessionId

    /**
     * A step with no frame is not a step: it writes no row, so `steps` and `log.jsonl` keep the same
     * length and the caller stays on the same turn instead of skipping one silently.
     */
    override fun step(
        ply: Int,
        orientationDeg: Int,
        fen: String,
        startedNs: Long,
    ): Boolean {
        val frame = source.grab() ?: return false
        recorder.capture(frame.writer, ply, fen, null, frame.corners) ?: return false
        steps += CaptureStep(ply, orientationDeg, startedNs, clock())
        return true
    }

    override fun finish(): File? {
        val written = if (steps.isEmpty()) null else writeCaptureSession(recorder.dir, captureSessionOf(shot, steps.toList()))
        recorder.finish()
        onFinished()
        return written
    }
}

private const val ID_FORMAT = "yyyyMMdd-HHmmss"
