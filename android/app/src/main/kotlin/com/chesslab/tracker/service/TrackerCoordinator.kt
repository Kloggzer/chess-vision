package com.chesslab.tracker.service

import android.util.Log
import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.applyGridCorrection
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.gridCorrection
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.quadDriftCells
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.FrameSink
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameResult
import com.chesslab.tracker.pipeline.Stage
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.opencv.core.Mat
import java.util.concurrent.atomic.AtomicReference

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
        drainCalibration()
        // Display-only, and it has to come from the delivered frame — see `previewRotation`.
        bus.noteRotation(delivered.rotationDegrees)
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
        timings.endFrame((result as? FrameResult.Skipped)?.note, pipeline.lastLuma())
    }

    /**
     * 06a's calibration result. Queued, not applied — [TrackerService.calibrate] runs on the main
     * thread while this loop is mid-frame on the analyzer thread.
     *
     * Only `pipeline.corners` is `@Volatile`; the geometry, the profile baseline and the marker
     * smoother behind it are plain fields. Writing them inline let a frame warp with the NEW
     * corners under the OLD board size — the two halves of a calibration reaching the loop one
     * frame apart, which is precisely the state `FrameLoop` refuses a plane for. Handing over one
     * reference and reading it at a frame boundary makes the swap atomic from the loop's side.
     */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
        delivered: DeliveredSize,
    ) {
        pending.set(PendingCalibration(geometry, corners, profileName, delivered))
    }

    /** Newest wins: a second calibration before the next frame supersedes the first outright. */
    private fun drainCalibration() {
        val next = pending.getAndSet(null) ?: return
        pipeline.onGeometryChanged(next.geometry)
        pipeline.corners = next.corners
        pipeline.setProfile(next.profileName, next.delivered.width, next.delivered.height)
        align.reset(next.delivered)
    }

    private val pending = AtomicReference<PendingCalibration?>(null)

    /** Not a data class: it carries a [FloatArray], whose generated `equals` compares identity. */
    private class PendingCalibration(
        val geometry: BoardGeometry,
        val corners: FloatArray,
        val profileName: String,
        val delivered: DeliveredSize,
    )
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

    /** Rectified-space grid correction; null until measured, and null forever if unmeasurable. */
    @Volatile
    private var correction: DoubleArray? = null

    /** Measured at most once per POSE — a failed measurement must not retry every align. */
    @Volatile
    private var correctionTried = false

    /**
     * The quad [correction] was fitted against, so it can be noticed when that pose is gone.
     *
     * Without this the correction outlived its own premise. Its KDoc calls the groove residual "a
     * per-calibration constant", quoting `specs/30` — which is true, and carries an unstated
     * condition: it is a constant OF THAT SETUP. `maybeAlign` re-derives the quad from the markers
     * every `alignEvery` frames, so a nudged phone is followed correctly by the quad and then has a
     * correction measured at the old pose added on top of it, silently, for the rest of the session.
     * That is the shape of the failure that cost this project 5.5x its empty-crop margin: a few
     * pixels of consistent offset with nothing failing loudly.
     */
    @Volatile
    private var fittedAt: FloatArray? = null

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
                .onSuccess { corners -> corners?.let { onCorners(cornersToFlat(onGrid(frame, it))) } }
                .onFailure { Log.w(TAG, "live align failed", it) }
            frame.release()
            inFlight = false
        }
    }

    /**
     * The ArUco quad pulled back onto the board's own grooves.
     *
     * Without this the calibration-time refinement is decoration: [maybeAlign] re-derives the quad
     * from the markers every `alignEvery` frames — ~0.2 s at 15 fps — and knows nothing about
     * grooves, so it overwrote the refined corners almost immediately and every crop was cut with
     * the geometry the refinement exists to remove.
     *
     * MEASURED once per pose, then RE-APPLIED for free: four points through a 3x3. It runs on the
     * align dispatcher with one detection in flight, so it costs at most one skipped align.
     * Measuring here rather than carrying the value from the calibration screen also means it is
     * re-established after an app restart, where the screen never runs.
     *
     * The cost is NOT the ~80 ms this KDoc used to quote: that was the 4-band, 14-line, affine
     * version. specs/41 took it to 8 bands over 18 lines with 4 iterations and a projective fit,
     * which measures 70-85 ms at boardSize 800 on a desktop and has NOT been measured on device.
     * Whatever it is, it is a once-per-pose cost on a background dispatcher; do not quote a number
     * here that nobody took.
     *
     * The correction lives in rectified space, which is what lets it transfer to a quad it was not
     * measured on — the whole live case, since the markers move a little between detections.
     * `specs/30` measured that residual as systematic per setup and differing in sign between
     * setups, i.e. exactly a per-calibration constant.
     */
    private fun onGrid(
        frame: Mat,
        corners: List<DoubleArray>,
    ): List<DoubleArray> {
        val geom = geometry()
        expireCorrection(cornersToFlat(corners), geom)
        if (correction == null && !correctionTried) {
            correctionTried = true
            val fixed = improveQuad(frame, corners, geom).quad
            correction = fixed?.let { gridCorrection(corners, it, geom) }
            fittedAt = cornersToFlat(corners)
            Log.i(
                TAG,
                if (correction == null) {
                    "grid correction: none — the board's grid is already on the squares, or unreadable"
                } else {
                    "grid correction measured and carried onto every alignment"
                },
            )
        }
        val fix = correction ?: return corners
        return applyGridCorrection(fix, corners, geom) ?: corners
    }

    /**
     * Drop the correction when the board is no longer where it was fitted.
     *
     * Logged both ways round: a correction that silently vanishes is as hard to debug as one that
     * silently persists, and this one only ever fires on a real change of setup.
     */
    private fun expireCorrection(
        current: FloatArray,
        geom: BoardGeometry,
    ) {
        val fitted = fittedAt ?: return
        val drift = quadDriftCells(current, fitted, geom)
        if (drift <= DRIFT_REFIT_CELLS) return
        Log.i(TAG, "board moved ${"%.2f".format(drift)} cells since the grid fit — re-measuring the correction")
        correction = null
        correctionTried = false
        fittedAt = null
    }

    /**
     * A new calibration invalidates the smoothed markers outright, and the grid correction with
     * them — it is a property of THIS board under THIS lens, and a recalibration is the user
     * saying that changed.
     */
    fun reset(delivered: DeliveredSize) {
        tracker = MarkerTracker()
        size = delivered
        correction = null
        correctionTried = false
        fittedAt = null
    }
}

/**
 * How far the board may move before the grid correction is thrown away, in cells.
 *
 * **A starting value, not a measurement.** No on-device distribution of `quadDriftCells` exists;
 * a quarter of a square is chosen to sit far above the marker smoother's jitter and far below a
 * shift anyone would call the board moving. Measure it before quoting it as if it were derived —
 * inventing a threshold and presenting it as measured is exactly what sank the first draft of
 * `specs/36`.
 */
private const val DRIFT_REFIT_CELLS = 0.25
