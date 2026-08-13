package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.BoardMarkerDetector
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.applyGridCorrection
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.boardCornersFromMarkers
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.gridCorrection
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.quadDriftCells
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameResult
import com.chesslab.tracker.pipeline.Stage
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.opencv.core.Mat
import java.util.concurrent.atomic.AtomicReference

/**
 * The analyzer-thread loop. Everything expensive is somewhere else.
 *
 * Per frame, in order: publish pixels, build the `FrameInput`, drain queued actions and CNN
 * observations, run the engine, publish the result, offer the CNN a frame, maybe re-align.
 * Nothing here blocks — no `runBlocking`, no `await`, no disk, no ArUco, no inference. The
 * legacy 970-LOC service did all of that inline and held the loop at 100-150 ms (commit 4a7609e).
 *
 * `LongParameterList` is suppressed because the list IS the seam: every parameter is one
 * collaborator a host must supply, and no two of them belong together. The holder object detekt
 * asks for would exist only to satisfy detekt — the same reasoning `preprocessInto` records in
 * `:core-cnn` and `OpenCvStages` in this module. The next parameter deserves an argument.
 */
@Suppress("LongParameterList")
class TrackerCoordinator<T>(
    private val pipeline: FramePipeline<T>,
    private val host: EngineHost,
    private val publisher: StatusPublisher,
    private val bus: CameraFrameBus<*>,
    private val observer: CnnObserver,
    private val align: LiveAlign,
    private val timings: StageTimings,
    /**
     * The engine's clock, and the reason it is a parameter.
     *
     * `EngineState` calls determinism BINDING: `nowS` is set once per frame from
     * `FrameInput.timestampMs`, and several gates are ages against it — the motion recency check
     * under `requireMotionForMove`, the anomaly latch, the CNN cooldowns. Feeding the WALL clock
     * is correct for a camera, where a frame really does arrive when it arrives, and wrong for a
     * replay, which decodes as fast as it can: a 319-second video pushed through in 200 seconds
     * makes every one of those windows 1.6x too short, and two runs of the same file disagree.
     *
     * The clip simulation never had this problem because it bypasses this class and passes its
     * own timestamp straight to `FramePipeline.onFrame`. That is why 18 clips are green while a
     * real video committed nothing.
     */
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    /**
     * The frame clock spans this WHOLE method.
     *
     * It used to start inside [FramePipeline.onFrame] and stop at the engine, which left three
     * stages measured by nothing: the preview bus before it, and the status publish, observer poke
     * and live-align clone after it. That is why `total + engine` read ~65 ms against an observed
     * ~90 ms frame period — the gap was real work, not measurement noise.
     */
    fun onFrame(
        image: T,
        delivered: DeliveredSize,
    ) {
        timings.begin()
        drainCalibration()
        // Display-only, and it has to come from the delivered frame — see `previewRotation`.
        bus.noteRotation(delivered.rotationDegrees)
        // The preview bus is fed from INSIDE the pipeline now (`FrameStages.publishFrame`), off the
        // frame the convert already produced — see `CameraFrameBus.offer`.
        val result = pipeline.onFrame(image, delivered.width, delivered.height, nowMs())
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
 * spikes" that were blamed on recording for weeks. Here it runs on [dispatcher] with at most one
 * detection in flight, and the corners it produces are picked up by the NEXT frame.
 *
 * [dispatcher] is a parameter and not [scope]'s context because for a long time this KDoc said
 * "a background dispatcher" and the phone did not have one. `TrackerService` is a `LifecycleService`
 * and passes `lifecycleScope`; `TrackerStack` builds its scope as `parent.coroutineContext +
 * SupervisorJob()`, which inherits `Dispatchers.Main.immediate`. So ArUco AND the once-per-pose
 * [onGrid] fit ran on the UI THREAD on the one host where that matters, while the desktop passed
 * `Dispatchers.Default` and looked fine. Naming the dispatcher here makes the sentence above true
 * on every host instead of true wherever the caller happened to get it right — [scope] keeps the
 * parent's context, which the settings and observer collectors on it legitimately want.
 *
 * On a delivered-size change the marker tracker is REPLACED, never rescaled (commit a7dab73): its
 * smoothed points are pixel coordinates, and EMA-blending two coordinate spaces drifted the warp
 * by ~2.3 ranks. Re-seeding costs a few frames of alignment; rescaling costs a whole game.
 */
@Suppress("LongParameterList")
class LiveAlign(
    private val scope: CoroutineScope,
    private val geometry: () -> BoardGeometry,
    private val config: () -> TrackerConfig,
    private val onCorners: (FloatArray) -> Unit,
    private val log: TrackerLog = NoopTrackerLog,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Default,
    /** Complete offline stream: when present, absence at a frame means no alignment update. */
    private val cachedCorners: ((Long) -> FloatArray?)? = null,
    /** Offline build hook; successful corrected corners only, keyed by processed frame count. */
    private val cornerSink: ((Long, FloatArray) -> Unit)? = null,
    /** Offline cold path: independent raw detections calculated in parallel before replay. */
    private val cachedMarkers: ((Long) -> Map<Int, DoubleArray>)? = null,
) {
    private var tracker = MarkerTracker()
    private val markerDetector = BoardMarkerDetector()
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

    /** Last bus image actually submitted to the alignment worker. */
    private var lastFrameVersion: Long? = null

    @Suppress("ReturnCount")
    fun maybeAlign(
        source: CalibrationFrames<*>,
        delivered: DeliveredSize,
    ) {
        frames += 1
        val cfg = config()
        if (!cfg.liveAlign || cfg.alignEvery <= 0 || inFlight) return
        cachedCorners?.let { cache ->
            cache(frames)?.let(onCorners)
            return
        }
        if (size != delivered) {
            size = delivered
            tracker = MarkerTracker()
            log.info("frame size is now ${delivered.width}x${delivered.height} — re-seeding the corner smoother")
        }
        if (frames % cfg.alignEvery != 0L) return
        val sample = source.latestCalibrationSample() ?: return
        if (sample.version != null && sample.version == lastFrameVersion) {
            sample.frame.release()
            return
        }
        if (sample.version != null) lastFrameVersion = sample.version
        val frame = sample.frame
        val alignedAfterFrame = frames
        cachedMarkers?.let { markers ->
            val corners = boardCornersFromMarkers(markers(frames), geometry(), tracker)
            corners?.let {
                val corrected = cornersToFlat(onGrid(frame, it))
                onCorners(corrected)
                cornerSink?.invoke(alignedAfterFrame, corrected)
            }
            frame.release()
            return
        }
        inFlight = true
        val current = tracker
        scope.launch(dispatcher) {
            val result =
                runCatching {
                    boardCornersForFrame(frame, geometry(), current, detectScale = cfg.alignScale, detector = markerDetector)
                }
            result.onSuccess { corners ->
                corners?.let {
                    val corrected = cornersToFlat(onGrid(frame, it))
                    onCorners(corrected)
                    cornerSink?.invoke(alignedAfterFrame, corrected)
                }
            }
            result.onFailure { log.warn("live align failed", it) }
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
     * **It costs ~500 ms, and that is measured.** On the dev machine at boardSize 1248, `improveQuad`
     * alone reads 412-432 ms and the whole `quadOf` around it 625 ms (medians, 2026-08-07). This
     * KDoc previously said "70-85 ms at boardSize 800", which even scaled by area would be ~200 ms
     * — the real figure is roughly triple. It has still NOT been measured on device, where it will
     * be slower.
     *
     * Half a second is why the dispatcher on this class is a parameter: for months this ran on the
     * phone's UI thread, because `TrackerStack` inherited `lifecycleScope`'s `Main.immediate` and
     * only the desktop passed anything else. A once-per-pose cost on a background dispatcher is
     * fine; the same cost on the main thread is a visible freeze that nothing reported.
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
            log.info(
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
        log.info("board moved ${"%.2f".format(drift)} cells since the grid fit — re-measuring the correction")
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
        lastFrameVersion = null
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
