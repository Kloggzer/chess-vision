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

    /** A promotion needs the user's piece choice (no safeguard active). Consumed by phase 04. */
    data class PromotionPending(
        val fromSquare: String,
        val toSquare: String,
    ) : TrackerEvent

    /**
     * Implicit human feedback: an undone move is a hard-negative record
     * (ports tracker.py:2673 undo + :1777 provenance). Consumed by phase 07.
     */
    data class FeedbackRecorded(
        val san: String,
        val uci: String,
        val label: String,
        val decision: Decision,
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
