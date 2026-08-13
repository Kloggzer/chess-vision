package com.chesslab.tracker.service

import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.opencv.core.Mat

/** ~5 fps. A preview and a calibration tap need freshness, not frame rate. */
private const val PUBLISH_INTERVAL_MS = 200L

/**
 * Drops instead of queueing.
 *
 * The single producer is the analyzer thread, so a plain flag is enough — and dropping is the
 * point: a queued preview conversion arrives late, holds a frame alive, and the backlog grows
 * exactly when the device is already too slow (commit 4a7609e).
 */
class InFlightGate {
    @Volatile
    private var busy = false

    fun tryEnter(): Boolean {
        if (busy) return false
        busy = true
        return true
    }

    fun leave() {
        busy = false
    }
}

/**
 * The ONLY way any screen gets pixels.
 *
 * 06a's calibration draws [rawPreview] and taps [latestCalibrationFrame]; it binds no camera of
 * its own. MEMORY (`android-single-camera-owner`): a second camera binding from the calibration
 * screen froze the analyzer feed on tab switch.
 *
 * Both outputs are throttled to [PUBLISH_INTERVAL_MS], so the conversion cost lands on one frame
 * in six rather than on every one.
 */
class CameraFrameBus<B>(
    override val cameraHealth: StateFlow<CameraHealth>,
    private val scope: CoroutineScope,
    private val toPreview: (Mat) -> B?,
    private val log: TrackerLog = NoopTrackerLog,
    private val nowMs: () -> Long = System::currentTimeMillis,
    private val publishPreviews: Boolean = true,
) : CalibrationFrames<B>,
    AutoCloseable {
    private val gate = InFlightGate()
    private val boardGate = InFlightGate()
    private val preview = MutableStateFlow<B?>(null)
    private val board = MutableStateFlow<B?>(null)
    private val rotation = MutableStateFlow(0)
    private val lock = Any()
    private var latest: Mat? = null
    private var latestVersion = 0L
    private var lastMs = 0L
    private var lastBoardMs = 0L

    override val rawPreview: StateFlow<B?> = preview.asStateFlow()

    override val previewRotation: StateFlow<Int> = rotation.asStateFlow()

    /**
     * The rotation the analyzer reported for the frames now in [rawPreview].
     *
     * Called per frame; a [MutableStateFlow] only notifies on a CHANGED value, so the steady state
     * costs a comparison. The value moves at most when the camera is re-bound.
     */
    fun noteRotation(degrees: Int) {
        rotation.value = degrees
    }

    /**
     * The RECTIFIED board — what the tracker actually looks at.
     *
     * Separate from [rawPreview] because they answer different questions. Calibration needs the
     * raw frame, since that is where you point at the corners. Tracking does not: the raw frame
     * forced the overlay to re-project every square through the board quad, which is both a
     * perspective approximation and a thing that can be off — and when it is off you cannot tell a
     * misdrawn overlay from a mis-detected square. Here the board FILLS the image with a8 at the
     * top-left, so the evidence grid is exactly the image divided by eight and there is nothing
     * left to get wrong.
     */
    override val boardPreview: StateFlow<B?> = board.asStateFlow()

    /**
     * Analyzer thread, with the frame the pipeline just converted.
     *
     * It used to take the raw `ImageProxy` and run its own full-frame YUV->BGR — a second
     * conversion of the same pixels `CameraStages.convert` had already produced, and one that
     * ran before `timings.begin()` so nothing measured it. The clone stays: `CameraStages` reuses
     * its destination `Mat`, so anything kept past this call has to be a copy.
     */
    fun offer(bgr: Mat) {
        val now = nowMs()
        if (now - lastMs < PUBLISH_INTERVAL_MS) return
        lastMs = now
        val frame = bgr.clone()
        synchronized(lock) {
            latest?.release()
            latest = frame
            latestVersion += 1
        }
        if (publishPreviews) publishPreview()
    }

    /**
     * The rectified detection warp, same throttle as [offer].
     *
     * Nothing is retained: the bitmap conversion is launched off-thread against a clone that the
     * conversion itself releases, so unlike [offer] there is no `latest` to hold — the calibration
     * tap only ever wants the raw frame.
     */
    fun offerBoard(warp: Mat) {
        if (!publishPreviews) return
        val now = nowMs()
        if (now - lastBoardMs < PUBLISH_INTERVAL_MS) return
        lastBoardMs = now
        if (!boardGate.tryEnter()) return
        val frame = warp.clone()
        scope.launch {
            runCatching { board.value = toPreview(frame) }
                .onFailure { log.warn("board preview conversion failed", it) }
            frame.release()
            boardGate.leave()
        }
    }

    /** A CLONE — the caller releases it. Null until the first frame arrives. */
    override fun latestCalibrationFrame(): Mat? = synchronized(lock) { latest?.clone() }

    /** Frame and version captured under one lock, so LiveAlign cannot pair mismatched values. */
    override fun latestCalibrationSample(): CalibrationFrame? =
        synchronized(lock) {
            latest?.let { CalibrationFrame(latestVersion, it.clone()) }
        }

    override fun close() {
        synchronized(lock) {
            latest?.release()
            latest = null
        }
    }

    private fun publishPreview() {
        if (!gate.tryEnter()) return
        val frame =
            latestCalibrationFrame() ?: run {
                gate.leave()
                return
            }
        scope.launch {
            runCatching { preview.value = toPreview(frame) }
                .onFailure { log.warn("preview conversion failed", it) }
            frame.release()
            gate.leave()
        }
    }
}

/** The seam 06a consumes. Pinned across both phases; 06a may not widen it. */
interface CalibrationFrames<B> {
    fun latestCalibrationFrame(): Mat?

    /**
     * A versioned clone for consumers that must not process the retained latest image twice.
     * Implementations without a version remain unversioned and are never de-duplicated.
     */
    fun latestCalibrationSample(): CalibrationFrame? = latestCalibrationFrame()?.let { CalibrationFrame(null, it) }

    val rawPreview: StateFlow<B?>

    /**
     * Degrees to rotate [rawPreview] CLOCKWISE for it to sit upright on the screen — 90 on a
     * typical back camera held in portrait, because the sensor's long axis is the device's short one.
     *
     * The frames are NOT rotated on the way through: `ImageAnalysis` sets no target rotation, so the
     * whole pipeline — the warp, the ArUco detection, every stored `CalibrationProfile` and every
     * quad in it — lives in sensor space, and turning the buffer would invalidate all of it at once
     * (`CalibrationProfile` records that `forResolution()` was deleted in a7dab73 for the same class
     * of reason). So this is a DISPLAY correction and nothing else, and the only honest place to
     * apply it is where the picture and its overlay are drawn together, as one turned unit.
     *
     * Read from the delivered frame rather than assumed, per the rule the resolution bug left
     * behind: never trust what was requested, read what arrived.
     */
    val previewRotation: StateFlow<Int>

    /** The rectified board; null until the first frame is warped. See [CameraFrameBus.boardPreview]. */
    val boardPreview: StateFlow<B?>

    val cameraHealth: StateFlow<CameraHealth>
}

/** The caller owns [frame] and releases it. */
class CalibrationFrame(
    val version: Long?,
    val frame: Mat,
)
