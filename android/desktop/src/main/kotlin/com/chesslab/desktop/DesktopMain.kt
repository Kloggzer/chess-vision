package com.chesslab.desktop

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.CameraHealth
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
    if (args.size < 2 || args[0] != "replay") {
        println("usage: chesslab-desktop replay <video.mp4>")
        exitProcess(2)
    }
    NativeCv.require()
    val video = File(args[1])
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    replay(video)
}

private fun replay(video: File) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val console: TrackerLogs = { tag -> ConsoleLog(tag) }
    VideoFileSource(video).use { source ->
        val config = TrackerConfig()
        val geometry = BoardGeometry(boardSize = source.delivered.width.coerceAtMost(source.delivered.height))
        // Without a calibration there are no corners, and without corners the pipeline waits for
        // markers — exactly as the phone does before its first calibration. Detection comes with
        // the ArUco pass; this entry point exists to prove the graph runs, and it says so.
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
        var frames = 0
        while (true) {
            val frame = source.next() ?: break
            stack.coordinator.onFrame(frame, source.delivered)
            frames += 1
        }
        println("replayed $frames frames of ${video.name} at ${"%.2f".format(source.fps)} fps")
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
