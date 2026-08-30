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

/**
 * The whole API the UI has.
 *
 * Deliberately flows in, values out: there is no engine here, no camera, no frame pipeline. A
 * screen that could reach one of those could touch it from the main thread, and all three are
 * single-owner objects. Actions are queued values; state arrives pre-sampled at 10 Hz, so the UI
 * adds no throttle of its own.
 */
class TrackerBinder(
    private val publisher: StatusPublisher,
    private val frames: CalibrationFrames<Bitmap>,
    private val settings: SettingsRepository,
    private val cnn: StateFlow<CnnState>,
    private val queue: (EngineAction) -> Unit,
    // Delegated, not reimplemented: restart and the camera switch are the service's, and a second
    // copy of "is the camera on" is a second answer to a question about the user's privacy.
    private val controls: TrackerControls,
    // Its own parameter and not part of `TrackerControls`: the lamp is a SEQUENCE the service owns
    // (torch, re-measure, baseline), and folding it into that bundle would have put three more
    // members on the service for no gain.
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

    /** A CLONE; the caller releases it. 06a's only source of pixels — it binds no camera. */
    override fun latestCalibrationFrame(): Mat? = frames.latestCalibrationFrame()

    override fun latestCalibrationSample(): CalibrationFrame? = frames.latestCalibrationSample()

    /**
     * Queued, applied on the engine thread before the next detection.
     *
     * A lambda and not the host itself, because the host is rebuilt by a restart — handing the UI
     * a direct reference would leave it submitting into a torn-down engine (D07x-1).
     */
    fun submit(action: EngineAction) = queue(action)

    /** Persists, and tells the caller which knobs need a tracker restart to take effect. */
    fun updateConfig(config: TrackerConfig): UpdateResult = settings.update(config)

    /**
     * Rebuilds the tracker with the persisted config and app settings — the 34 knobs that are read
     * at construction. The process, the camera binding, the calibration and the current position
     * all survive; the move history does not (see [TrackerSeed]).
     */
    override fun restartTracker() = controls.restartTracker()

    // `applyCalibration` arrives through `TrackerControls by controls` — 06a hands the accepted
    // corners over and the pipeline picks them up on its next frame. It moved into the controls
    // bundle because it is a service capability exactly like restart, the camera switch and the
    // optics, and it was the only one still travelling as a raw lambda beside them.

    /** What the camera really delivers — 06a needs it to map a tap back to source pixels. */
    var deliveredSize: DeliveredSize? = null
        internal set
}
