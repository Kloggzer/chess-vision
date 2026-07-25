package com.chesslab.tracker.pipeline

import android.util.Log
import java.util.Locale

// Per-stage frame timings for `TrackerStatus.stageTimingsMs`.
//
// The app has to measure these: `:core-engine` is under a wall-clock ban (its only notion of time
// is `FrameInput.timestampMs`), which is what makes the clip replay deterministic. The engine
// fills the evidence/veto/score keys; the six below are the frame pipeline's.

private const val NANOS_PER_MS = 1_000_000.0

private const val LOG_INTERVAL_NS = 1_000_000_000L

const val PERF_TAG = "chesslabPerf"

/** The pipeline stages, in the order they run. */
enum class Stage { CONVERT, WARP, GRAY, MOTION, GRID, TOTAL }

/**
 * Accumulates one frame's stage durations and emits at most one `chesslabPerf` line per second.
 *
 * [nowNs] and [logLine] are injected so the throttle is testable without a clock or a device.
 */
class StageTimings(
    private val nowNs: () -> Long = System::nanoTime,
    private val logLine: (String) -> Unit = { Log.d(PERF_TAG, it) },
) {
    private val ms = DoubleArray(Stage.entries.size)
    private var frameStart = 0L
    private var previous = 0L
    private var lastLog = 0L

    fun begin() {
        frameStart = nowNs()
        previous = frameStart
    }

    /** Time since the previous mark — except [Stage.TOTAL], which is time since [begin]. */
    fun mark(stage: Stage) {
        val now = nowNs()
        val from = if (stage == Stage.TOTAL) frameStart else previous
        ms[stage.ordinal] = (now - from) / NANOS_PER_MS
        previous = now
    }

    /** Immutable snapshot for `TrackerStatus.stageTimingsMs`. Never called per frame. */
    fun snapshot(): Map<String, Double> = Stage.entries.associate { it.name.lowercase() to ms[it.ordinal] }

    /** One line per second, so the perf log stays readable at 15-30 fps. The first frame logs. */
    fun maybeLog() {
        val now = nowNs()
        if (lastLog == 0L || now - lastLog >= LOG_INTERVAL_NS) {
            lastLog = now
            logLine(Stage.entries.joinToString(" ") { "${it.name.lowercase()}=${format(ms[it.ordinal])}" })
        }
    }

    private fun format(value: Double): String = String.format(Locale.US, "%.1f", value)
}
