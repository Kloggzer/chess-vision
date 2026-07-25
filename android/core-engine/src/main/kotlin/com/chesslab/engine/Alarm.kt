package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.TrackerEvent
import kotlin.math.abs

internal const val ALARM_ILLEGAL_MOVE = "illegal_move"

/** [TrackerEvent.AlarmCleared] reason of a VERIFIED restore (no user correction, no log row). */
internal const val ALARM_BOARD_RESTORED = "board_restored"

/** `", ".join(conflicts[:4])` — the notes list at most four squares. */
private const val CONFLICTS_SHOWN = 4

private const val UCI_SQUARES_LEN = 4

/**
 * The illegal-move latch (`_cnn_tick`'s desync streak + `_clear_alarm`).
 *
 * An undetected desync is silent and permanent: once the game state and the physical board
 * disagree, every diff-vs-reference reading afterwards is fiction. The latch is therefore
 * deliberately hard to trip — three DISTINCT observations with a stable conflict set, and only when
 * OCCUPANCY disagrees — and impossible to release except through `clearAlarm`.
 */
internal fun EngineState.onStableMismatch(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    snap: CnnSnapshot,
    hasIdentity: Boolean,
    conflicts: List<String>,
): List<TrackerEvent> {
    val events =
        if (hasIdentity) {
            advanceDesyncStreak(snap.seq, conflicts)
            raiseAlarmIfDue(cnn, obs, conflicts)
        } else {
            // Occupancy-only mode has no identity axis to be stable about and never alarms.
            desyncObs = 0
            desyncConflicts = 0L
            emptyList()
        }
    val latched = alarm
    note =
        if (latched == null) {
            "CNN check: board deviates (${conflicts.shown()}) — check pieces or resync"
        } else {
            val what = board.alarmGuessSan(latched.guess) ?: latched.conflicts.shown()
            "ILLEGAL MOVE? $what — take it back, or resync to accept"
        }
    return events
}

/**
 * Spec 11 seq contract: count DISTINCT observations, not evaluations — `desyncObsN` means
 * "persistent over seconds", not "evaluated three times". An unstable conflict set restarts the
 * streak at ONE, never at zero: this observation is itself evidence.
 */
private fun EngineState.advanceDesyncStreak(
    seq: Long,
    conflicts: List<String>,
) {
    if (seq == desyncLastSeq) return
    val current = ofSquares(conflicts)
    val stable = current == desyncConflicts || current.without(desyncConflicts) == 0L || desyncConflicts.without(current) == 0L
    desyncObs = if (stable) desyncObs + 1 else 1
    desyncConflicts = current
    desyncLastSeq = seq
}

/**
 * **Identity-only conflicts never alarm.** An illegal move virtually always changes OCCUPANCY
 * somewhere; a stable wrong-piece-type reading is the known N/B/R gap (~40% identity precision),
 * and counting it rang the alarm on perfectly regular boards.
 */
private fun EngineState.raiseAlarmIfDue(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    conflicts: List<String>,
): List<TrackerEvent> {
    val due = alarm == null && desyncObs >= config.desyncObsN
    val fen = board.fen()
    if (!due || !cnn.hasOccupancyConflict(fen, obs, config.cnnConfThr, conflicts)) return emptyList()
    val guess = cnn.guessIllegalMove(fen, obs, config.cnnConfThr)
    val raised = TrackerEvent.Alarm(ALARM_ILLEGAL_MOVE, conflicts, guess, board.alarmGuessSan(guess))
    alarm = raised
    alarmSince = nowS
    return listOf(raised)
}

/**
 * `_build_alarm_guess_san` — the human-readable suspicion the alarm card renders. Re-derived here
 * because `:core-engine` may not depend on `:core-cnn` (module cycle), same as `expectedOccupancy`.
 */
internal fun Game.alarmGuessSan(guess: String?): String? {
    if (guess == null || guess.length < UCI_SQUARES_LEN) return null
    val from = Squares.index(guess.substring(0, 2).lowercase())
    val to = Squares.index(guess.substring(2, UCI_SQUARES_LEN).lowercase())
    if (from < 0 || to < 0) return null
    val squares = "${Squares.ALL[from]}->${Squares.ALL[to]}"
    val piece = pieceCharAt(from)
    return if (piece == null) {
        squares
    } else {
        val castling =
            piece.uppercaseChar() == 'K' &&
                abs(from % Squares.N - to % Squares.N) == 2 &&
                !hasCastlingRights(piece.isUpperCase())
        val reason = if (castling) "castling not available" else "illegal move suspected"
        "${piece.uppercaseChar()} $squares ($reason)"
    }
}

private fun List<String>.shown(): String = take(CONFLICTS_SHOWN).joinToString(", ") + if (size > CONFLICTS_SHOWN) "…" else ""
