package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.cornersToFlat
import com.chesslab.tracker.camera.CameraHealth
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
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(WebcamSource(index), "camera $index")
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

private fun usage(): Nothing {
    println("usage: chesslab-desktop cameras | replay <video.mp4> | track <camera-index>")
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
        val geometry = BoardGeometry(boardSize = measuredBoardSize(quad))
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
