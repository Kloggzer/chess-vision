package com.chesslab.tracker.ui

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.os.IBinder
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.FocusTuner
import com.chesslab.tracker.service.TrackerBinder
import com.chesslab.tracker.service.TrackerRun
import com.chesslab.tracker.service.TrackerService
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.ProvideCalibrationHost
import com.chesslab.tracker.ui.camera.CameraLookHost
import com.chesslab.tracker.ui.tracking.TrackerSession
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/**
 * The composition root's link to the tracker service.
 *
 * Every UI action becomes an [EngineAction] value here and nothing else: the engine is single
 * threaded by design and the service is what marshals the queue onto its owning thread.
 */
private class BinderSession(
    private val binder: TrackerBinder,
) : TrackerSession {
    override val status: StateFlow<TrackerStatus?> get() = binder.status
    override val events: Flow<TrackerEvent> get() = binder.events
    override val rawPreview: StateFlow<Bitmap?> get() = binder.rawPreview
    override val previewRotation: StateFlow<Int> get() = binder.previewRotation
    override val boardPreview: StateFlow<Bitmap?> get() = binder.boardPreview
    override val cameraOn: StateFlow<Boolean> get() = binder.cameraOn

    /** The one action that is NOT an `EngineAction`: it is the service's camera, not the engine's. */
    override fun setCameraOn(on: Boolean) = binder.setCameraOn(on)

    override val torchOn: StateFlow<Boolean> get() = binder.torchOn

    override val hasTorch: Boolean get() = binder.hasTorch

    /** Also not an `EngineAction`: the lamp, the optics and the baseline are one act in the service. */
    override fun setTorchOn(on: Boolean) = binder.setTorchOn(on)

    override val focus: FocusTuner get() = binder.focusTuner

    override fun undo() {
        binder.submit(EngineAction.Undo)
    }

    override fun resetGame() {
        binder.submit(EngineAction.ResetToStart)
    }

    override fun captureBaseline() {
        binder.submit(EngineAction.CaptureBaseline)
    }

    override fun choosePromotion(piece: Char) {
        binder.submit(EngineAction.ChoosePromotion(piece))
    }

    override fun acceptCnnPosition() {
        binder.submit(EngineAction.AcceptCnnPosition)
    }
}

/**
 * Both hosts go together. The optics port used to survive the session that owned it, so a camera
 * screen opened after a stop believed it still had a device.
 */
private fun releaseHosts() {
    TrackerSessionHost.publish(null)
    CameraLookHost.publish(null)
}

/**
 * Bind to the tracker service for as long as it is RUNNING, and provide the calibration screen's
 * frame source while it is.
 *
 * Nothing happens until [TrackerRun] says tracking was asked for. Wrapping the nav host in an
 * unconditional start is what made opening the app to read a finished game cost a camera, a
 * foreground notification and a CNN attach.
 *
 * `startForegroundService` before `bindService`, and both only inside the running branch: a
 * bind-only start would give a background service that Android 14 kills the moment it touches the
 * camera, and the service must be foreground *before* it binds one.
 *
 * [content] is wrapped rather than called beside us because the calibration screen reads its frames
 * through a CompositionLocal, and it is the SERVICE's frames or nothing — binding a second camera
 * there froze the feed on every tab switch.
 */
@Composable
fun BindTrackerService(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val running by TrackerRun.running.collectAsStateWithLifecycle()
    var binder by remember { mutableStateOf<TrackerBinder?>(null) }
    DisposableEffect(context, running) {
        if (!running) return@DisposableEffect onDispose { }
        val connection =
            object : ServiceConnection {
                override fun onServiceConnected(
                    name: ComponentName?,
                    service: IBinder?,
                ) {
                    val bound = service as? TrackerBinder
                    binder = bound
                    TrackerSessionHost.publish(bound?.let(::BinderSession))
                    CameraLookHost.publish(bound?.cameraLook)
                }

                override fun onServiceDisconnected(name: ComponentName?) {
                    binder = null
                    releaseHosts()
                }
            }
        val intent = Intent(context, TrackerService::class.java)
        context.startForegroundService(intent)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        onDispose {
            binder = null
            releaseHosts()
            context.unbindService(connection)
        }
    }
    val bound = binder
    // ONE call site for `content`, always. Two — a bare call while unbound and a wrapped one once
    // bound — are two positions in the composition, so the whole subtree was thrown away and
    // rebuilt the moment the binder arrived, taking `rememberNavController` with it. See
    // `ProvideCalibrationHost`.
    ProvideCalibrationHost(
        bound?.let {
            CalibrationHost(
                latestCalibrationFrame = it::latestCalibrationFrame,
                rawPreview = it.rawPreview,
                previewRotation = it.previewRotation,
                onCalibrated = it::applyCalibration,
            )
        },
        content,
    )
}
