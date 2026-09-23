package com.chesslab.tracker.pipeline

// Measured here: `:core-engine` has no wall clock and cannot count frames it never received.

private const val NANOS_PER_S = 1_000_000_000.0

/** The engine's `_fps` EMA weights, so both numbers settle the same way. */
private const val EMA_OLD = 0.9

private const val EMA_NEW = 0.1

/** [nowNs] is injected so the smoothing is testable without a device. */
class CameraRate(
    private val nowNs: () -> Long = System::nanoTime,
) {
    @Volatile
    var fps: Double = 0.0
        private set

    private var previousNs = 0L

    /** Before anything can decide to drop it. */
    fun onFrame() {
        val now = nowNs()
        val previous = previousNs
        previousNs = now
        if (previous == 0L) return
        val dt = (now - previous) / NANOS_PER_S
        if (dt <= 0.0) return
        val instant = 1.0 / dt
        fps = if (fps != 0.0) EMA_OLD * fps + EMA_NEW * instant else instant
    }

    /** A released camera is not a slow one: the gap across a stop must not count as a frame time. */
    fun reset() {
        previousNs = 0L
        fps = 0.0
    }
}
