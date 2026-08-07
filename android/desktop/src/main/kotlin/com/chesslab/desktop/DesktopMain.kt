package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toModel
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.rawQuadOf
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
            replay(VideoFileSource(video), video.name)
        }
        "calibrate" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            WebcamSource(index).use { calibrate(it) }
        }
        "align" -> alignCamera(args.getOrNull(1)?.toIntOrNull() ?: usage(), raw = args.getOrNull(2) == "raw")
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(WebcamSource(index), "camera $index", lens())
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
    val wanted = if (raw) null else lens()
    WebcamSource(index).use { source ->
        undistorterFor(wanted, source).use { optics ->
            val corrected = { source.next()?.let { frame -> optics?.apply(frame) ?: frame } }
            measureAlignment(corrected)
        }
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
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    repeat(attempts) {
        val frame = next() ?: return null
        quadOf(frame)?.let { return it }
    }
    return null
}

/**
 * The stored optics for this source, or null.
 *
 * The size check lives HERE and nowhere else. `Undistorter` deliberately has none — a `require` on
 * the frame path turns a configuration mistake into a dead tracker — so the one place that has both
 * the calibration and the delivered size is the one place that can refuse, and it says why.
 */
private fun undistorterFor(
    calibration: LensCalibration?,
    source: FrameSource,
): Undistorter? {
    val cal = calibration ?: return null
    val size = source.delivered
    if (cal.width != size.width || cal.height != size.height) {
        println(
            "no lens applied — it was measured at ${cal.width}x${cal.height}, " +
                "the camera delivers ${size.width}x${size.height}",
        )
        return null
    }
    return Undistorter(cal.model(), size.width, size.height)
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
    frames: Int = ALIGN_FRAMES,
) {
    val quad =
        locateBoard(next) ?: run {
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
        val verdict = alignmentOf(frame, corners, geometry)
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

/** The rig's optics, as `chesslab lens` measured them. Absent is reported, never assumed away. */
private fun lens(): LensCalibration? =
    LensCalibration
        .load(File(LENS_CALIBRATION))
        .onSuccess { println("lens: ${it.width}x${it.height}, rms ${"%.2f".format(it.rms)} px") }
        .onFailure { println("no lens applied — ${it.message ?: it::class.simpleName} at $LENS_CALIBRATION") }
        .getOrNull()

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
    val raw = source.next()?.let { frame -> quadOf(frame)?.let { squareOffsetOf(frame, it) } }
    val corrected =
        Undistorter(fit.toModel(), size.width, size.height).use { undistorter ->
            source.next()?.let { frame ->
                val fixed = undistorter.apply(frame)
                quadOf(fixed)?.let { squareOffsetOf(fixed, it) }
            }
        }
    println(
        "worst square offset: ${raw?.let { "%.2f".format(it) } ?: "unmeasurable"} px raw → " +
            "${corrected?.let { "%.2f".format(it) } ?: "unmeasurable"} px corrected",
    )
    writeLensProbe(source, fit, File(PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
}

private fun usage(): Nothing {
    listOf(
        "usage: chesslab-desktop <command>",
        "  cameras                    what is attached, as the driver reports it",
        "  calibrate <camera-index>   fit the lens from the board's own grid lines",
        "  align <camera-index> [raw] measure the board against its grid; 'raw' skips the lens",
        "  replay <video.mp4>         drive a recorded clip through the shipping tracker",
        "  track <camera-index>       the same, live",
    ).forEach(::println)
    exitProcess(2)
}

private fun replay(
    source: FrameSource,
    name: String,
    lens: LensCalibration? = null,
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
        val optics = undistorterFor(lens, source)
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
                ),
                SettingsRepository(MemoryConfigStore, scope),
                StatusPublisher(scope),
                CameraFrameBus<ByteArray>(MutableStateFlow(CameraHealth.Up), scope, { null }),
                StageTimings(),
                scope,
                { error("no classifier on the desktop yet — the diff path runs without one") },
            )
        stack.coordinator.applyCalibration(geometry, quad, "desktop", source.delivered)
        var frames = 0
        while (true) {
            val frame = source.next() ?: break
            stack.coordinator.onFrame(frame, source.delivered)
            frames += 1
        }
        println("tracked $frames frames of $name at ${"%.2f".format(source.fps)} fps")
        stack.close()
    }
    scope.cancel()
}

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
private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"
