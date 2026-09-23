package com.chesslab.engine.api

/** Outside the host, so engines do not depend on `:tracker-runtime`. */
interface EngineOps {
    fun onFrame(input: FrameInput): List<TrackerEvent>

    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent>

    fun apply(action: EngineAction): List<TrackerEvent>

    fun status(): TrackerStatus

    fun fen(): String

    /** False skips needless inference: a game drops from thousands of reads to hundreds. */
    fun wantsCnnRead(): Boolean = true

    fun verifyWaiting(): Boolean = false

    /** Declared once at startup, so the host can skip unused per-frame measurements. */
    val reads: FrameReads get() = FrameReads()
}

/** [gridCoverage] costs a measured 7–20 ms per phone frame. */
data class FrameReads(
    val gridCoverage: Boolean = true,
    val roiMotion: Boolean = true,
)
