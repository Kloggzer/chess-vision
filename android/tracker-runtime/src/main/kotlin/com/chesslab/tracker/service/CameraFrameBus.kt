package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.opencv.core.Mat

/** A preview and a calibration tap need freshness, not frame rate. */
private const val PUBLISH_INTERVAL_MS = 200L

/** Dropping is the point: a queued conversion arrives late, holds a frame alive, and the backlog grows exactly
 *  when the device is already too slow. */
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

/** The ONLY way any screen gets pixels: a second camera binding froze the analyzer feed on tab switch. */
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

    /** A [MutableStateFlow] notifies only on change, so the per-frame call costs a comparison. */
    fun noteRotation(degrees: Int) {
        rotation.value = degrees
    }

    /** The board FILLS the image with a8 top-left: the evidence grid is the image divided by eight, where the raw
     *  frame forced a perspective re-projection that could be off without anyone telling. */
    override val boardPreview: StateFlow<B?> = board.asStateFlow()

    /** The pipeline's converted frame, not the `ImageProxy`: that ran a second, unmeasured YUV->BGR. One clone
     *  stays, because `CameraStages` reuses its `Mat`; consumers get reference-counted views of it. */
    fun offer(bgr: Mat) {
        val now = nowMs()
        if (now - lastMs < PUBLISH_INTERVAL_MS) return
        lastMs = now
        val frame = bgr.profiledClone(WorkOperation.RAW_FRAME_COPY)
        synchronized(lock) {
            latest?.release()
            latest = frame
            latestVersion += 1
        }
        if (publishPreviews) publishPreview()
    }

    /** Nothing retained: the off-thread conversion releases its own clone. */
    fun offerBoard(warp: Mat) {
        if (!publishPreviews) return
        val now = nowMs()
        if (now - lastBoardMs < PUBLISH_INTERVAL_MS) return
        lastBoardMs = now
        if (!boardGate.tryEnter()) return
        val frame = warp.profiledClone(WorkOperation.BOARD_PREVIEW_COPY)
        scope.launch {
            runCatching { board.value = toPreview(frame) }
                .onFailure { log.warn("board preview conversion failed", it) }
            frame.release()
            boardGate.leave()
        }
    }

    /** The caller releases it. */
    override fun latestCalibrationFrame(): Mat? =
        synchronized(lock) {
            latest?.profiledView(WorkOperation.CALIBRATION_FRAME_COPY)
        }

    /** Under one lock, so LiveAlign cannot pair mismatched frame and version. */
    override fun latestCalibrationSample(): CalibrationFrame? = latestCalibrationSample(afterVersion = null)

    /** Refuses a consumed version before sharing the QHD buffer. */
    override fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame? =
        synchronized(lock) {
            val frame = latest ?: return@synchronized null
            if (afterVersion == latestVersion) return@synchronized null
            CalibrationFrame(latestVersion, frame.profiledView(WorkOperation.CALIBRATION_FRAME_COPY))
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
            synchronized(lock) { latest?.profiledView(WorkOperation.RAW_PREVIEW_COPY) } ?: run {
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

private fun Mat.profiledClone(operation: WorkOperation): Mat =
    WorkProfiler.span(operation) {
        clone().also { copy -> WorkProfiler.bytes(operation, copy.total() * copy.elemSize().toLong()) }
    }

private fun Mat.profiledView(operation: WorkOperation): Mat =
    WorkProfiler.span(operation) {
        submat(0, rows(), 0, cols())
    }

/** Pinned across both phases; the calibration screen may not widen it. */
interface CalibrationFrames<B> {
    fun latestCalibrationFrame(): Mat?

    /** Implementations without a version are never de-duplicated. */
    fun latestCalibrationSample(): CalibrationFrame? = latestCalibrationFrame()?.let { CalibrationFrame(null, it) }

    /** Lets a versioned source reject stale data before it pays for the clone. */
    fun latestCalibrationSample(afterVersion: Long?): CalibrationFrame? = latestCalibrationSample()

    val rawPreview: StateFlow<B?>

    /** A DISPLAY correction only: the pipeline, the ArUco detection and every stored quad live in sensor space,
     *  and rotating the buffer would invalidate all of it. Read from the delivered frame, never assumed. */
    val previewRotation: StateFlow<Int>

    val boardPreview: StateFlow<B?>

    val cameraHealth: StateFlow<CameraHealth>
}

/** The caller owns [frame] and releases it. */
class CalibrationFrame(
    val version: Long?,
    val frame: Mat,
)
