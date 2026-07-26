package com.chesslab.tracker.service

import android.util.Log
import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.FrameSink
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameResult
import com.chesslab.tracker.pipeline.Stage
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val TAG = "chesslabTracker"

/**
 * The analyzer-thread loop. Everything expensive is somewhere else.
 *
 * Per frame, in order: publish pixels, build the `FrameInput`, drain queued actions and CNN
 * observations, run the engine, publish the result, offer the CNN a frame, maybe re-align.
 * Nothing here blocks — no `runBlocking`, no `await`, no disk, no ArUco, no inference. The
 * legacy 970-LOC service did all of that inline and held the loop at 100-150 ms (commit 4a7609e).
 */
class TrackerCoordinator(
    private val pipeline: FramePipeline,
    private val host: EngineHost,
    private val publisher: StatusPublisher,
    private val bus: CameraFrameBus,
    private val observer: CnnObserver,
    private val align: LiveAlign,
    private val timings: StageTimings,
) : FrameSink {
    /**
     * The frame clock spans this WHOLE method.
     *
     * It used to start inside [FramePipeline.onFrame] and stop at the engine, which left three
     * stages measured by nothing: the preview bus before it, and the status publish, observer poke
     * and live-align clone after it. That is why `total + engine` read ~65 ms against an observed
     * ~90 ms frame period — the gap was real work, not measurement noise.
     */
    override fun onFrame(
        image: ImageProxy,
        delivered: DeliveredSize,
    ) {
        timings.begin()
        // The preview bus is fed from INSIDE the pipeline now (`FrameStages.publishFrame`), off the
        // frame the convert already produced — see `CameraFrameBus.offer`.
        val result = pipeline.onFrame(image, System.currentTimeMillis())
        val events = host.tick((result as? FrameResult.Ready)?.input)
        // The engine runs HERE, on the analyzer thread, and it is part of the frame budget.
        timings.mark(Stage.ENGINE)
        publisher.sizeMismatch = pipeline.sizeMismatch
        // The corners this frame was warped with — the overlay's board quad (D06b-4).
        publisher.corners = pipeline.corners
        // A PROVIDER: the publisher samples at 10 Hz and only builds the status when it will use it.
        publisher.publish(host::status, host.fen(), events, (result as? FrameResult.Skipped)?.note)
        observer.onFrameAvailable()
        align.maybeAlign(bus, delivered)
        timings.endFrame()
    }

    /** 06a's calibration result. The corner swap is what the pipeline reads on its next frame. */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
        delivered: DeliveredSize,
    ) {
        pipeline.onGeometryChanged(geometry)
        pipeline.corners = corners
        pipeline.setProfile(profileName, delivered.width, delivered.height)
        align.reset(delivered)
    }
}

/**
 * ArUco re-detection, off the frame thread.
 *
 * Commit 4a7609e measured it at 44-87 ms every 300 ms *on the analyzer thread* — the "recorder
 * spikes" that were blamed on recording for weeks. Here it runs on a background dispatcher with
 * at most one detection in flight, and the corners it produces are picked up by the NEXT frame.
 *
 * On a delivered-size change the marker tracker is REPLACED, never rescaled (commit a7dab73): its
 * smoothed points are pixel coordinates, and EMA-blending two coordinate spaces drifted the warp
 * by ~2.3 ranks. Re-seeding costs a few frames of alignment; rescaling costs a whole game.
 */
class LiveAlign(
    private val scope: CoroutineScope,
    private val geometry: () -> BoardGeometry,
    private val config: () -> TrackerConfig,
    private val onCorners: (FloatArray) -> Unit,
) {
    private var tracker = MarkerTracker()
    private var frames = 0L
    private var size: DeliveredSize? = null

    @Volatile
    private var inFlight = false

    fun maybeAlign(
        source: CalibrationFrames,
        delivered: DeliveredSize,
    ) {
        frames += 1
        val cfg = config()
        if (!cfg.liveAlign || cfg.alignEvery <= 0 || inFlight) return
        if (size != delivered) {
            size = delivered
            tracker = MarkerTracker()
            Log.i(TAG, "frame size is now ${delivered.width}x${delivered.height} — re-seeding the corner smoother")
        }
        if (frames % cfg.alignEvery != 0L) return
        val frame = source.latestCalibrationFrame() ?: return
        inFlight = true
        val current = tracker
        scope.launch {
            runCatching { boardCornersForFrame(frame, geometry(), current, detectScale = cfg.alignScale) }
                .onSuccess { corners -> corners?.let { onCorners(cornersToFlat(it)) } }
                .onFailure { Log.w(TAG, "live align failed", it) }
            frame.release()
            inFlight = false
        }
    }

    /** A new calibration invalidates the smoothed markers outright. */
    fun reset(delivered: DeliveredSize) {
        tracker = MarkerTracker()
        size = delivered
    }
}
