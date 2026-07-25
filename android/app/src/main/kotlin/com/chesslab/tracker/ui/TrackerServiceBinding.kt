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
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.service.EngineAction
import com.chesslab.tracker.service.TrackerBinder
import com.chesslab.tracker.service.TrackerService
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.ProvideCalibrationHost
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
 * Start the foreground service, bind to it for as long as this composition lives, and provide the
 * calibration screen's frame source.
 *
 * `startForegroundService` before `bindService`: a bind-only start would give a background service
 * that Android 14 kills the moment it touches the camera, and the service must be foreground
 * *before* it binds one.
 *
 * [content] is wrapped rather than called beside us because the calibration screen reads its frames
 * through a CompositionLocal, and it is the SERVICE's frames or nothing — binding a second camera
 * there froze the feed on every tab switch.
 */
@Composable
fun BindTrackerService(content: @Composable () -> Unit) {
    val context = LocalContext.current
    var binder by remember { mutableStateOf<TrackerBinder?>(null) }
    DisposableEffect(context) {
        val connection =
            object : ServiceConnection {
                override fun onServiceConnected(
                    name: ComponentName?,
                    service: IBinder?,
                ) {
                    val bound = service as? TrackerBinder
                    binder = bound
                    TrackerSessionHost.publish(bound?.let(::BinderSession))
                }

                override fun onServiceDisconnected(name: ComponentName?) {
                    binder = null
                    TrackerSessionHost.publish(null)
                }
            }
        val intent = Intent(context, TrackerService::class.java)
        context.startForegroundService(intent)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        onDispose {
            binder = null
            TrackerSessionHost.publish(null)
            context.unbindService(connection)
        }
    }
    val bound = binder
    if (bound == null) {
        content()
    } else {
        ProvideCalibrationHost(
            CalibrationHost(
                latestCalibrationFrame = bound::latestCalibrationFrame,
                rawPreview = bound.rawPreview,
                onCalibrated = bound::applyCalibration,
            ),
            content,
        )
    }
}
