package com.chesslab.tracker.capture

import android.os.SystemClock
import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.camera.CaptureProfilePort
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

/** The game path's own pieces, driven without a game. `moveSan` is null: a turn is not a move. */
@Suppress("LongParameterList")
class LiveCaptureRecorder(
    private val source: CaptureSource,
    private val sessions: SessionStore,
    private val profileName: () -> String,
    private val host: RecordingBundleHost,
    private val camera: CaptureProfilePort,
    private val prefs: () -> RecordingPrefs,
    private val newId: () -> String = { SimpleDateFormat(ID_FORMAT, Locale.US).format(Date()) },
    private val clock: () -> Long = SystemClock::elapsedRealtimeNanos,
) : CaptureRecorder {
    override fun prepare() = camera.applyCaptureProfile(CAPTURE_VIDEO_PROFILE)

    override fun release() = camera.restoreCaptureProfile()

    override fun observed(): CaptureObserved? = camera.captureObserved

    /** No video, no capture: the turning pan IS the material, and stills alone would not carry it. */
    override fun begin(shot: Shot): CaptureRun? {
        if (!prefs().enabled) return null
        // Idempotent: [prepare]'s rebind already re-armed through `videoAvailability`; this covers a run that
        // skipped the setup screen.
        host.armVideo()
        val frame = source.sessionFrame() ?: return null
        val id = newId()
        val recorder =
            SessionRecorder(
                sessions.create(id),
                SessionMeta(id, profileName(), frame.width, frame.height, notes = shot.id, mode = CAPTURE_MODE),
            )
        host.opened(recorder)
        return BundleCaptureRun(shot, recorder, source, clock, ::observed) { host.finished() }
    }
}

/** Everything Android — the encoder, the clock — arrives as a lambda, so it is testable against the real
 *  `SessionRecorder`. */
class BundleCaptureRun(
    private val shot: Shot,
    private val recorder: SessionRecorder,
    private val source: CaptureSource,
    private val clock: () -> Long,
    /** Read BEFORE the profile is put back, or the recording would state the game path's numbers. */
    private val observed: () -> CaptureObserved? = { null },
    private val onFinished: () -> Unit = {},
) : CaptureRun {
    private val steps = mutableListOf<CaptureStep>()

    override val sessionId: String get() = recorder.sessionId

    /** A step with no frame writes no row: `steps` and `log.jsonl` keep the same length, the turn stays open. */
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

    /** `finally`: a `capture.json` the full disk refuses must still close the bundle and release the encoder. */
    override fun finish(placed: List<Target>): File? =
        try {
            val session = captureSessionOf(shot, steps.toList(), placed, captureRecordingOf(observed()))
            if (steps.isEmpty()) null else writeCaptureSession(recorder.dir, session)
        } finally {
            recorder.finish()
            onFinished()
        }
}

private const val ID_FORMAT = "yyyyMMdd-HHmmss"
