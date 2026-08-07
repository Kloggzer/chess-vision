package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toModel
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.geometry.LensLoad
import com.chesslab.tracker.geometry.LensMode
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.decodeLens
import com.chesslab.tracker.geometry.lensFor
import com.chesslab.tracker.geometry.model
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.rawQuadOf
import com.chesslab.tracker.geometry.refinedQuad
import com.chesslab.tracker.geometry.squareOffsetOf
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
            val mode = args.getOrNull(2)
            // Fitted from the board in THIS video, not loaded from a file. A stored calibration
            // assumes the optics did not move since it was taken; a fit from the footage cannot be
            // stale, and on the rig it beat the stored one by 1.2 px (see `BoardLens`). It goes
            // through `Stage.LENS` like every other correction — the frame source never undistorts.
            val fitted = if (args.contains("lens")) fitLensFrom(video) else null
            replay(
                VideoFileSource(video),
                video.name,
                watch = mode != "quiet" && mode != "dump",
                lens = fitted,
                dumpEvery = if (mode == "dump") DUMP_EVERY else 0,
            )
        }
        "calibrate" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            WebcamSource(index).use { calibrate(it) }
        }
        "align" -> alignCamera(args.getOrNull(1)?.toIntOrNull() ?: usage(), raw = args.getOrNull(2) == "raw")
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(
                WebcamSource(index),
                "camera $index",
                cameraToken(index),
                watch = args.getOrNull(2) != "quiet",
            )
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
 * The lens, measured from the board this video is of.
 *
 * Its own pass over the file's first frames, and its own source: a `VideoFileSource` decodes
 * forward and cannot rewind, and the fit has to see the footage the run will. Twenty frames is
 * enough — the camera and the board are fixed, so they are twenty samples of one geometry, and a
 * groove hidden by a piece in one frame is visible in the next.
 *
 * Null when the board cannot be found or the fit does not beat an uncorrected picture by the
 * required margin. That gate is `LensFit.ok` and it is deliberately NOT the proof: the bow is
 * what the fit minimises, so only the square offset says whether it helped.
 */
private fun fitLensFrom(video: File): LensModel? {
    VideoFileSource(video).use { probe ->
        val size = probe.delivered
        val fit =
            calibrateFromBoard(
                { use -> probe.next()?.also(use) != null },
                size.width,
                size.height,
            ) { println("  $it") }
        if (fit == null) {
            println("no lens: the board's markers never decoded in the first frames")
            return null
        }
        println(
            "lens from the board: ${fit.evidence}; bow ${"%.5f".format(fit.bowBefore)} → " +
                "${"%.5f".format(fit.bowAfter)}, k1=${"%.4f".format(fit.k1)} k2=${"%.4f".format(fit.k2)}",
        )
        if (fit.rejected != null || !fit.ok) {
            println("no lens: ${fit.rejected ?: "the bow did not improve by the required margin"}")
            return null
        }
        return fit.toModel()
    }
}

/**
 * The rig's optics if they may be applied here, and the REASON printed when they may not.
 *
 * Everything the decision needs sits in one place on purpose: the stored file, the delivered size
 * and the camera it is being asked about. `Undistorter` deliberately has no checks of its own — a
 * `require` on the frame path turns a configuration mistake into a dead tracker — so this is the
 * only gate, and it must never fail quietly.
 *
 * `LensMode.ON` rather than AUTO because the user typed the command. `data/lens/calib.json` was
 * written before a calibration recorded which camera it came from, so its `camera` is empty; AUTO
 * refuses that on principle and ON accepts it, treating the human as the identity check. A file
 * naming a DIFFERENT camera is refused either way.
 */
private fun openLens(
    source: FrameSource,
    camera: String,
    wanted: Boolean,
): Undistorter? {
    val size = source.delivered
    val stored =
        when (val read = decodeLens(File(LENS_CALIBRATION).takeIf { it.isFile }?.readText())) {
            is LensLoad.Ok -> read.calibration
            is LensLoad.Refused -> return refuse(read.reason)
            LensLoad.Absent -> null
        }
    val mode = if (wanted) LensMode.ON else LensMode.OFF
    return when (val verdict = lensFor(stored, mode, camera, size.width, size.height)) {
        is LensLoad.Ok -> {
            val cal = verdict.calibration
            println("lens: ${cal.width}x${cal.height}, rms ${"%.2f".format(cal.rms)} px")
            Undistorter(cal.model(), size.width, size.height)
        }
        is LensLoad.Refused -> refuse(verdict.reason)
        LensLoad.Absent -> refuse("none stored at $LENS_CALIBRATION")
    }
}

private fun refuse(reason: String): Undistorter? {
    println("no lens applied — $reason")
    return null
}

/** What a stored calibration has to name to be reusable here. Size is not identity; this is. */
private fun cameraToken(index: Int): String = "webcam:$index"

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
        "  replay <video.mp4> [quiet|dump] [lens]   drive a recorded clip through the tracker",
        "                             add 'lens' to fit the optics from the board first",
        "  track <camera-index> [quiet]  the same, live",
        "",
        "  The board view opens unless 'quiet' is given: it shows the rectified warp the engine",
        "  reasons about with its per-square verdicts, and STOPS when the engine gets stuck",
        "  (space steps, c continues, s disarms). 'quiet' is for scripted runs.",
    ).forEach(::println)
    exitProcess(2)
}

private fun replay(
    source: FrameSource,
    name: String,
    camera: String? = null,
    watch: Boolean = true,
    dumpEvery: Int = 0,
    lens: LensModel? = null,
) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val console: TrackerLogs = { tag -> ConsoleLog(tag) }
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
        val optics =
            lens?.let { Undistorter(it, source.delivered.width, source.delivered.height) }
                ?: camera?.let { openLens(source, it, wanted = true) }
        val corrected = { source.next()?.let { frame -> optics?.apply(frame) ?: frame } }
        val quad = locateBoard(corrected)
        if (quad == null) {
            println("no board found: the markers never decoded")
            // Nothing takes ownership on this path, because the stages that would are never built.
            optics?.close()
            return
        }
        val geometry = boardGeometryFor(quad)
        val config = TrackerConfig().copy(boardSize = geometry.boardSize)
        println("board located from its markers: ${geometry.boardSize} px warp")
        val publisher = StatusPublisher(scope)
        val frameClock = FrameClock(source.fps, live = camera != null)
        // Held here rather than read back off the stack: `TrackerStack` takes the bus as a
        // constructor argument and does not expose it, and widening a shared seam for one host's
        // debugging window would be the wrong trade.
        val bus = CameraFrameBus(MutableStateFlow(CameraHealth.Up), scope, ::matToImage)
        // `quiet` is what makes this scriptable. With a window open, break-on-stuck is right —
        // a human is watching and wants it to stop — but that same default turns a batch replay
        // into a process waiting forever for a key nobody will press.
        val view = if (watch) TrackerView.openOrNull("chesslab — $name") else null
        if (watch && view == null) println("no display: running without the board view")
        val stack =
            TrackerStack(
                TrackerSeed<Mat>(
                    config = config,
                    geometry = { geometry },
                    corners = null,
                    startFen = STARTPOS,
                    onDecision = { println("decision: ply=${it.ply} ${it.san ?: "-"} decider=${it.decider}") },
                    logs = console,
                    stages = { geo, cfg, store, frameBus, boardBus ->
                        OpenCvStages({ it }, {}, geo, cfg, store, frameBus, boardBus, optics)
                    },
                    // The VIDEO's clock, not this machine's. A replay decodes as fast as it can,
                    // so wall time says how long the decode took and nothing about when a frame
                    // was taken — and the engine ages several of its gates against exactly that.
                    // For a live camera `frameClock` returns the wall clock and this is a no-op.
                    nowMs = frameClock::now,
                ),
                SettingsRepository(MemoryConfigStore, scope),
                publisher,
                // A real converter, where this used to pass `{ null }`: the bus was built,
                // throttled and then handed nothing, so `boardPreview` was permanently empty
                // and the rectified board the engine reasons about was unobservable.
                bus,
                StageTimings(logLine = { println("chesslabPerf: $it") }),
                scope,
                { error("no classifier on the desktop yet — the diff path runs without one") },
            )
        stack.coordinator.applyCalibration(geometry, quad, "desktop", source.delivered)
        val frames = drive(source, stack, bus, publisher, view, frameClock, dumpEvery)
        println("tracked $frames frames of $name at ${"%.2f".format(source.fps)} fps")
        stack.close()
        view?.close()
    }
    scope.cancel()
}

/**
 * Frames in, until the source runs dry or the viewer's window is closed.
 *
 * The view is consulted BEFORE the next frame is pulled, not after: when it stops on a stuck
 * engine, what is on screen has to be the state that caused the stop rather than the one after it.
 */
private fun drive(
    source: FrameSource,
    stack: TrackerStack<Mat>,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    view: TrackerView?,
    clock: FrameClock,
    dumpEvery: Int = 0,
): Int {
    var frames = 0
    while (true) {
        val open = view?.awaitStep(publisher.status.value) ?: true
        val frame = if (open) source.next() else null
        if (frame == null) return frames
        clock.tick()
        stack.coordinator.onFrame(frame, source.delivered)
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

/** Written by `chesslab lens calibrate`, exported to JSON because Kotlin does not read npz. */
private const val LENS_CALIBRATION = "../../data/lens/calib.json"

/** Nine lines per axis, both axes — what `gridLines` reports on every frame. */
private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10

/** Where the visual proof lands. Under tmp/, which is not the corpus. */
private const val PROBE_PATH = "../../tmp/lens-probe.png"

/** Where the quad comparison lands. */
private const val DUMP_EVERY = 150

private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"
