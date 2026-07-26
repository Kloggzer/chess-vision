package com.chesslab.tracker.pipeline

import android.util.Log
import java.util.Locale

// Per-stage frame timings for `TrackerStatus.stageTimingsMs`.
//
// The app has to measure these: `:core-engine` is under a wall-clock ban (its only notion of time
// is `FrameInput.timestampMs`), which is what makes the clip replay deterministic. The engine
// fills the evidence/veto/score keys; the six below are the frame pipeline's.

private const val NANOS_PER_MS = 1_000_000.0

private const val NANOS_PER_S = 1_000_000_000.0

private const val LOG_INTERVAL_NS = 1_000_000_000L

/** `CameraRate`'s weights, so the two rates on the perf line and the header settle the same way. */
private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

const val PERF_TAG = "chesslabPerf"

/**
 * The analyzer thread's stages, in the order they run.
 *
 * [TOTAL] is the FRAME PIPELINE's total and [ENGINE] is what runs after it on the same thread, so
 * the two together are the frame budget. Splitting them is why the 2026-07-26 measurement could
 * be read at all: the pipeline was 32 ms of a 98 ms frame, and a panel showing only the 32 would
 * have said the loop was three times faster than it was.
 */
enum class Stage { CONVERT, WARP, GRAY, MOTION, GRID, TOTAL, ENGINE }

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
    private var lastBegin = 0L
    private var fps = 0.0

    fun begin() {
        val now = nowNs()
        // The stage sum is NOT the frame period: CameraX does its own work on this thread before
        // `analyze()` is called, and the coordinator does more after `TOTAL`. Only the gap between
        // two `begin`s answers "how many frames a second is the analyzer actually getting through".
        if (lastBegin != 0L && now > lastBegin) {
            val instant = NANOS_PER_S / (now - lastBegin)
            fps = if (fps != 0.0) FPS_EMA_OLD * fps + FPS_EMA_NEW * instant else instant
        }
        lastBegin = now
        frameStart = now
        previous = now
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

    /**
     * The engine has returned — the frame is over. Called by the coordinator, not the pipeline,
     * because [Stage.ENGINE] happens after `FrameInput` is handed on.
     */
    fun endOfFrame() {
        mark(Stage.ENGINE)
        maybeLog()
    }

    /** One line per second, so the perf log stays readable at 15-30 fps. The first frame logs. */
    fun maybeLog() {
        val now = nowNs()
        if (lastLog == 0L || now - lastLog >= LOG_INTERVAL_NS) {
            lastLog = now
            val stages = Stage.entries.joinToString(" ") { "${it.name.lowercase()}=${format(ms[it.ordinal])}" }
            logLine("$stages fps=${format(fps)}")
        }
    }

    private fun format(value: Double): String = String.format(Locale.US, "%.1f", value)
}
