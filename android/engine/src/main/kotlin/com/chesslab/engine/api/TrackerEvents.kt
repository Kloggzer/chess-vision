package com.chesslab.engine.api

/**
 * Events emitted by TrackerEngine during operation.
 * Consumed by phases 04–06.
 */
sealed interface TrackerEvent {
    data class MoveCommitted(
        val san: String,
        val fen: String,
        val decision: Decision,
    ) : TrackerEvent

    data class StateChanged(
        val state: TrackerState,
    ) : TrackerEvent
}

enum class TrackerState {
    WAITING_BOARD,
    TRACKING,
    OCCLUDED,
    STUCK,
    VERIFYING,
}

/** Decision provenance matching tracker.py:1777. */
data class Decision(
    val decider: String,
    val reason: String,
    val best: Double,
    val second: Double,
    val margin: Double,
    val changed: List<String>,
    val shadowVeto: List<String>,
    val occluded: List<String>,
    val priorUsed: Boolean,
)
