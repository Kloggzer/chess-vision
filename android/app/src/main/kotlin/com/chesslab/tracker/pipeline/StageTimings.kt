package com.chesslab.tracker.pipeline

import android.util.Log
import java.util.Locale

// Per-stage frame timings for `TrackerStatus.stageTimingsMs`.
//
// The app has to measure these: `:core-engine` is under a wall-clock ban (its only notion of time
// is `FrameInput.timestampMs`), which is what makes the clip replay deterministic. The engine
// fills the evidence/veto/score keys; the ones below are the analyzer thread's.

private const val NANOS_PER_MS = 1_000_000.0

private const val NANOS_PER_S = 1_000_000_000.0

private const val LOG_INTERVAL_NS = 1_000_000_000L

/** `CameraRate`'s weights, so the two rates on the perf line and the header settle the same way. */
private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

/** A stage that did not run this frame. Never a number — see [StageTimings.begin]. */
private const val NOT_RUN = "-"

const val PERF_TAG = "chesslabPerf"

/**
 * The analyzer thread's stages, in the order they run.
 *
 * [FRAME] is the whole `analyze()` callback and is the only one that can be compared against the
 * frame period; everything else is a slice of it. [TOTAL] ends where the `FrameInput` is ready, so
 * `TOTAL + ENGINE + POST == FRAME` up to rounding.
 *
 * [PUBLISH] and [POST] exist because they were previously measured by nothing at all: the
 * coordinator ran the preview bus BEFORE the timer started and the status publish, observer poke
 * and live-align clone AFTER the last mark, which is why `total + engine` never added up to the
 * observed period.
 */
enum class Stage { PUBLISH, CONVERT, WARP, GRAY, MOTION, GRID, TOTAL, ENGINE, POST, FRAME }

/**
 * Accumulates one frame's stage durations and emits at most one `chesslabPerf` line per second.
 *
 * [nowNs], [cameraFps] and [logLine] are injected so the throttle is testable without a clock or a
 * device.
 */
class StageTimings(
    private val nowNs: () -> Long = System::nanoTime,
    private val cameraFps: () -> Double = { 0.0 },
    private val logLine: (String) -> Unit = { Log.d(PERF_TAG, it) },
) {
    private val ms = DoubleArray(Stage.entries.size)
    private val ran = BooleanArray(Stage.entries.size)
    private var frameStart = 0L
    private var previous = 0L
    private var lastLog = 0L
    private var lastBegin = 0L
    private var fps = 0.0

    /**
     * A new frame starts here — at the top of the analyzer callback, not at the top of the frame
     * pipeline.
     *
     * The per-stage "did it run" flags are cleared, and NOT the durations: a skipped frame runs
     * neither `grayDet` nor the engine, and reporting the previous frame's numbers for them reads
     * as work that happened. [snapshot] keeps the last known value for the debug panel, the log
     * line prints [NOT_RUN].
     */
    fun begin() {
        val now = nowNs()
        // The stage sum is NOT the frame period: CameraX does its own work on this thread before
        // `analyze()` is called. Only the gap between two `begin`s answers "how many frames a
        // second is the analyzer actually getting through".
        if (lastBegin != 0L && now > lastBegin) {
            val instant = NANOS_PER_S / (now - lastBegin)
            fps = if (fps != 0.0) FPS_EMA_OLD * fps + FPS_EMA_NEW * instant else instant
        }
        lastBegin = now
        frameStart = now
        previous = now
        ran.fill(false)
    }

    /** Time since the previous mark — except [Stage.TOTAL] and [Stage.FRAME], measured from [begin]. */
    fun mark(stage: Stage) {
        val now = nowNs()
        val from = if (stage == Stage.TOTAL || stage == Stage.FRAME) frameStart else previous
        ms[stage.ordinal] = (now - from) / NANOS_PER_MS
        ran[stage.ordinal] = true
        previous = now
    }

    /**
     * Immutable snapshot for `TrackerStatus.stageTimingsMs`.
     *
     * Carries the LAST KNOWN value of every stage, including ones that did not run this frame —
     * the debug panel wants a stable set of keys, and a run of skipped frames blanking half of them
     * would be unreadable. The honest per-frame view is the log line.
     */
    fun snapshot(): Map<String, Double> = Stage.entries.associate { it.name.lowercase() to ms[it.ordinal] }

    /**
     * The frame is over — every stage, including the ones after the engine, has run.
     *
     * Called by the coordinator rather than the pipeline, and unconditionally: a SKIPPED frame
     * still costs a convert, a warp and a status publish, and logging only the emitted ones hid
     * that cost entirely whenever the board was dark or the markers were lost.
     */
    fun endFrame() {
        mark(Stage.POST)
        mark(Stage.FRAME)
        maybeLog()
    }

    /** One line per second, so the perf log stays readable at 15-30 fps. The first frame logs. */
    fun maybeLog() {
        val now = nowNs()
        if (lastLog == 0L || now - lastLog >= LOG_INTERVAL_NS) {
            lastLog = now
            val stages = Stage.entries.joinToString(" ") { "${it.name.lowercase()}=${stageValue(it)}" }
            // Two rates, never one: `fps` is what the analyzer gets through and `cam` is what
            // CameraX delivered. Only their difference says whether we are CPU-bound or capped by
            // the sensor's auto-exposure, and a single number has been read both ways.
            logLine("$stages fps=${format(fps)} cam=${format(cameraFps())}")
        }
    }

    private fun stageValue(stage: Stage): String = if (ran[stage.ordinal]) format(ms[stage.ordinal]) else NOT_RUN

    private fun format(value: Double): String = String.format(Locale.US, "%.1f", value)
}
