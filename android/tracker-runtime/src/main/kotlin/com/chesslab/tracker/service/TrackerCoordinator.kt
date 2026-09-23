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

/**
 * The analyzer-thread loop — nothing here blocks, and the parameter list IS the seam rather than a
 * smell. What each decision cost when it was made differently: `docs/tracker-runtime-service.md`.
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
     * The engine's clock, and a parameter because several gates are AGES against it: the wall clock
     * makes a replay's windows 1.6x too short and two runs disagree (`docs/tracker-runtime-service.md`).
     */
    private val nowMs: () -> Long = System::currentTimeMillis,
    /**
     * Belichtung nach dem Brett statt nach dem Rahmen. Vorgabe [ExposureGovernor.NONE]: ein Replay
     * stellt keine Kamera (`docs/tracker-runtime-service.md`).
     */
    private val exposure: ExposureGovernor = ExposureGovernor.NONE,
    /**
     * Der Fokus-Sweep beim Aufsetzen und die Schaerfe-Aufsicht danach. Vorgabe [FocusGovernor.NONE]
     * aus demselben Grund wie [exposure]: ein Replay stellt keine Linse.
     */
    private val focus: FocusGovernor = FocusGovernor.NONE,
    /** Jede Notiz-/Stuck-Aenderung der Engine, eine Zeile: der Replay hat sonst nur Entscheidungszeilen. */
    private val onNote: (String) -> Unit = {},
) {
    private var sourceSeq = 0L

    private val notes = NoteThrottle(nowMs)

    /** Das Grundrauschen im Zellmittel fuer die Perf-Zeile — misst zwei Frames je Sekunde. */
    private val noise = NoiseFloor()

    /**
     * The frame clock spans this WHOLE method. Narrower, it left three stages measured by nothing
     * and read ~65 ms against an observed ~90 ms frame period (`docs/tracker-runtime-service.md`).
     */
    fun onFrame(
        image: T,
        delivered: DeliveredSize,
    ) = WorkProfiler.span(WorkOperation.COORDINATOR_FRAME, ++sourceSeq) {
        timings.begin()
        drainCalibration()
        // Display-only, and it has to come from the delivered frame — see `previewRotation`.
        bus.noteRotation(delivered.rotationDegrees)
        // The preview bus is fed from INSIDE the pipeline now (`FrameStages.publishFrame`), off the
        // frame the convert already produced — see `CameraFrameBus.offer`.
        val result = pipeline.onFrame(image, delivered.width, delivered.height, nowMs())
        val events = host.tick((result as? FrameResult.Ready)?.input).toMutableList()
        noteEvents(events)
        // The engine runs HERE, on the analyzer thread, and it is part of the frame budget.
        timings.mark(Stage.ENGINE)
        publisher.sizeMismatch = pipeline.sizeMismatch
        // The corners this frame was warped with — the overlay's board quad (D06b-4).
        publisher.corners = pipeline.corners
        // A PROVIDER: the publisher samples at 10 Hz and only builds the status when it will use it.
        publisher.publish(host::status, host.fen(), events, (result as? FrameResult.Skipped)?.note)
        // The observer's warp comes after the decision; a fresh candidate gets one on this frame too.
        pipeline.cropWarpAfterTick(host.verifyWaiting())
        observer.onFrameAvailable()
        // An observation already back (inline in a replay, a fast phone) is judged NOW rather than
        // at the top of the next tick: same state, same clock, one frame earlier.
        val late = host.tick(null)
        if (late.isNotEmpty()) {
            events += late
            noteEvents(late)
            publisher.publish(host::status, host.fen(), late, null)
        }
        // Nach dem Frame, nicht davor: die Messung liest den Warp, den dieser Frame schon bezahlt
        // hat, und eine Verstellung nimmt die Pixel-Referenz mit (`docs/tracker-runtime-service.md`).
        val ready = result as? FrameResult.Ready
        // Vor der Regelung, damit kein Paar ueber eine Verstellung hinweg gemessen wird. Denselben
        // 160er-Warp wie die Belichtung, und der ist je Frame memoisiert — also hoechstens einer.
        if (ready != null) noise.observe(ready.input.seq, ready.input.corners) { ready.input.board?.invoke(it) }
        // `quiet`: dieser Frame hat die Engine NICHT beschaeftigt. Ein Ereignis heisst Commit,
        // Alarm oder Re-Anchor — alles Momente, in denen die Pixel-Referenz gerade entsteht.
        val quiet = events.isEmpty()
        if (ready != null) {
            // Waehrend eines Sweeps stellt die Belichtung nicht, und zwar als UNRUHIGER Frame
            // statt als uebersprungener Aufruf (`docs/tracker-runtime-service.md`).
            val settled = quiet && !focus.sweeping
            // Normalisiert gegen den GELIEFERTEN Frame: `corners` sind Quellpixel, der Warp misst
            // boardSize * detectScale, und das Geraet misst in Frame-Koordinaten.
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

    /**
     * 06a's calibration result. Queued, not applied: written inline, a frame warped with the NEW
     * corners under the OLD board size (`docs/tracker-runtime-service.md`).
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
        align.reset(next.delivered, next.corners)
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
 * Die Drossel vor dem Notiz-Log: Notizen tragen Zaehlerstaende, wechseln also im Stillstand auf
 * fast jedem Frame. Ein Stuck ist ein Zustandswechsel und geht immer durch (`docs/tracker-runtime-service.md`).
 */
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

/** Wie dicht zwei VERSCHIEDENE Notizen aufeinander folgen duerfen — auf der Uhr der Engine. */
internal const val MIN_NOTE_GAP_MS = 250L

/**
 * ArUco re-detection, off the frame thread — 44-87 ms every 300 ms on the analyzer thread before
 * (commit 4a7609e). Why [dispatcher] is a parameter: `docs/tracker-runtime-service.md`.
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
    /**
     * Die Rektifizierung ist gewechselt — dieselbe Lage wie bei der Belichtung, siehe [onFrame].
     * Vorgabe leer; live haengt daran die Pixel-Referenz (`docs/tracker-flow.md`).
     */
    private val onRectificationChanged: () -> Unit = {},
    /** The calibrated quad this run starts on — the only corner values measured with every marker. */
    calibrated: FloatArray? = null,
) {
    private var tracker = MarkerTracker()

    /**
     * Where a corner stays while its marker has never been read. Seeded from the calibration and
     * carried forward by every accepted align — `boardCornersFromMarkers`.
     */
    @Volatile
    private var anchor: List<DoubleArray>? = calibrated?.let(::cornersFromFlat)

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
     * The quad [correction] was fitted against — it is a constant OF THAT SETUP, and without this
     * it outlived its own premise for the rest of a session (`docs/tracker-runtime-service.md`).
     */
    @Volatile
    private var fittedAt: FloatArray? = null

    @Volatile
    private var inFlight = false

    /**
     * Which calibration the in-flight job belongs to; [reset] moves it on. A job landing after a
     * recalibration overwrote the corners the user had just measured (`docs/tracker-runtime-service.md`).
     */
    @Volatile
    private var generation = 0

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
            // Die Verbraucher liegen MIT im `runCatching`: der Scope ist kein `SupervisorJob`, ein
            // Wurf aus `onCorners` risse ihn ab und kein spaeterer `launch` startete je wieder
            // (C7, `LiveAlignWedgeBugTest`). Release und Flag stehen im `finally`.
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

    /**
     * The ArUco quad pulled back onto the board's own grooves — MEASURED once per pose at ~500 ms
     * (2026-08-07, never on device), then re-applied free. `docs/tracker-runtime-service.md`.
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
     * Drop the correction when the board is no longer where it was fitted. Logged both ways round:
     * a silent vanish debugs as badly as a silent persist (`docs/tracker-flow.md`).
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
        onRectificationChanged()
    }

    /**
     * A new calibration invalidates the smoothed markers and the grid correction with them — that
     * correction is a property of THIS board under THIS lens.
     */
    fun reset(
        delivered: DeliveredSize,
        corners: FloatArray? = null,
    ) {
        generation += 1
        tracker = MarkerTracker()
        // A recalibration is a fresh measurement of every corner; keep the old anchor only without one.
        corners?.let { anchor = cornersFromFlat(it) }
        size = delivered
        correction = null
        correctionTried = false
        fittedAt = null
        lastFrameVersion = null
    }
}

/**
 * How far the board may move before the grid correction is thrown away, in cells. **A starting
 * value, not a measurement** — measure it before quoting it as derived (`docs/tracker-runtime-service.md`).
 */
private const val DRIFT_REFIT_CELLS = 0.25

/**
 * Woraus die Belichtung gemessen wird: 160 px sind 20 px je Feld — reichlich fuer einen
 * Mittelwert, und die Groesse, die die Stillstands-Engine ohnehin schon warpt.
 */
private const val METER_BOARD_PX = 160

/**
 * Das Brett-Quad als normalisierte Region fuer den Geraete-Autofokus. `size` ist die groessere der
 * beiden Kanten, damit die Region nie kleiner ist als das, worauf scharfgestellt werden soll.
 */
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

/**
 * Woraus die Schaerfe gemessen wird: 1024 px sind 128 px je Feld — nicht die 160 der Belichtung,
 * die genau die Frequenzen wegrechnen, an denen Unschaerfe sichtbar waere (`docs/tracker-runtime-service.md`).
 */
private const val FOCUS_BOARD_PX = 1024
