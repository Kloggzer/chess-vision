package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toModel
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.model
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.rawQuadOf
import com.chesslab.tracker.geometry.refinedQuad
import com.chesslab.tracker.geometry.squareOffsetOf
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.log.TrackerLogs
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.service.CameraFrameBus
import com.chesslab.tracker.service.StatusPublisher
import com.chesslab.tracker.service.TrackerSeed
import com.chesslab.tracker.service.TrackerStack
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import org.opencv.core.Mat
import java.awt.image.BufferedImage
import java.io.File
import kotlin.system.exitProcess

/**
 * The tracker on a PC, running the code the phone runs.
 *
 * `replay <video>` drives a recorded clip through the real `TrackerStack` — the same pipeline, the
 * same engine, the same coordinator — and prints what it commits. There is no second loop here and
 * no second pipeline: this file builds the object graph and feeds it frames, which is exactly what
 * `TrackerService` does on the phone, minus the notification.
 *
 * The virtual clock is derived from the source's own frame rate rather than from the wall clock, so
 * a replay is deterministic: the same file produces the same game, which is what makes a breakpoint
 * worth setting.
 */
fun main(args: Array<String>) {
    NativeCv.require()
    when (args.firstOrNull()) {
        "cameras" -> probeCameras().ifEmpty { listOf("no camera answered on indices 0..3") }.forEach(::println)
        "replay" -> {
            val video = File(args.getOrNull(1) ?: usage())
            check(video.isFile) { "no such video: ${video.absolutePath}" }
            replay(VideoFileSource(video), video.name, ReplayOptions.parse(args.drop(2)), video = video)
        }
        "calibrate" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            WebcamSource(index).use { calibrate(it) }
        }
        "align" -> alignCamera(args.getOrNull(1)?.toIntOrNull() ?: usage(), raw = args.getOrNull(2) == "raw")
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(WebcamSource(index), "camera $index", ReplayOptions.parse(args.drop(2)), cameraToken(index))
        }
        else -> usage()
    }
}

/**
 * `align <n> [raw]` — the board against its own grid, with the stored optics or without them.
 *
 * `raw` is the comparison that says whether the distortion or the board geometry is the error, and
 * it is the only reason this verb exists.
 *
 * A MEASUREMENT tool may undistort, visibly, at its own call site. The frame source may NOT: it
 * used to, which put a transform in front of every consumer that none of them could see or switch
 * off. Inside the tracker the same job is `Stage.LENS`, which at least reports what it cost.
 */
private fun alignCamera(
    index: Int,
    raw: Boolean,
) {
    val cost = Cost()
    WebcamSource(index).use { source ->
        openLens(source, cameraToken(index), wanted = !raw).use { optics ->
            measureAlignment(timedFrames(source, optics, cost), cost)
        }
    }
    cost.report("what each frame cost:")
}

/** The camera's frames, corrected if a lens is in play, with both halves on the clock. */
private fun timedFrames(
    source: FrameSource,
    optics: Undistorter?,
    cost: Cost,
): () -> Mat? =
    {
        cost.of("camera grab") { source.next() }?.let { frame ->
            if (optics == null) frame else cost.of("lens remap") { optics.apply(frame) }
        }
    }

/**
 * The board's own markers, before anything else is built.
 *
 * A first pass rather than a stage in the loop: the quad decides the board SIZE, which decides the
 * warp the engine indexes its squares against — so it has to be known before the stack exists. On
 * the phone the same thing happens, spread over a calibration screen.
 */
private fun locateBoard(
    next: () -> Mat?,
    cost: Cost = Cost(),
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    repeat(attempts) {
        val frame = next() ?: return null
        // The two halves of `quadOf`, called separately so each can be timed. The split is the
        // point: ArUco carries a "44-87 ms" claim from commit 4a7609e and `improveQuad` a
        // "70-85 ms at boardSize 800" one that its own KDoc declines to stand behind, and a single
        // combined number could not have checked either.
        val markers = cost.of("aruco") { rawQuadOf(frame) } ?: return@repeat
        return cost.of("grid refit") { refinedQuad(frame, markers) }
    }
    return null
}

/**
 * What the STORED marker margin costs on this board, measured against the board's own grid.
 *
 * `margin` says how far outside the playing field the markers sit, and it is a constant today:
 * `DEFAULT_MARKER_MARGIN` = 0.045, one value assumed for all four corners. The markers are glued on
 * by hand. So this asks the only question that decides whether that constant is good enough here —
 * `alignmentOf`, which is absolute rather than self-referential: it fits the board's own nine lines
 * per axis and reports the worst square offset against 4 % of a cell, counting any line it could
 * NOT locate as unread rather than assuming it.
 *
 * It changes nothing. A margin measured per corner is only worth building if this says the constant
 * is wrong, and by how much.
 */
private fun measureAlignment(
    next: () -> Mat?,
    cost: Cost = Cost(),
    frames: Int = ALIGN_FRAMES,
) {
    val quad =
        locateBoard(next, cost) ?: run {
            println("no board found: the markers never decoded")
            return
        }
    val geometry = boardGeometryFor(quad)
    val corners = cornersFromFlat(quad)
    println("board ${geometry.boardSize} px, margin ${geometry.margin.joinToString { "%.3f".format(it) }} (the stored constant)")
    val worst = mutableListOf<Double>()
    var unread = 0
    var read = 0
    repeat(frames) {
        val frame = next() ?: return@repeat
        val verdict = cost.of("alignmentOf") { alignmentOf(frame, corners, geometry) }
        if (verdict.worst.isFinite()) worst += verdict.worst
        unread += verdict.unread
        read += 1
        if (read == 1) println("first verdict: ${verdict.reason} (limit ${"%.2f".format(verdict.limit)} px)")
    }
    if (worst.isEmpty()) {
        println("no frame could be measured at all")
        return
    }
    val sorted = worst.sorted()
    println(
        "worst square offset over $read frames: " +
            "median ${"%.2f".format(sorted[sorted.size / 2])} px, " +
            "p90 ${"%.2f".format(sorted[(sorted.size * P90_NUM) / P90_DEN])} px, " +
            "max ${"%.2f".format(sorted.last())} px",
    )
    println("grid lines that could not be located: $unread over ${read * GRID_LINES_PER_FRAME}")
    next()?.let { frame ->
        rawQuadOf(frame)?.let { raw ->
            writeQuadProbe(frame, raw, File(QUAD_PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
        }
    }
}

/**
 * Calibrate the lens from the board, and say plainly whether it worked.
 *
 * Writes nothing on its own: a calibration that does not bring the board under the limit is a
 * finding, not a file. The stored one that made this rig worse is exactly what happens when that
 * distinction is skipped.
 */
private fun calibrate(source: FrameSource) {
    // A LOAN, not a getter: `next()` hands back a Mat the source still owns and will overwrite.
    // The phone's `latestCalibrationFrame()` hands back a clone the caller must release, so the
    // seam is shaped to let each host keep its own rule instead of one of them being quietly wrong.
    val fit =
        calibrateFromBoard(
            { use -> source.next()?.also(use) != null },
            source.delivered.width,
            source.delivered.height,
        ) { println("  $it") }
    when {
        fit == null -> println("no board found: the markers never decoded")
        fit.rejected != null -> println("evidence: ${fit.evidence} — refused: ${fit.rejected}")
        else -> report(source, fit)
    }
}

private fun report(
    source: FrameSource,
    fit: LensFit,
) {
    println("evidence: ${fit.evidence}")
    println(
        "bow ${"%.5f".format(fit.bowBefore)} → ${"%.5f".format(fit.bowAfter)}  " +
            "k1=${"%.4f".format(fit.k1)} k2=${"%.4f".format(fit.k2)} " +
            "centre=(${"%.0f".format(fit.cx)}, ${"%.0f".format(fit.cy)})",
    )
    if (!fit.ok) {
        println("not accepted: the bow did not improve by the required margin")
        return
    }
    // The verdict the fit does not control. A model that flattens its own objective and leaves the
    // squares where they were has explained nothing — which is a finding, not a calibration.
    val size = source.delivered
    val raw = medianOffset(source::next)
    val corrected =
        Undistorter(fit.toModel(), size.width, size.height).use { undistorter ->
            medianOffset(next = { source.next()?.let(undistorter::apply) })
        }
    println(
        "worst square offset: ${raw?.let { "%.2f".format(it) } ?: "unmeasurable"} px raw → " +
            "${corrected?.let { "%.2f".format(it) } ?: "unmeasurable"} px corrected",
    )
    writeLensProbe(source, fit, File(PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
}

/**
 * Median worst square offset over [frames], which is the only form these numbers may be compared in.
 *
 * This measured ONE frame each until 2026-08-07, while `align` measured sixty — so a calibration was
 * being judged against a number taken a different way from the one it would be compared to. The
 * per-run spread turns out to be tiny (<= 0.07 px over sixty frames), but that is a thing you learn
 * by measuring the spread, not a thing you may assume while skipping it.
 */
private fun medianOffset(
    next: () -> Mat?,
    frames: Int = ALIGN_FRAMES,
): Double? {
    val seen = mutableListOf<Double>()
    repeat(frames) {
        val frame = next() ?: return@repeat
        quadOf(frame)?.let { quad -> squareOffsetOf(frame, quad).takeIf { it.isFinite() }?.let(seen::add) }
    }
    return seen.sorted().getOrNull(seen.size / 2)
}

private fun usage(): Nothing {
    listOf(
        "usage: chesslab-desktop <command>",
        "  cameras                    what is attached, as the driver reports it",
        "  calibrate <camera-index>   fit the lens from the board's own grid lines",
        "  align <camera-index> [raw] measure the board against its grid; 'raw' skips the lens",
        "  replay <video.mp4> [options]  drive a recorded clip through the shipping tracker",
        "  track <camera-index> [options]  the same, live",
        "",
        "  options (order-free): quiet  no window, for scripted runs",
        "                        dump   write the annotated board every 150 frames to tmp/",
        "                        lens   fit the optics from the board in the footage first",
        "                        nocnn  run the engine's no-observation occlusion fallback",
        "                        label  measure the geometry, replay, and write the tracker's",
        "                               PROPOSAL to data/realgames/<name>/candidate.json",
        "                        score  compare a run against an existing candidate.json:",
        "                               found / missed / invented, never one merged accuracy",
        "                        frames write the DECISIVE frames (every decision row, ±2) as the",
        "                               normalised labeled board to data/realgames/<name>/frames-decisive/",
        "                        name=<x>  the candidate's directory name (default: video stem)",
        "                        cleanonly  EXPERIMENT: commit and vote only on a hand-free board",
        "                        model=<name>  one of the bundled graphs",
        "",
        "  The board view opens unless 'quiet' or 'dump': it shows the rectified warp the engine",
        "  reasons about with its per-square verdicts, and STOPS when the engine gets stuck",
        "  (space steps, c continues, s disarms).",
    ).forEach(::println)
    exitProcess(2)
}

private fun replay(
    source: FrameSource,
    name: String,
    options: ReplayOptions,
    camera: String? = null,
    video: File? = null,
) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val console: TrackerLogs = { tag -> ConsoleLog(tag) }
    // `label` measures the footage FIRST and refuses footage that cannot carry one — a label on
    // crooked geometry is worse than none. `score` replays through the LABEL's stored quad, so
    // the comparison and the label share their geometry by construction.
    val plan = replayPlanFor(options, video)
    source.use { source ->
        // The board size is MEASURED from the detected quad and then copied into the config, exactly
        // as the phone does. `TrackerConfig.boardSize`'s own comment says why it is neither a
        // preference nor a real default: `measuredBoardSize` clamps to 320..1280, so a config still
        // carrying the 1600 placeholder disagrees with every plane the warp produces and
        // `FrameLoop.step` refuses them — "one silently dropped frame at a time".
        //
        // It does NOT come from the model. The model owns the crop composition (specs/45: pad_side,
        // pad_up, infer_size); this is the resolution the DIFF path works in
        // (`detSize = boardSize * detectScale`), and the recognizer has no business setting that.

        // Built once and handed to the stages, which own it and close it. The board is located on
        // the SAME pixels the tracker will see — locating it on raw frames and then tracking on
        // corrected ones would seed the stack with a quad measured in the other space.
        // Fitted from the board in THIS footage, not loaded from a file: a stored calibration
        // assumes the optics have not moved since, and on this rig a fit from the footage beat the
        // stored one by 1.2 px. It goes through `Stage.LENS` — the frame source never undistorts.
        val optics =
            (if (options.lens) fitLensFrom(source) else null)
                ?.let { Undistorter(it, source.delivered.width, source.delivered.height) }
                ?: camera?.let { openLens(source, it, wanted = true) }
        val corrected = { source.next()?.let { frame -> optics?.apply(frame) ?: frame } }
        val quad = plan?.quad() ?: locateBoard(corrected)
        if (quad == null) {
            println("no board found: the markers never decoded")
            // Nothing takes ownership on this path, because the stages that would are never built.
            optics?.close()
            return
        }
        // The MODEL owns the crop composition (specs/45), and the desktop was not asking it: crops
        // were cut at `BoardGeometry`'s 128x128 while `id35-80` takes 80x80, so every observation
        // threw inside `CnnObserver` and was swallowed as a warning while the run reported
        // `cnn=run`. Read whether or not the CNN is on, so `nocnn` isolates the classifier and not
        // the geometry — two runs differing in one flag have to differ in one thing.
        val spec = desktopModelSpec(options.model)
        val geometry = boardGeometryFor(quad).withCropOf(spec)
        val config = options.trackerConfig(geometry, live = camera != null)
        println("board located from its markers: ${geometry.boardSize} px warp  ·  $options")
        println("crops: ${cropLine(spec, geometry)}")
        if (camera == null) println("observer: synchronous, every ${REPLAY_OBSERVER_INTERVAL_S}s of video time — runs repeat")
        val publisher = StatusPublisher(scope)
        val cnn = if (options.cnn) openDesktopCnn(options.model, console("chesslabCnn")) else null
        if (!options.cnn) println("cnn: off — the engine uses its no-observation occlusion fallback")
        val frameClock = FrameClock(source.fps, live = camera != null)
        // The label's plies and the score's run come off the decision sink — streaming, one row
        // per move (a recovery bridge writes per-move rows), so collecting rows collects plies.
        val session = plan?.session(quad, geometry.boardSize, source.fps) { publisher.status.value }
        // Held here rather than read back off the stack: `TrackerStack` takes the bus as a
        // constructor argument and does not expose it, and widening a shared seam for one host's
        // debugging window would be the wrong trade.
        val bus = CameraFrameBus(MutableStateFlow(CameraHealth.Up), scope, ::matToImage)
        val view = openView(options, name)
        val stack =
            buildStack(
                config,
                geometry,
                frameClock,
                optics,
                bus,
                publisher,
                cnn,
                console,
                scope,
                session?.collector,
                live = camera != null,
            )
        stack.coordinator.applyCalibration(geometry, quad, "desktop", source.delivered)
        val frames = drive(source, stack, bus, publisher, view, frameClock, options.dumpEvery, session?.frameHook)
        println("tracked $frames frames of $name at ${"%.2f".format(source.fps)} fps")
        // Where the CNN chain stopped. `observations` counts snapshots the observer EMITTED;
        // the engine's own `cnnSnaps` counts what arrived. Two numbers, one seam between them.
        println("cnn: state=${stack.observer.state.value} observations=${stack.observations} ${stack.observer.counters}")
        session?.finish(video, options, config, geometry, publisher.status.value?.note, stack.observations.toInt(), frames)
        stack.close()
        view?.close()
    }
    scope.cancel()
}

/**
 * The board view, unless the run is scripted. `quiet` is what makes a replay scriptable: with a
 * window open, break-on-stuck is right — a human is watching and wants it to stop — but that same
 * default turns a batch replay into a process waiting forever for a key nobody will press.
 */
private fun openView(
    options: ReplayOptions,
    name: String,
): TrackerView? {
    val view = if (options.watch) TrackerView.openOrNull("chesslab — $name") else null
    if (options.watch && view == null) println("no display: running without the board view")
    return view
}

/** The object graph the phone builds too, with this host's frame type and this run's optics. */
@Suppress("LongParameterList")
private fun buildStack(
    // Built by the caller and passed whole, because a label records it as `effective_config` —
    // the config the engine RAN, and two constructions drift (that is how ClipDriver desynced).
    config: TrackerConfig,
    geometry: BoardGeometry,
    clock: FrameClock,
    optics: Undistorter?,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    cnn: (() -> Attached)?,
    logs: TrackerLogs,
    scope: CoroutineScope,
    collector: DecisionCollector? = null,
    live: Boolean = false,
): TrackerStack<Mat> =
    TrackerStack(
        TrackerSeed<Mat>(
            // NOT a preference and not a real default: `measuredBoardSize` clamps to 320..1280, so
            // a config still carrying the 1600 placeholder disagrees with every plane the warp
            // produces and `FrameLoop.step` refuses them, one silently dropped frame at a time.
            config = config,
            geometry = { geometry },
            corners = null,
            startFen = STARTPOS,
            onDecision = {
                println("decision: ply=${it.ply} ${it.san ?: "-"} decider=${it.decider}")
                collector?.offer(it)
            },
            logs = logs,
            stages = { geo, cfg, store, frameBus, boardBus ->
                OpenCvStages({ it }, {}, geo, cfg, store, frameBus, boardBus, optics)
            },
            // The VIDEO's clock, not this machine's — see `FrameClock`.
            nowMs = clock::now,
            // A replay runs its inference inline so the snapshot lands before the next frame is
            // decoded — the last wall-clock dependence, and the source of 54-vs-39-ply runs of
            // one unchanged file. Live keeps the phone's shape: a dedicated observer thread.
            observerDispatcher = if (live) null else Dispatchers.Unconfined,
        ),
        SettingsRepository(MemoryConfigStore, scope),
        publisher,
        bus,
        StageTimings(logLine = { println("chesslabPerf: $it") }),
        scope,
        // With a CNN the engine arbitrates occlusion per square; without one
        // `Taint.cnnOcclusionFilter` falls back to ">2 changed squares = a hand", which is a
        // different tracker. `nocnn` runs that fallback ON PURPOSE, so the two can be compared
        // instead of one being mistaken for the other.
        cnn ?: { error("running without a CNN — the engine uses its occlusion fallback") },
    )

/**
 * Frames in, until the source runs dry or the viewer's window is closed.
 *
 * The view is consulted BEFORE the next frame is pulled, not after: when it stops on a stuck
 * engine, what is on screen has to be the state that caused the stop rather than the one after it.
 */
@Suppress("LongParameterList")
private fun drive(
    source: FrameSource,
    stack: TrackerStack<Mat>,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    view: TrackerView?,
    clock: FrameClock,
    dumpEvery: Int = 0,
    // Fired AFTER the engine saw the frame, with the 0-based index that decoded it. The index and
    // the picture travel in one call — the review-frame writer's whole correctness rests on that.
    frameHook: ((Int, Mat) -> Unit)? = null,
): Int {
    var frames = 0
    while (true) {
        val open = view?.awaitStep(publisher.status.value) ?: true
        val frame = if (open) source.next() else null
        if (frame == null) return frames
        clock.tick()
        stack.coordinator.onFrame(frame, source.delivered)
        frameHook?.invoke(frames, frame)
        frames += 1
        view?.show(bus.boardPreview.value, publisher.status.value)
        if (dumpEvery > 0 && frames % dumpEvery == 0) {
            dumpBoard(frames, bus.boardPreview.value, publisher.status.value)
        }
    }
}

/**
 * The clock the engine runs on.
 *
 * A camera's frames arrive when they arrive, so [live] hands back the wall clock unchanged. A
 * recorded file has its own time base — frame N was taken at `N / fps` seconds — and that is the
 * only clock under which a replay means anything: decode speed is a property of this machine, and
 * the engine ages its motion window, its anomaly latch and its CNN cooldowns against whatever it
 * is given. It also makes a replay reproducible, which `EngineState` calls binding and which the
 * wall clock cannot be.
 */
private class FrameClock(
    fps: Double,
    private val live: Boolean,
) {
    private val periodMs = if (fps > 0) MS_PER_SECOND / fps else 0.0
    private var frames = 0L

    fun tick() {
        frames += 1
    }

    fun now(): Long = if (live) System.currentTimeMillis() else (frames * periodMs).toLong()
}

private const val MS_PER_SECOND = 1000.0

/** stdout is this host's logcat. The channel names are the shared code's, unchanged. */
private class ConsoleLog(
    private val tag: String,
) : TrackerLog {
    override fun debug(message: String) = Unit

    override fun info(message: String) = println("$tag: $message")

    override fun warn(
        message: String,
        error: Throwable?,
    ) = println("$tag: WARN $message${error?.let { " (${it.message})" }.orEmpty()}")

    override fun error(
        message: String,
        error: Throwable?,
    ) = println("$tag: ERROR $message${error?.let { " (${it.message})" }.orEmpty()}")
}

/** Settings a replay does not persist. The store is a seam precisely so a host can decline one. */
private object MemoryConfigStore : ConfigStore {
    private val slots = mutableMapOf<String, String>()

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
    }
}

/** Frames to spend looking for the markers before giving up. At 30 fps this is two seconds. */
private const val LOCATE_ATTEMPTS = 60

/** Frames to judge the alignment over. Two seconds is enough to see a jitter that matters. */
private const val ALIGN_FRAMES = 60

/** Nine lines per axis, both axes — what `gridLines` reports on every frame. */
private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10

/** Where the visual proof lands. Under tmp/, which is not the corpus. */
private const val PROBE_PATH = "../../tmp/lens-probe.png"

/** Where the quad comparison lands. */
private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"
