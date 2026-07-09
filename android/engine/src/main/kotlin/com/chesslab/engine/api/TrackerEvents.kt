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

    /** Illegal-move desync alarm raised (ports e867df1/b80a03c): all commits blocked. */
    data class AlarmRaised(
        val alarm: AlarmState,
    ) : TrackerEvent

    /** Alarm cleared: take-back match, resolving recovery, or user resync. */
    data class AlarmCleared(
        val reason: String,
    ) : TrackerEvent

    /**
     * The user accepted an untracked board change (resync while alarmed) — the game
     * record has a logged discontinuity (ports reset_to_start's decision-log entry).
     */
    data class Discontinuity(
        val reason: String,
    ) : TrackerEvent
}

/**
 * Illegal-move referee alarm (ports tracker.py `self._alarm`): the physical board
 * provably mismatches the game state — every diff interpretation is fiction until
 * a take-back, a conflict-resolving recovery, or a user resync.
 */
data class AlarmState(
    val conflicts: List<String>,
    val guessUci: String?,
)

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
