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

/** Every UI action becomes an [EngineAction] value: the service marshals the queue onto the engine's thread. */
private class BinderSession(
    private val binder: TrackerBinder,
) : TrackerSession {
    override val status: StateFlow<TrackerStatus?> get() = binder.status
    override val events: Flow<TrackerEvent> get() = binder.events
    override val rawPreview: StateFlow<Bitmap?> get() = binder.rawPreview
    override val previewRotation: StateFlow<Int> get() = binder.previewRotation
    override val boardPreview: StateFlow<Bitmap?> get() = binder.boardPreview
    override val cameraOn: StateFlow<Boolean> get() = binder.cameraOn

    override fun setCameraOn(on: Boolean) = binder.setCameraOn(on)

    override val torchOn: StateFlow<Boolean> get() = binder.torchOn

    override val hasTorch: Boolean get() = binder.hasTorch

    override fun setTorchOn(on: Boolean) = binder.setTorchOn(on)

    override val focus: FocusTuner get() = binder.focusTuner

    override fun undo() {
        binder.submit(EngineAction.Undo)
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

/** Both hosts go together: a surviving optics port made a camera screen after a stop believe it had a device. */
private fun releaseHosts() {
    TrackerSessionHost.publish(null)
    CameraLookHost.publish(null)
}

/** Binds only while [TrackerRun] runs: an unconditional start cost a camera, a notification and a CNN attach
 *  just to read a game. `startForegroundService` before `bindService` — Android 14 kills a bind-only service
 *  that touches the camera. [content] is wrapped: the calibration screen reads the SERVICE's frames. */
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
    // ONE call site for `content`: two are two composition positions, and binding threw the subtree away,
    // `rememberNavController` with it.
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
