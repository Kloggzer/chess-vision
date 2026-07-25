package com.chesslab.tracker.service

import com.chesslab.engine.api.DebugPayload
import com.chesslab.engine.api.TrackerStatus

/** The order the timings panel renders, warp to total. Absent stages are simply not shown. */
val STAGE_ORDER = listOf("warp", "gray", "motion", "grid", "evidence", "veto", "score", "cnn", "total")

/** Phase 09's acceptance line is >= 15 fps; `total` above this is rendered red. */
const val FRAME_BUDGET_MS = 66.0

/** Rolling window of the last/median/p95 table. At ~10 Hz publishing that is about 12 s. */
private const val TIMING_WINDOW = 120

/** The fps median window, in samples of the 10 Hz status flow (~5 s). */
private const val FPS_WINDOW = 50

private const val P95 = 0.95

private const val MEDIAN = 0.5

data class StageStat(
    val stage: String,
    val last: Double,
    val median: Double,
    val p95: Double,
)

/**
 * Everything the six debug panels render. It is built from the published snapshot alone plus the
 * app-side runtime probe — no second flow, no binder callback, no broadcast (`entry.md`).
 */
data class DebugState(
    val status: TrackerStatus,
    val payload: DebugPayload,
    val stages: List<StageStat>,
    val fps: Double,
    val fpsMedian: Double,
)

/**
 * Folds the published status into the debug view model, or returns `null`.
 *
 * `null` is the whole cost gate: [TrackerStatus.debug] is itself `null` unless `debugEnabled` was
 * armed (`TrackerEngine.setDebugEnabled`), so with the screen closed this allocates nothing, keeps
 * no history and produces no state at all. The rolling timing window is the only thing it owns,
 * and it is reset whenever the gate closes so a reopened screen never shows numbers from a
 * previous session.
 */
class DebugPayloadAssembler(
    private val window: Int = TIMING_WINDOW,
) {
    private val timings = ArrayDeque<Map<String, Double>>()
    private val fpsSamples = ArrayDeque<Double>()

    fun assemble(status: TrackerStatus?): DebugState? {
        val payload = status?.debug
        if (payload == null) {
            reset()
            return null
        }
        push(timings, status.stageTimingsMs, window)
        push(fpsSamples, status.fps, FPS_WINDOW)
        return DebugState(
            status = status,
            payload = payload,
            stages = stageStats(),
            fps = status.fps,
            fpsMedian = median(fpsSamples.toList()),
        )
    }

    fun reset() {
        timings.clear()
        fpsSamples.clear()
    }

    private fun stageStats(): List<StageStat> {
        val newest = timings.lastOrNull().orEmpty()
        // Ordered by STAGE_ORDER first so the frame reads warp -> total, then whatever the
        // pipeline invented on top, so a new stage cannot silently disappear from the panel.
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

/** [values] need not be sorted. */
internal fun median(values: List<Double>): Double = percentile(values.sorted(), MEDIAN)

/** [sorted] must be ascending; the nearest-rank definition, which is what a perf table wants. */
internal fun percentile(
    sorted: List<Double>,
    fraction: Double,
): Double {
    if (sorted.isEmpty()) return 0.0
    val index = ((sorted.size - 1) * fraction).toInt()
    return sorted[index]
}
