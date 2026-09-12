package com.chesslab.engine.api

/** Kept outside the host so engines do not depend on `:tracker-runtime`. */
interface EngineOps {
    fun onFrame(input: FrameInput): List<TrackerEvent>

    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent>

    fun apply(action: EngineAction): List<TrackerEvent>

    fun status(): TrackerStatus

    fun fen(): String

    /** False skips needless inference, reducing a game from thousands of reads to hundreds. */
    fun wantsCnnRead(): Boolean = true

    /** A candidate is waiting for an observation at or after its frame. */
    fun verifyWaiting(): Boolean = false

    /** Declared once at startup so the host can skip unused per-frame measurements. */
    val reads: FrameReads get() = FrameReads()
}

/** [gridCoverage] costs a measured 7–20 ms per phone frame (`GridLines.kt`). */
data class FrameReads(
    val gridCoverage: Boolean = true,
    val roiMotion: Boolean = true,
)
