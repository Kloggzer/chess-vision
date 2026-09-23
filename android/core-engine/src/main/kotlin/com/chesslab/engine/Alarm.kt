package com.chesslab.engine

import com.chesslab.engine.api.AlarmReason
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.IllegalMoveException
import com.chesslab.engine.api.TrackerEvent
import kotlin.math.abs

internal const val ALARM_ILLEGAL_MOVE = "illegal_move"

/** Distinct, so a log row says WHO was wrong. */
internal const val ALARM_MOVE_REFUSED = "illegal_move_refused"

/** A VERIFIED restore: no user correction, no log row. */
internal const val ALARM_BOARD_RESTORED = "board_restored"

private const val CONFLICTS_SHOWN = 4

private const val UCI_SQUARES_LEN = 4

/** An undetected desync is silent and permanent, so the latch is deliberately hard to trip (three DISTINCT
 *  observations, stable conflict set, OCCUPANCY only) and released only by `clearAlarm`. */
internal fun EngineState.onStableMismatch(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    snap: CnnSnapshot,
    conflicts: List<String>,
): List<TrackerEvent> {
    // Both predicates read whichever axis the observation carries: an occupancy-only run zeroed the streak here
    // and silently disarmed the desync response on every shipped model.
    advanceDesyncStreak(snap.seq, conflicts)
    val events = raiseAlarmIfDue(cnn, obs, conflicts)
    val latched = alarm
    note =
        if (latched == null) {
            "CNN check: board deviates (${conflicts.shown()}) — check pieces or resync"
        } else {
            alarmNote(latched)
        }
    return events
}

/** Not before the first commit: the engine has no reference of its own yet, and the latch has no automatic
 *  way out (`2026-08-15-22-48-04` alarmed at t=0.8 s and replayed 0 of 19 plies). */
private val EngineState.alarmable: Boolean get() = alarm == null && history.isNotEmpty()

/** Solange eine Hand im Bild ist, wartet nur der Latch; die Serie laeuft weiter (Blitz braucht das). Eine
 *  Hand ueberm Brett loeste sonst den Alarm aus, den sie erklaert. */
private fun EngineState.alarmDeferred(): Boolean =
    handInFrame() ||
        desyncObs < config.desyncObsN + config.alarmDeferObs ||
        nowS - desyncSince < config.alarmMinS

/** Recovery only ends a standoff when a LEGAL move explains it; when the CNN is simply WRONG (a king read
 *  empty every time) none does. Escalation needs a MOVE-SHAPED contradiction; the only escape is the user. */
internal fun EngineState.desyncEvidence(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
    conflicts: List<String>,
): List<TrackerEvent> {
    advanceDesyncStreak(snap.seq, conflicts)
    val due = alarmable && desyncObs >= config.desyncObsN && !alarmDeferred()
    val guess = if (due) cnn?.guessIllegalMove(board.fen(), snap.obs, config.cnnConfThr) else null
    if (guess != null) {
        val raised = latchAlarm(desyncConflicts.squareNames(), guess)
        note = alarmNote(raised)
        return listOf(raised)
    }
    // Castling (2-and-2) or a single disagreeing square (1-and-0) never has the move shape `guessIllegalMove`
    // needs: a conflict set surviving `desyncStandoffObsN` observations can be neither reconciled nor escalated.
    val standoffDue =
        alarmable &&
            config.desyncStandoffObsN > 0 &&
            desyncObs >= config.desyncStandoffObsN &&
            !alarmDeferred()
    if (standoffDue) {
        val raised = latchAlarm(desyncConflicts.squareNames(), guess = null)
        note = alarmNote(raised)
        return listOf(raised)
    }
    val listed = conflicts.take(CONFLICTS_SHOWN).joinToString(", ")
    note =
        "quiet board but CNN disagrees on $listed — holding reference for " +
        "${pyFixed(nowS - desyncSince, 0)}s ($desyncObs observations)"
    return emptyList()
}

/** The REASON first and short: leading with the squares hid it in brackets the eye never reached. */
private fun EngineState.alarmNote(latched: TrackerEvent.Alarm): String {
    board.alarmReason(latched.guess)?.let { return "Illegal move — ${it.text()}" }
    val what = board.alarmGuessSan(latched.guess) ?: latched.conflicts.shown()
    return "ILLEGAL MOVE? $what — take it back, or resync to accept"
}

/** Count, conflict set and seq dedup are one fact: zeroing the count alone leaves the set to be compared against. */
internal fun EngineState.clearDesyncStreak() {
    desyncObs = 0
    desyncConflicts = 0L
    desyncLastSeq = null
    // A matching or inconclusive look is evidence the board is NOT consistently elsewhere: the resync streak restarts.
    resetResyncVotes()
}

/** DISTINCT observations, not evaluations. A running CORE of squares every look disagreed on:
 *  subset-or-superset let `{a}→{a,b}→{b}` count three. An empty core restarts at ONE, never zero. */
private fun EngineState.advanceDesyncStreak(
    seq: Long,
    conflicts: List<String>,
) {
    if (seq == desyncLastSeq) return
    val current = ofSquares(conflicts)
    val core = current and desyncConflicts
    desyncObs = if (desyncObs > 0 && core != 0L) desyncObs + 1 else 1
    if (desyncObs == 1) desyncSince = nowS
    desyncConflicts = if (desyncObs == 1) current else core
    desyncLastSeq = seq
}

/** **Identity-only conflicts never alarm**: an illegal move changes OCCUPANCY; a stable wrong type is the
 *  known N/B/R gap, and a false alarm declares the board lost. */
private fun EngineState.raiseAlarmIfDue(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    conflicts: List<String>,
): List<TrackerEvent> {
    val due = alarmable && desyncObs >= config.desyncObsN && !alarmDeferred()
    if (!due || !cnn.hasOccupancyConflict(board.fen(), obs, config.cnnConfThr, conflicts)) return emptyList()
    return listOf(latchAlarm(desyncConflicts.squareNames(), cnn.guessIllegalMove(board.fen(), obs, config.cnnConfThr)))
}

/** Reported, not dropped: a source that produced an impossible move has no claim on the position. The
 *  offending UCI rides in `guess`. */
internal fun EngineState.refuseIllegalMove(cause: IllegalMoveException): List<TrackerEvent> {
    val squares = listOf(cause.uci.take(2), cause.uci.drop(2).take(2)).filter { Squares.index(it) >= 0 }
    // Against the position it was attempted IN, which is not always the live board.
    val san = runCatching { Game(cause.fen).alarmGuessSan(cause.uci) }.getOrNull()
    val raised = TrackerEvent.Alarm(ALARM_MOVE_REFUSED, squares, cause.uci, san, AlarmReason.ENGINE_REFUSED)
    alarm = raised
    alarmSince = nowS
    recordRejection(cause.uci, "REFUSED illegal move ${cause.uci} in ${cause.fen}")
    note = "ILLEGAL MOVE REFUSED: ${cause.uci} is not legal in ${cause.fen} — undo or resync"
    return listOf(raised)
}

/** Released only by [clearAlarm] — nothing in the pipeline may heal it silently. */
private fun EngineState.latchAlarm(
    conflicts: List<String>,
    guess: String?,
): TrackerEvent.Alarm {
    // Ohne Zug gibt es keinen Regelgrund: dann weicht nur die Erkennung ab, und das sagt der Code.
    val reason =
        board.alarmReason(guess)
            ?: if (guess == null) AlarmReason.BOARD_MISMATCH else AlarmReason.NOT_LEGAL
    val raised = TrackerEvent.Alarm(ALARM_ILLEGAL_MOVE, conflicts, guess, board.alarmGuessSan(guess), reason)
    alarm = raised
    alarmSince = nowS
    recordRejection(guess ?: "", "ALARM latched on ${conflicts.joinToString(",")}")
    return raised
}

/** Re-derived here because `:core-engine` may not depend on `:core-cnn` (module cycle). */
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
        val reason = alarmReason(guess)?.text() ?: "illegal move suspected"
        "${piece.uppercaseChar()} $squares ($reason)"
    }
}

/** Ordered by what the player must do: who is to move outranks being in check. */
internal fun Game.alarmReason(guess: String?): AlarmReason? {
    if (guess == null || guess.length < UCI_SQUARES_LEN) return null
    val from = Squares.index(guess.substring(0, 2).lowercase())
    val to = Squares.index(guess.substring(2, UCI_SQUARES_LEN).lowercase())
    val piece = if (from < 0 || to < 0) null else pieceCharAt(from)
    if (piece == null) return null
    val castling =
        piece.uppercaseChar() == 'K' &&
            abs(from % Squares.N - to % Squares.N) == 2 &&
            !hasCastlingRights(piece.isUpperCase())
    return when {
        castling -> AlarmReason.NO_CASTLING
        piece.isUpperCase() != whiteToMove ->
            if (whiteToMove) AlarmReason.WHITE_TO_MOVE else AlarmReason.BLACK_TO_MOVE
        result().inCheck -> AlarmReason.IN_CHECK
        else -> null
    }
}

internal fun AlarmReason.text(): String =
    when (this) {
        AlarmReason.NO_CASTLING -> "castling not available"
        AlarmReason.WHITE_TO_MOVE -> "it is White to move"
        AlarmReason.BLACK_TO_MOVE -> "it is Black to move"
        AlarmReason.IN_CHECK -> "you are in check"
        AlarmReason.NOT_LEGAL -> "illegal move suspected"
        AlarmReason.BOARD_MISMATCH -> "the board and the app disagree"
        AlarmReason.ENGINE_REFUSED -> "the app was handed a move it cannot play"
    }

private fun List<String>.shown(): String = take(CONFLICTS_SHOWN).joinToString(", ") + if (size > CONFLICTS_SHOWN) "…" else ""
