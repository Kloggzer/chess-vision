package com.chesslab.tracker.service

import com.chesslab.engine.api.DebugPayload
import com.chesslab.engine.api.TrackerStatus

/** Warp to total. Absent stages are simply not shown. */
val STAGE_ORDER = listOf("warp", "gray", "motion", "grid", "evidence", "veto", "score", "cnn", "total")

const val FRAME_BUDGET_MS = 66.0

/** At ~10 Hz publishing that is about 12 s. */
private const val TIMING_WINDOW = 120

private const val FPS_WINDOW = 50

private const val P95 = 0.95

private const val MEDIAN = 0.5

data class StageStat(
    val stage: String,
    val last: Double,
    val median: Double,
    val p95: Double,
)

/** From the published snapshot plus the runtime probe alone — no second flow, no binder callback. */
data class DebugState(
    val status: TrackerStatus,
    val payload: DebugPayload,
    val stages: List<StageStat>,
    /** Zero while the pipeline discards every delivered frame. */
    val fps: Double,
    val fpsMedian: Double,
    /** Frames CameraX DELIVERED: the pair tells a dead camera from a discarded feed. */
    val cameraFps: Double,
    val cameraFpsMedian: Double,
)

/** `null` is the whole cost gate: with the debug screen closed this allocates nothing. The window resets when the
 *  gate closes, so a reopened screen never shows a previous session's numbers. */
class DebugPayloadAssembler(
    private val window: Int = TIMING_WINDOW,
) {
    private val timings = ArrayDeque<Map<String, Double>>()
    private val fpsSamples = ArrayDeque<Double>()
    private val cameraFpsSamples = ArrayDeque<Double>()

    fun assemble(status: TrackerStatus?): DebugState? {
        val payload = status?.debug
        if (payload == null) {
            reset()
            return null
        }
        push(timings, status.stageTimingsMs, window)
        push(fpsSamples, status.fps, FPS_WINDOW)
        push(cameraFpsSamples, status.cameraFps, FPS_WINDOW)
        return DebugState(
            status = status,
            payload = payload,
            stages = stageStats(),
            fps = status.fps,
            fpsMedian = median(fpsSamples.toList()),
            cameraFps = status.cameraFps,
            cameraFpsMedian = median(cameraFpsSamples.toList()),
        )
    }

    fun reset() {
        timings.clear()
        fpsSamples.clear()
        cameraFpsSamples.clear()
    }

    private fun stageStats(): List<StageStat> {
        val newest = timings.lastOrNull().orEmpty()
        // STAGE_ORDER first, then whatever else, so a new stage cannot silently disappear from the panel.
        val names = STAGE_ORDER.filter { it in newest } + newest.keys.filterNot { it in STAGE_ORDER }.sorted()
        return names.map { stage ->
            val series = timings.mapNotNull { it[stage] }.sorted()
            StageStat(stage, newest[stage] ?: 0.0, median(series), percentile(series, P95))
        }
    }
}

private fun <T> push(
    queue: ArrayDeque<T>,
    item: T,
    cap: Int,
) {
    queue.addLast(item)
    while (queue.size > cap) queue.removeFirst()
}

internal fun median(values: List<Double>): Double = percentile(values.sorted(), MEDIAN)

/** Nearest-rank. */
internal fun percentile(
    sorted: List<Double>,
    fraction: Double,
): Double {
    if (sorted.isEmpty()) return 0.0
    val index = ((sorted.size - 1) * fraction).toInt()
    return sorted[index]
}
