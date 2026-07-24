package com.chesslab.engine.api

// TrackerEvent.kt — everything the engine tells the outside world.
sealed interface TrackerEvent {
    data class MoveCommitted(
        val uci: String,
        val san: String,
        val fenAfter: String,
        val decider: String,
        val priorUsed: Boolean,
    ) : TrackerEvent

    data class SequenceCommitted(
        val ucis: List<String>,
        val sans: List<String>,
        val fenAfter: String,
        val decider: String,
    ) : TrackerEvent

    data class Stuck(
        val reason: String,
    ) : TrackerEvent

    data class Alarm(
        val kind: String,
        val conflicts: List<String>,
        val guess: String?,
        val guessSan: String?,
    ) : TrackerEvent

    data class AlarmCleared(
        val reason: String,
    ) : TrackerEvent

    data object ReAnchored : TrackerEvent

    data class Note(
        val text: String,
    ) : TrackerEvent

    data class PromotionPending(
        val from: String,
        val to: String,
    ) : TrackerEvent
}
