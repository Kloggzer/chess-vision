package com.chesslab.tracker.service

import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.BoardMarkerDetector
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.applyGridCorrection
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.boardCornersFromMarkers
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.gridCorrection
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.quadDriftCells
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.ExposureGovernor
import com.chesslab.tracker.camera.FocusGovernor
import com.chesslab.tracker.camera.FocusRegion
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameResult
import com.chesslab.tracker.pipeline.NoiseFloor
import com.chesslab.tracker.pipeline.Stage
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.opencv.core.Mat
import java.util.concurrent.atomic.AtomicReference

/** Nothing here blocks. What each decision cost: `docs/tracker-runtime-service.md`. */
@Suppress("LongParameterList")
class TrackerCoordinator<T>(
    private val pipeline: FramePipeline<T>,
    private val host: EngineHost,
    private val publisher: StatusPublisher,
    private val bus: CameraFrameBus<*>,
    private val observer: CnnObserver,
    private val align: LiveAlign,
    private val timings: StageTimings,
    /** A parameter because several gates are AGES against it: the wall clock made a replay's windows 1.6x too short. */
    private val nowMs: () -> Long = System::currentTimeMillis,
    /** Vorgabe [ExposureGovernor.NONE]: ein Replay stellt keine Kamera. */
    private val exposure: ExposureGovernor = ExposureGovernor.NONE,
    /** Vorgabe [FocusGovernor.NONE]: ein Replay stellt keine Linse. */
    private val focus: FocusGovernor = FocusGovernor.NONE,
    /** Der Replay hat sonst nur Entscheidungszeilen. */
    private val onNote: (String) -> Unit = {},
) {
    private var sourceSeq = 0L

    private val notes = NoteThrottle(nowMs)

    private val noise = NoiseFloor()

    /** The frame clock spans this WHOLE method: narrower, three stages were measured by nothing. */
    fun onFrame(
        image: T,
        delivered: DeliveredSize,
    ) = WorkProfiler.span(WorkOperation.COORDINATOR_FRAME, ++sourceSeq) {
        timings.begin()
        drainCalibration()
        // Display-only, and from the delivered frame.
        bus.noteRotation(delivered.rotationDegrees)
        val result = pipeline.onFrame(image, delivered.width, delivered.height, nowMs())
        val events = host.tick((result as? FrameResult.Ready)?.input).toMutableList()
        noteEvents(events)
        timings.mark(Stage.ENGINE)
        publisher.sizeMismatch = pipeline.sizeMismatch
        publisher.corners = pipeline.corners
        // A PROVIDER: the status is built only when the 10 Hz sampler will use it.
        publisher.publish(host::status, host.fen(), events, (result as? FrameResult.Skipped)?.note)
        pipeline.cropWarpAfterTick(host.verifyWaiting())
        observer.onFrameAvailable()
        // An observation already back (inline replay, fast phone) is judged NOW, one frame earlier.
        val late = host.tick(null)
        if (late.isNotEmpty()) {
            events += late
            noteEvents(late)
            publisher.publish(host::status, host.fen(), late, null)
        }
        // Nach dem Frame: die Messung liest den bezahlten Warp, und eine Verstellung nimmt die Pixel-Referenz mit.
        val ready = result as? FrameResult.Ready
        // Vor der Regelung, damit kein Paar ueber eine Verstellung hinweg gemessen wird.
        if (ready != null) noise.observe(ready.input.seq, ready.input.corners) { ready.input.board?.invoke(it) }
        // Ein Ereignis heisst Commit, Alarm oder Re-Anchor — Momente, in denen die Pixel-Referenz entsteht.
        val quiet = events.isEmpty()
        if (ready != null) {
            // Waehrend eines Sweeps als UNRUHIGER Frame, nicht als uebersprungener Aufruf.
            val settled = quiet && !focus.sweeping
            // Gegen den GELIEFERTEN Frame: das Geraet misst in Frame-Koordinaten.
            val where = focusRegion(ready.input.corners, delivered.width, delivered.height)
            val moved = focus.onBoard(ready.input.seq, quiet, where) { ready.input.board?.invoke(FOCUS_BOARD_PX) }
            val lit = exposure.onBoard(ready.input.seq, settled) { ready.input.board?.invoke(METER_BOARD_PX) }
            if (moved || lit) {
                host.submit(EngineAction.CaptureBaseline)
                noise.disarm()
            }
        }
        align.maybeAlign(bus, delivered)
        timings.endFrame((result as? FrameResult.Skipped)?.note, pipeline.lastLuma(), noise.busy)
    }

    private fun noteEvents(events: List<TrackerEvent>) {
        for (event in events) {
            if (!notes.accept(event)) continue
            when (event) {
                is TrackerEvent.Note -> onNote("seq=$sourceSeq note: ${event.text}")
                is TrackerEvent.Stuck -> onNote("seq=$sourceSeq stuck: ${event.reason}")
                else -> Unit
            }
        }
    }

    /** Queued, not applied: inline, a frame was warped with the NEW corners under the OLD board size. */
    fun applyCalibration(
        geometry: BoardGeometry,
        corners: FloatArray,
        profileName: String,
        delivered: DeliveredSize,
    ) {
        pending.set(PendingCalibration(geometry, corners, profileName, delivered))
    }

    /** Newest wins. */
    private fun drainCalibration() {
        val next = pending.getAndSet(null) ?: return
        pipeline.onGeometryChanged(next.geometry)
        pipeline.corners = next.corners
        pipeline.setProfile(next.profileName, next.delivered.width, next.delivered.height)
        align.reset(next.delivered, next.corners)
    }

    private val pending = AtomicReference<PendingCalibration?>(null)

    /** Not a data class: a [FloatArray]'s generated `equals` compares identity. */
    private class PendingCalibration(
        val geometry: BoardGeometry,
        val corners: FloatArray,
        val profileName: String,
        val delivered: DeliveredSize,
    )
}

/** Notizen tragen Zaehlerstaende und wechseln im Stillstand fast jeden Frame. Ein Stuck geht immer durch. */
internal class NoteThrottle(
    private val nowMs: () -> Long,
) {
    private var lastText: String? = null
    private var lastMs: Long? = null

    fun accept(event: TrackerEvent): Boolean {
        val text = (event as? TrackerEvent.Note)?.text ?: return true
        val now = nowMs()
        val last = lastMs
        if (text == lastText || (last != null && now - last < MIN_NOTE_GAP_MS)) return false
        lastText = text
        lastMs = now
        return true
    }
}

/** Auf der Uhr der Engine. */
internal const val MIN_NOTE_GAP_MS = 250L

/** Off the frame thread: 44-87 ms every 300 ms on the analyzer before (commit 4a7609e). */
@Suppress("LongParameterList")
class LiveAlign(
    private val scope: CoroutineScope,
    private val geometry: () -> BoardGeometry,
    private val config: () -> TrackerConfig,
    private val onCorners: (FloatArray) -> Unit,
    private val log: TrackerLog = NoopTrackerLog,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Default,
    /** When present, absence at a frame means no alignment update. */
    private val cachedCorners: ((Long) -> FloatArray?)? = null,
    private val cornerSink: ((Long, FloatArray) -> Unit)? = null,
    private val cachedMarkers: ((Long) -> Map<Int, DoubleArray>)? = null,
    /** Live haengt daran die Pixel-Referenz (`docs/tracker-flow.md`). */
    private val onRectificationChanged: () -> Unit = {},
    /** The only corner values measured with every marker. */
    calibrated: FloatArray? = null,
) {
    private var tracker = MarkerTracker()

    /** Seeded from the calibration and carried forward by every accepted align. */
    @Volatile
    private var anchor: List<DoubleArray>? = calibrated?.let(::cornersFromFlat)

    private val markerDetector = BoardMarkerDetector()
    private var frames = 0L
    private var size: DeliveredSize? = null

    /** Null forever if unmeasurable. */
    @Volatile
    private var correction: DoubleArray? = null

    /** Once per POSE: a failed measurement must not retry every align. */
    @Volatile
    private var correctionTried = false

    /** A constant OF THAT SETUP: without this it outlived its own premise for the rest of a session. */
    @Volatile
    private var fittedAt: FloatArray? = null

    @Volatile
    private var inFlight = false

    /** A job landing after a recalibration overwrote the corners the user had just measured. */
    @Volatile
    private var generation = 0

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
        val sample = source.latestCalibrationSample(lastFrameVersion) ?: return
        if (sample.version != null && sample.version == lastFrameVersion) {
            sample.frame.release()
            return
        }
        if (sample.version != null) lastFrameVersion = sample.version
        val frame = sample.frame
        val alignedAfterFrame = frames
        cachedMarkers?.let { markers ->
            val corners = boardCornersFromMarkers(markers(frames), geometry(), tracker, anchor = anchor)
            corners?.let {
                anchor = it
                val corrected = cornersToFlat(onGrid(frame, it))
                onCorners(corrected)
                cornerSink?.invoke(alignedAfterFrame, corrected)
            }
            frame.release()
            return
        }
        inFlight = true
        val current = tracker
        val startedAt = generation
        scope.launch(dispatcher) {
            // Die Verbraucher liegen MIT im `runCatching`: der Scope ist kein `SupervisorJob`, ein Wurf aus
            // `onCorners` risse ihn ab und kein spaeterer `launch` startete je wieder.
            try {
                runCatching {
                    val corners =
                        boardCornersForFrame(
                            frame,
                            geometry(),
                            current,
                            detectScale = cfg.alignScale,
                            detector = markerDetector,
                            anchor = anchor,
                        )
                    // Before `onGrid`, which would measure a correction against the pose that is gone.
                    corners?.takeIf { startedAt == generation }?.let {
                        anchor = it
                        val corrected = cornersToFlat(onGrid(frame, it))
                        onCorners(corrected)
                        cornerSink?.invoke(alignedAfterFrame, corrected)
                    }
                }.onFailure { log.warn("live align failed", it) }
            } finally {
                frame.release()
                inFlight = false
            }
        }
    }

    /** MEASURED once per pose (~500 ms, never measured on device), then re-applied free. */
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

    /** Logged both ways round: a silent vanish debugs as badly as a silent persist. */
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
        onRectificationChanged()
    }

    /** That correction is a property of THIS board under THIS lens. */
    fun reset(
        delivered: DeliveredSize,
        corners: FloatArray? = null,
    ) {
        generation += 1
        tracker = MarkerTracker()
        // Keep the old anchor only without a fresh measurement of every corner.
        corners?.let { anchor = cornersFromFlat(it) }
        size = delivered
        correction = null
        correctionTried = false
        fittedAt = null
        lastFrameVersion = null
    }
}

/** In cells. **A starting value, not a measurement.** */
private const val DRIFT_REFIT_CELLS = 0.25

/** 20 px je Feld reicht fuer einen Mittelwert, und die Stillstands-Engine warpt die Groesse ohnehin. */
private const val METER_BOARD_PX = 160

/** `size` ist die groessere Kante, damit die Region nie kleiner ist als das, worauf scharfgestellt wird. */
internal fun focusRegion(
    corners: FloatArray,
    width: Int,
    height: Int,
): FocusRegion? {
    if (corners.size < 8 || width <= 0 || height <= 0) return null
    val xs = (0 until 4).map { corners[it * 2] }
    val ys = (0 until 4).map { corners[it * 2 + 1] }
    val cx = (xs.min() + xs.max()) / 2f / width
    val cy = (ys.min() + ys.max()) / 2f / height
    val size = maxOf((xs.max() - xs.min()) / width, (ys.max() - ys.min()) / height)
    if (!cx.isFinite() || !cy.isFinite() || !size.isFinite() || size <= 0f) return null
    return FocusRegion(cx.coerceIn(0f, 1f), cy.coerceIn(0f, 1f), size.coerceIn(0f, 1f))
}

/** 128 px je Feld: die 160 der Belichtung rechnen genau die Frequenzen weg, an denen Unschaerfe sichtbar waere. */
private const val FOCUS_BOARD_PX = 1024
