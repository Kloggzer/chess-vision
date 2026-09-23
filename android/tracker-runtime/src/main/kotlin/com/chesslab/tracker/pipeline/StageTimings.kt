package com.chesslab.tracker.pipeline

import java.util.Locale

// Measured here: `:core-engine` has no wall clock, which is what makes the clip replay deterministic.

private const val NANOS_PER_MS = 1_000_000.0

private const val NANOS_PER_S = 1_000_000_000.0

private const val LOG_INTERVAL_NS = 1_000_000_000L

private const val FPS_EMA_OLD = 0.9

private const val FPS_EMA_NEW = 0.1

/** Never a number — see [StageTimings.begin]. */
private const val NOT_RUN = "-"

const val PERF_TAG = "chesslabPerf"

/** [FRAME] is the whole callback, the only one comparable with the frame period; `TOTAL + ENGINE + POST == FRAME`.
 *  [LENS] stands alone: a folded cost is one nobody can decide about. [PUBLISH]/[POST] were measured by nothing. */
enum class Stage { PUBLISH, CONVERT, LENS, WARP, GRAY, MOTION, GRID, TOTAL, ENGINE, POST, FRAME }

/** At most one `chesslabPerf` line per second. [nowNs], [cameraFps], [logLine] are injected for tests. */
class StageTimings(
    private val nowNs: () -> Long = System::nanoTime,
    private val logLine: (String) -> Unit = {},
) {
    /** The stack's drop counters: the 2026-08-08 cadence regression was invisible because nothing counted refusals. */
    @Volatile
    var extras: (() -> String)? = null

    private val ms = DoubleArray(Stage.entries.size)
    private val ran = BooleanArray(Stage.entries.size)
    private val everRan = BooleanArray(Stage.entries.size)
    private var frameStart = 0L
    private var previous = 0L
    private var lastLog = 0L
    private var lastBegin = 0L
    private var lastEnd = 0L
    private var fps = 0.0
    private var idle = 0.0

    /** Clears the "did it run" flags, NOT the durations: a skipped frame must not report the previous frame's
     *  numbers as work. [snapshot] keeps the last value, the log line prints [NOT_RUN]. */
    fun begin() {
        val now = nowNs()
        // CameraX works on this thread before `analyze()`: only the gap between two `begin`s is the real rate.
        if (lastBegin != 0L && now > lastBegin) {
            val instant = NANOS_PER_S / (now - lastBegin)
            fps = if (fps != 0.0) FPS_EMA_OLD * fps + FPS_EMA_NEW * instant else instant
        }
        // Idle time answers camera-bound vs CPU-bound: near zero we are the bottleneck, well above it the sensor
        // is (auto-exposure stretching the period), and no pipeline work buys a frame.
        if (lastEnd != 0L && now > lastEnd) {
            val gap = (now - lastEnd) / NANOS_PER_MS
            idle = if (idle != 0.0) FPS_EMA_OLD * idle + FPS_EMA_NEW * gap else gap
        }
        lastBegin = now
        frameStart = now
        previous = now
        ran.fill(false)
    }

    /** A restart's gap between two [begin]s is no frame period; the EMA read it as idle time. */
    fun onFeedStopped() {
        lastBegin = 0L
        lastEnd = 0L
        fps = 0.0
        idle = 0.0
    }

    fun mark(stage: Stage) {
        val now = nowNs()
        val from = if (stage == Stage.TOTAL || stage == Stage.FRAME) frameStart else previous
        ms[stage.ordinal] = (now - from) / NANOS_PER_MS
        ran[stage.ordinal] = true
        everRan[stage.ordinal] = true
        previous = now
    }

    /** A stage that never ran is ABSENT, never 0.0: `LENS` is off by default, and zero reads as a free remap. */
    fun snapshot(): Map<String, Double> = Stage.entries.filter { everRan[it.ordinal] }.associate { it.name.lowercase() to ms[it.ordinal] }

    /** Unconditional: a SKIPPED frame still costs a convert, a warp and a status publish. */
    fun endFrame(
        skipNote: String? = null,
        luma: Double = -1.0,
        noise: Double = NOISE_UNMEASURED,
    ) {
        mark(Stage.POST)
        mark(Stage.FRAME)
        maybeLog(skipNote, luma, noise)
        lastEnd = nowNs()
    }

    fun maybeLog(
        skipNote: String? = null,
        luma: Double = -1.0,
        noise: Double = NOISE_UNMEASURED,
    ) {
        val now = nowNs()
        if (lastLog == 0L || now - lastLog >= LOG_INTERVAL_NS) {
            lastLog = now
            val stages = Stage.entries.joinToString(" ") { "${it.name.lowercase()}=${stageValue(it)}" }
            // `skip=` names which exit took a skipped frame, `luma=` carries the dark gate's own input.
            val why = if (skipNote != null) " skip=$skipNote" else " skip=-"
            val lum = if (luma >= 0) " luma=${format(luma)}" else ""
            // `luma` is light on the sensor, `noise` what survives the cell mean — an exposure change trades them.
            val floor = if (noise >= 0) " noise=${formatFine(noise)}" else ""
            val extra = extras?.invoke()?.let { " $it" }.orEmpty()
            logLine("$stages fps=${format(fps)} idle=${format(idle)}$why$lum$floor$extra")
        }
    }

    private fun stageValue(stage: Stage): String = if (ran[stage.ordinal]) format(ms[stage.ordinal]) else NOT_RUN

    private fun format(value: Double): String = String.format(Locale.US, "%.1f", value)

    /** Between 0 and a few grey levels; one decimal would quantise it away. */
    private fun formatFine(value: Double): String = String.format(Locale.US, "%.2f", value)
}
