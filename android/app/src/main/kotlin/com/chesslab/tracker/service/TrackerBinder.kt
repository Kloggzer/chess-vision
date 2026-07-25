package com.chesslab.tracker.service

import android.graphics.Bitmap
import android.os.Binder
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.UpdateResult
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.Mat

/**
 * The whole API the UI has.
 *
 * Deliberately flows in, values out: there is no engine here, no camera, no frame pipeline. A
 * screen that could reach one of those could touch it from the main thread, and all three are
 * single-owner objects. Actions are queued values; state arrives pre-sampled at 10 Hz, so the UI
 * adds no throttle of its own.
 */
class TrackerBinder(
    private val host: EngineHost,
    private val publisher: StatusPublisher,
    private val frames: CalibrationFrames,
    private val settings: SettingsRepository,
    private val cnn: StateFlow<CnnState>,
    private val calibrate: (BoardGeometry, FloatArray, String) -> Unit,
) : Binder(),
    CalibrationFrames {
    val status: StateFlow<TrackerStatus?> get() = publisher.status
    val events: SharedFlow<TrackerEvent> get() = publisher.events
    val config: StateFlow<TrackerConfig> get() = settings.config
    val cnnState: StateFlow<CnnState> get() = cnn

    override val rawPreview: StateFlow<Bitmap?> get() = frames.rawPreview
    override val cameraHealth: StateFlow<CameraHealth> get() = frames.cameraHealth

    /** A CLONE; the caller releases it. 06a's only source of pixels — it binds no camera. */
    override fun latestCalibrationFrame(): Mat? = frames.latestCalibrationFrame()

    /** Queued, applied on the engine thread before the next detection. */
    fun submit(action: EngineAction) = host.submit(action)

    /** Persists, and tells the caller which knobs need a tracker restart to take effect. */
    fun updateConfig(config: TrackerConfig): UpdateResult = settings.update(config)

    /** 06a hands the accepted corners over; the pipeline picks them up on its next frame. */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
    ) = calibrate(geometry, corners, profileName)

    /** What the camera really delivers — 06a needs it to map a tap back to source pixels. */
    var deliveredSize: DeliveredSize? = null
        internal set
}
