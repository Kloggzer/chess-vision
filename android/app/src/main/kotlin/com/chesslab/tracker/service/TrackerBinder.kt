package com.chesslab.tracker.service

import android.graphics.Bitmap
import android.os.Binder
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.settings.SettingsRepository
import com.chesslab.tracker.settings.UpdateResult
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.Mat

/** Flows in, values out: no engine, camera or pipeline here — all three are single-owner objects a screen
 *  could otherwise touch from the main thread. State arrives pre-sampled at 10 Hz. */
class TrackerBinder(
    private val publisher: StatusPublisher,
    private val frames: CalibrationFrames<Bitmap>,
    private val settings: SettingsRepository,
    private val cnn: StateFlow<CnnState>,
    private val queue: (EngineAction) -> Unit,
    // Delegated: a second copy of "is the camera on" is a second answer to a privacy question.
    private val controls: TrackerControls,
    torch: TorchControl,
) : Binder(),
    CalibrationFrames<Bitmap>,
    TrackerControls by controls,
    TorchControl by torch {
    val status: StateFlow<TrackerStatus?> get() = publisher.status
    val events: SharedFlow<TrackerEvent> get() = publisher.events
    val config: StateFlow<TrackerConfig> get() = settings.config
    val cnnState: StateFlow<CnnState> get() = cnn

    override val rawPreview: StateFlow<Bitmap?> get() = frames.rawPreview

    override val previewRotation: StateFlow<Int> get() = frames.previewRotation

    override val boardPreview: StateFlow<Bitmap?> get() = frames.boardPreview
    override val cameraHealth: StateFlow<CameraHealth> get() = frames.cameraHealth

    /** A CLONE; the caller releases it. */
    override fun latestCalibrationFrame(): Mat? = frames.latestCalibrationFrame()

    override fun latestCalibrationSample(): CalibrationFrame? = frames.latestCalibrationSample()

    /** A lambda, not the host: a restart rebuilds the host, and a direct reference would feed a dead engine. */
    fun submit(action: EngineAction) = queue(action)

    fun updateConfig(config: TrackerConfig): UpdateResult = settings.update(config)

    /** The 34 construction-time knobs. Process, camera binding, calibration and position survive; the move
     *  history does not ([TrackerSeed]). */
    override fun restartTracker() = controls.restartTracker()

    var deliveredSize: DeliveredSize? = null
        internal set
}
