package com.chesslab.engine.still

import com.chesslab.engine.api.TrackerEvent

/**
 * When "I cannot explain this" becomes "the board is wrong".
 *
 * A single reading that explains nothing is never enough — a hand, a blurred frame, a piece in
 * flight all look like that. It takes a run of DISTINCT readings with a stable conflict set and no
 * hand in sight, which is the same evidence the diff engine's desync streak collects, arrived at
 * from the other side.
 *
 * The conflicts come from occupancy and colour only ([MoveExplainer.conflicts]): a rook read as a
 * knight is the model's known weakness, and an alarm built on it would fire on a correct board.
 */
internal class StillAlarm {
    private var unexplained = 0
    private var lastSeq = -1L
    private var lastConflicts: List<String> = emptyList()

    var current: TrackerEvent.Alarm? = null
        private set

    /** Note one reading that explained nothing; returns the alarm if this is the one that latches. */
    fun onUnclear(
        seq: Long,
        conflicts: List<String>,
        covered: Int,
        plies: Int,
        needed: Int,
    ): List<TrackerEvent> {
        if (seq == lastSeq) return emptyList()
        lastSeq = seq
        val stable =
            lastConflicts.isEmpty() ||
                conflicts.containsAll(lastConflicts) ||
                lastConflicts.containsAll(conflicts)
        unexplained = if (stable) unexplained + 1 else 1
        lastConflicts = conflicts
        val due =
            current == null &&
                plies > 0 &&
                conflicts.isNotEmpty() &&
                covered <= HAND_LIMIT &&
                unexplained >= needed
        if (!due) return emptyList()
        val raised = TrackerEvent.Alarm(KIND, conflicts, guess = null, guessSan = null)
        current = raised
        return listOf(raised)
    }

    /** The board made sense again — or a human said so. */
    fun clear(): List<TrackerEvent> {
        unexplained = 0
        lastConflicts = emptyList()
        if (current == null) return emptyList()
        current = null
        return listOf(TrackerEvent.AlarmCleared(REASON_RESTORED))
    }

    fun describe(): String = "board deviates on ${lastConflicts.take(SHOWN).joinToString(", ")} — check pieces or resync"

    private companion object {
        /** Reused rather than invented: `MoveAnnouncer` already speaks this one. */
        const val KIND = "illegal_move"
        const val REASON_RESTORED = "board_restored"

        /** Above this many covered squares a hand explains the disagreement, so no alarm. */
        const val HAND_LIMIT = 6
        const val SHOWN = 4
    }
}
