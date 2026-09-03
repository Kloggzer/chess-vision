package com.chesslab.engine

import com.chesslab.engine.api.AlarmReason
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.IllegalMoveException
import com.chesslab.engine.api.TrackerEvent
import kotlin.math.abs

internal const val ALARM_ILLEGAL_MOVE = "illegal_move"

/** Kind of the latch [refuseIllegalMove] raises — distinct so a log row says WHO was wrong. */
internal const val ALARM_MOVE_REFUSED = "illegal_move_refused"

/** [TrackerEvent.AlarmCleared] reason of a VERIFIED restore (no user correction, no log row). */
internal const val ALARM_BOARD_RESTORED = "board_restored"

/** The notes list at most four squares. */
private const val CONFLICTS_SHOWN = 4

private const val UCI_SQUARES_LEN = 4

/**
 * The illegal-move latch. An undetected desync is silent and permanent — once game state and physical
 * board disagree, every diff-vs-reference reading is fiction — so it is deliberately hard to trip
 * (three DISTINCT observations, stable conflict set, OCCUPANCY only) and released only by `clearAlarm`.
 */
internal fun EngineState.onStableMismatch(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    snap: CnnSnapshot,
    conflicts: List<String>,
): List<TrackerEvent> {
    // The discipline lives in the two predicates below, and both read whichever axis the observation
    // carries: an occupancy-only run used to zero the streak here and never alarm, silently disarming
    // the whole desync response on every model this app ships.
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

/**
 * May the board be declared lost at all? Not before the first commit: until a ply is on the record the
 * engine has no reference of its own, only the position it was handed. The latch has no automatic way
 * out — `2026-08-15-22-48-04` alarmed at video t=0.8 s and replayed 0 of 19 plies.
 */
private val EngineState.alarmable: Boolean get() = alarm == null && history.isNotEmpty()

/**
 * Haelt das Einrasten an, solange eine Hand im Bild ist; die Serie laeuft weiter (Blitz braucht das),
 * nur der Latch wartet. Der Alarmpfad war die einzige Stelle, die `handInFrame` nie gefragt hat: eine
 * Hand ueberm Brett loeste den Alarm aus, den sie erklaert (User, 2026-08-24).
 */
private fun EngineState.alarmDeferred(): Boolean =
    handInFrame() ||
        desyncObs < config.desyncObsN + config.alarmDeferObs ||
        nowS - desyncSince < config.alarmMinS

/**
 * The quiet-re-anchor veto fired — bound it: recovery only ends the standoff when a LEGAL move explains
 * the observation, and when the CNN is simply WRONG (S17-SIM-2: the king on g1 read empty every time)
 * none does. Escalation still needs a MOVE-SHAPED contradiction, and the only escape is the USER.
 */
internal fun EngineState.desyncEvidence(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
    conflicts: List<String>,
): List<TrackerEvent> {
    advanceDesyncStreak(snap.seq, conflicts)
    val due = alarmable && desyncObs >= config.desyncObsN && !alarmDeferred()
    val guess = if (due) cnn?.guessIllegalMove(board.fen(), snap.obs, config.cnnConfThr) else null
    if (guess != null) {
        val raised = latchAlarm(conflicts, guess)
        note = alarmNote(raised)
        return listOf(raised)
    }
    // The standoff bound: a conflict set surviving `desyncStandoffObsN` distinct observations is a
    // board the engine can neither reconcile nor escalate, because castling (2-and-2) or a single
    // disagreeing square (1-and-0) never has the move shape `guessIllegalMove` needs.
    val standoffDue =
        alarmable &&
            config.desyncStandoffObsN > 0 &&
            desyncObs >= config.desyncStandoffObsN &&
            !alarmDeferred()
    if (standoffDue) {
        val raised = latchAlarm(conflicts, guess = null)
        note = alarmNote(raised)
        return listOf(raised)
    }
    val listed = conflicts.take(CONFLICTS_SHOWN).joinToString(", ")
    note =
        "quiet board but CNN disagrees on $listed — holding reference for " +
        "${pyFixed(nowS - desyncSince, 0)}s ($desyncObs observations)"
    return emptyList()
}

/**
 * The line the player reads while a game is running, so the REASON comes first and short — leading
 * with the squares hid it in brackets the eye never reached (User, 2026-08-26). Where the engine does
 * not know why, the conflict list and what to do about it are the most useful thing it has.
 */
private fun EngineState.alarmNote(latched: TrackerEvent.Alarm): String {
    board.alarmReason(latched.guess)?.let { return "Illegal move — ${it.text()}" }
    val what = board.alarmGuessSan(latched.guess) ?: latched.conflicts.shown()
    return "ILLEGAL MOVE? $what — take it back, or resync to accept"
}

/**
 * Drop the streak whole — count, conflict set and seq dedup are one fact ("the observations so far
 * disagreed about THESE squares"), so zeroing the count alone leaves the set behind for the next
 * observation to be compared against.
 */
internal fun EngineState.clearDesyncStreak() {
    desyncObs = 0
    desyncConflicts = 0L
    desyncLastSeq = null
    // The resync candidate rides the same fact: a matching or inconclusive observation is
    // evidence the board is NOT consistently elsewhere, so the consecutive-looks streak restarts.
    resetResyncVotes()
}

/**
 * Count DISTINCT observations, not evaluations — `desyncObsN` means "persistent over seconds", not
 * "evaluated three times". An unstable conflict set restarts the streak at ONE, never at zero: this
 * observation is itself evidence.
 */
private fun EngineState.advanceDesyncStreak(
    seq: Long,
    conflicts: List<String>,
) {
    if (seq == desyncLastSeq) return
    val current = ofSquares(conflicts)
    val stable = current == desyncConflicts || current.without(desyncConflicts) == 0L || desyncConflicts.without(current) == 0L
    desyncObs = if (stable) desyncObs + 1 else 1
    if (desyncObs == 1) desyncSince = nowS
    desyncConflicts = current
    desyncLastSeq = seq
}

/**
 * **Identity-only conflicts never alarm.** An illegal move virtually always changes OCCUPANCY
 * somewhere; a stable wrong-piece-type reading is the known N/B/R gap (0.818 across Q/R/N/B) and rang
 * the alarm on regular boards. A false alarm declares the board lost, so the bar stays occupancy.
 */
private fun EngineState.raiseAlarmIfDue(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    conflicts: List<String>,
): List<TrackerEvent> {
    val due = alarmable && desyncObs >= config.desyncObsN && !alarmDeferred()
    if (!due || !cnn.hasOccupancyConflict(board.fen(), obs, config.cnnConfThr, conflicts)) return emptyList()
    return listOf(latchAlarm(conflicts, cnn.guessIllegalMove(board.fen(), obs, config.cnnConfThr)))
}

/**
 * [IllegalMoveException] came back out of a tick: report it, do not drop it. Same latch as a desync —
 * a move source that produced an impossible move has no claim on the position — and the offending UCI
 * rides in `guess`, so card, speech and timeline row all name it.
 */
internal fun EngineState.refuseIllegalMove(cause: IllegalMoveException): List<TrackerEvent> {
    val squares = listOf(cause.uci.take(2), cause.uci.drop(2).take(2)).filter { Squares.index(it) >= 0 }
    // Rendered against the position it was attempted IN, which is not always the live board: a
    // probe or a copy is just as capable of being handed a fabrication.
    val san = runCatching { Game(cause.fen).alarmGuessSan(cause.uci) }.getOrNull()
    val raised = TrackerEvent.Alarm(ALARM_MOVE_REFUSED, squares, cause.uci, san, AlarmReason.ENGINE_REFUSED)
    alarm = raised
    alarmSince = nowS
    recordRejection(cause.uci, "REFUSED illegal move ${cause.uci} in ${cause.fen}")
    note = "ILLEGAL MOVE REFUSED: ${cause.uci} is not legal in ${cause.fen} — undo or resync"
    return listOf(raised)
}

/** Latch the alarm. Released only by [clearAlarm] — nothing in the pipeline may heal it silently. */
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
    // Provenance for the moment the board is declared lost — the most consequential thing here.
    recordRejection(guess ?: "", "ALARM latched on ${conflicts.joinToString(",")}")
    return raised
}

/**
 * The human-readable suspicion the alarm card renders; re-derived here because `:core-engine` may not
 * depend on `:core-cnn` (module cycle).
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
        val reason = alarmReason(guess)?.text() ?: "illegal move suspected"
        "${piece.uppercaseChar()} $squares ($reason)"
    }
}

/**
 * Why the suspected move cannot be legal, or null when the engine only knows THAT it is not. Ordered
 * by what the player must do: who is to move outranks being in check, else the wrong person starts
 * looking for their king (User, 2026-08-24).
 */
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

/** Die englische Prosa fuer Note und Karte; die Sprachansage formuliert selbst ([AlarmReason]). */
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
