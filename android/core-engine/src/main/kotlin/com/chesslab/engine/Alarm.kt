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
    conflicts: List<String>,
): List<TrackerEvent> {
    // One path for every run. The discipline lives in the two predicates below — a stable conflict
    // set of exactly one vacated and one received square — and both now read whichever axis the
    // observation carries. An occupancy-only run used to zero the streak here and never alarm,
    // which silently disarmed the whole desync response on every model this app ships.
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
 * The quiet-re-anchor veto fired (`quietOutcome`'s Bxc3 guard) — bound it.
 *
 * The veto hands the standoff to CNN recovery, but recovery can only end it when a LEGAL move
 * explains the observation. When the CNN is simply WRONG (S17-SIM-2: the white king on g1 read
 * empty in every observation) no move does, so `deriveMovesDeep` returns nothing forever — and
 * [cnnTick]'s escalation is throttled by the very `cnnCooldownS` that also throttles recovery.
 * The veto therefore counts as desync evidence in its own right, on the occupancy axis it just
 * fired on, and escalates to the illegal-move alarm. The escape is the USER (undo / reset /
 * baseline / accept-CNN), never an auto re-anchor — that is the hole the veto exists to close.
 *
 * Escalation additionally needs the observation to show a MOVE-SHAPED contradiction
 * (`guessIllegalMove`: exactly one vacated and one received square — the Bxc3 shape). That test is
 * occupancy, so it holds for a 2-class run as well; what a label-less run cannot do is NAME
 * the piece, and the alarm card already falls back to the conflict list. Measured on the 18 clips, nothing weaker
 * holds: the streak alone raised a false alarm on blender-promocapture (one chronically missed king
 * on g1) and cost it its real exd8=Q+, and any two-directional conflict set still alarmed on
 * blender-shadowsweep (two phantom-occupied squares under a moving shadow plus one missed pawn).
 */
internal fun EngineState.desyncEvidence(
    cnn: CnnEvaluator?,
    snap: CnnSnapshot,
    conflicts: List<String>,
): List<TrackerEvent> {
    advanceDesyncStreak(snap.seq, conflicts)
    val due = alarm == null && desyncObs >= config.desyncObsN
    val guess = if (due) cnn?.guessIllegalMove(board.fen(), snap.obs, config.cnnConfThr) else null
    if (guess != null) {
        val raised = latchAlarm(conflicts, guess)
        note = alarmNote(raised)
        return listOf(raised)
    }
    val listed = conflicts.take(CONFLICTS_SHOWN).joinToString(", ")
    note =
        "quiet board but CNN disagrees on $listed — holding reference for " +
        "${pyFixed(nowS - desyncSince, 0)}s ($desyncObs observations)"
    return emptyList()
}

private fun EngineState.alarmNote(latched: TrackerEvent.Alarm): String {
    val what = board.alarmGuessSan(latched.guess) ?: latched.conflicts.shown()
    return "ILLEGAL MOVE? $what — take it back, or resync to accept"
}

/**
 * Drop the streak whole — the count, the set it was counted over, and the seq dedup.
 *
 * The three are one fact ("the observations so far disagreed about THESE squares"), so a caller
 * that zeroes the count alone leaves the set behind for the next observation to be compared
 * against. It also has exactly one meaning, which is why it is one function: the disagreement is
 * over. Only two things can say that — a matching observation and [clearAlarm] — and until
 * 2026-08-02 only the second one did.
 */
internal fun EngineState.clearDesyncStreak() {
    desyncObs = 0
    desyncConflicts = 0L
    desyncLastSeq = null
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
    if (desyncObs == 1) desyncSince = nowS
    desyncConflicts = current
    desyncLastSeq = seq
}

/**
 * **Identity-only conflicts never alarm.** An illegal move virtually always changes OCCUPANCY
 * somewhere; a stable wrong-piece-type reading is the known N/B/R gap, and counting it rang the
 * alarm on perfectly regular boards.
 *
 * That gap used to be quoted here as "~40% identity precision" and it is not: measured on
 * `occ-v10bn35-13c-hn` over 7 217 occupied crops it is **0.882** overall and **0.818** across the
 * Q/R/N/B set. The rule survives the correction for its own reason rather than that one — a false
 * alarm declares the board lost, so the bar has to be occupancy whatever identity scores — but
 * whether 0.882 is now good enough to alarm on is an open measurement question, not a closed one.
 */
private fun EngineState.raiseAlarmIfDue(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    conflicts: List<String>,
): List<TrackerEvent> {
    val due = alarm == null && desyncObs >= config.desyncObsN
    if (!due || !cnn.hasOccupancyConflict(board.fen(), obs, config.cnnConfThr, conflicts)) return emptyList()
    return listOf(latchAlarm(conflicts, cnn.guessIllegalMove(board.fen(), obs, config.cnnConfThr)))
}

/** Latch the alarm. Released only by [clearAlarm] — nothing in the pipeline may heal it silently. */
private fun EngineState.latchAlarm(
    conflicts: List<String>,
    guess: String?,
): TrackerEvent.Alarm {
    val raised = TrackerEvent.Alarm(ALARM_ILLEGAL_MOVE, conflicts, guess, board.alarmGuessSan(guess))
    alarm = raised
    alarmSince = nowS
    // Only `clearAlarm` used to write a row, so the moment the board was declared lost — the single
    // most consequential thing this engine does — left no provenance at all.
    recordRejection(guess ?: "", "ALARM latched on ${conflicts.joinToString(",")}")
    return raised
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
