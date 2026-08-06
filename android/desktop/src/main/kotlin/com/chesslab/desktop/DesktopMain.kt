package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.margins4
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import com.chesslab.tracker.geometry.measuredBoardSize
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
        "align" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            // `align 0 raw` measures WITHOUT the lens, which is the comparison that says whether
            // the distortion or the board geometry is the error.
            val lens = if (args.getOrNull(2) == "raw") null else lens()
            WebcamSource(index, lens = lens).use { measureAlignment(it) }
        }
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(WebcamSource(index, lens = lens()), "camera $index")
        }
        else -> usage()
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
    source: FrameSource,
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    val tracker = MarkerTracker()
    // Any board size will do for the DETECTION: `boardCornersForFrame` returns frame-space points,
    // and the size only scales the homography it fits them through.
    val probe = BoardGeometry(boardSize = PROBE_BOARD_SIZE)
    repeat(attempts) {
        val frame = source.next() ?: return null
        boardCornersForFrame(frame, probe, tracker)?.let { return cornersToFlat(it) }
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
    source: FrameSource,
    frames: Int = ALIGN_FRAMES,
) {
    val quad =
        locateBoard(source) ?: run {
            println("no board found: the markers never decoded")
            return
        }
    val geometry =
        BoardGeometry(
            boardSize = measuredBoardSize(quad),
            // NOT BoardGeometry's default. It defaults to margins4(0.0), which is right for a
            // Blender render whose corners ARE the playing field and 6-8 % too large for any quad
            // detected from ArUco, whose markers sit in the label border — the very defect
            // `ClipPipeline`'s comment records. Measured on the rig with 0.0: 64 of 64 squares cut
            // off their grid, worst offset 35.8 px against a 6.2 px limit.
            margin = margins4(DEFAULT_MARKER_MARGIN),
        )
    val corners = cornersFromFlat(quad)
    println("board ${geometry.boardSize} px, margin ${geometry.margin.joinToString { "%.3f".format(it) }} (the stored constant)")
    val worst = mutableListOf<Double>()
    var unread = 0
    var read = 0
    repeat(frames) {
        val frame = source.next() ?: return@repeat
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
}

/** The rig's optics, as `chesslab lens` measured them. Absent is reported, never assumed away. */
private fun lens(): LensCalibration? =
    LensCalibration
        .load(File(LENS_CALIBRATION))
        .onSuccess { println("lens: ${it.width}x${it.height}, rms ${"%.2f".format(it.rms)} px") }
        .onFailure { println("no lens applied — ${it.message ?: it::class.simpleName} at $LENS_CALIBRATION") }
        .getOrNull()

private fun usage(): Nothing {
    println("usage: chesslab-desktop cameras | align <camera-index> [raw] | replay <video.mp4> | track <camera-index>")
    exitProcess(2)
}

private fun replay(
    source: FrameSource,
    name: String,
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
        val quad = locateBoard(source)
        if (quad == null) {
            println("no board found: the markers never decoded")
            return
        }
        val geometry =
            BoardGeometry(
                boardSize = measuredBoardSize(quad),
                // NOT BoardGeometry's default. It defaults to margins4(0.0), which is right for a
                // Blender render whose corners ARE the playing field and 6-8 % too large for any quad
                // detected from ArUco, whose markers sit in the label border — the very defect
                // `ClipPipeline`'s comment records. Measured on the rig with 0.0: 64 of 64 squares cut
                // off their grid, worst offset 35.8 px against a 6.2 px limit.
                margin = margins4(DEFAULT_MARKER_MARGIN),
            )
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
                    stages = { geo, cfg, store, frameBus, boardBus -> OpenCvStages({ it }, {}, geo, cfg, store, frameBus, boardBus) },
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

/** Only the homography's scale; the returned points are in frame space either way. */
private const val PROBE_BOARD_SIZE = 800

/** Frames to judge the alignment over. Two seconds is enough to see a jitter that matters. */
private const val ALIGN_FRAMES = 60

/** Written by `chesslab lens calibrate`, exported to JSON because Kotlin does not read npz. */
private const val LENS_CALIBRATION = "../../data/lens/calib.json"

/** Nine lines per axis, both axes — what `gridLines` reports on every frame. */
private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10
