package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent

/**
 * The SANs one commit carried — empty for every event that is not a commit.
 *
 * A `SequenceCommitted` is a recovery of several plies at once and the engine unwinds the bridge
 * whole, so this is what [undoLabel] counts. It is deliberately NOT a score sheet: the game's move
 * list is `GameSessionState.game`, built once by `LiveGame`.
 */
fun commitSans(event: TrackerEvent): List<String> =
    when (event) {
        is TrackerEvent.MoveCommitted -> listOf(event.san)
        is TrackerEvent.SequenceCommitted -> event.sans
        else -> emptyList()
    }

/** The position a commit event produced, for whoever has to wait until the screen shows it. */
fun fenAfter(event: TrackerEvent): String? =
    when (event) {
        is TrackerEvent.MoveCommitted -> event.fenAfter
        is TrackerEvent.SequenceCommitted -> event.fenAfter
        else -> null
    }

/**
 * What one press of Undo will take back.
 *
 * `TrackerEngine.undo` unwinds the last COMMIT, and a CNN recovery can commit several plies at once
 * — four of them in the live game of 2026-08-02. A control that says only "Undo" after such a bridge
 * understates what one press does, and a user who learned the old one-press-one-ply behaviour will
 * over-undo. One move is the common case and stays unadorned.
 */
fun undoLabel(lastCommit: List<String>): String = if (lastCommit.size <= 1) "Undo" else "Undo ${lastCommit.size} moves"

/**
 * The plies of the last commit, named — `Bxb5 + Kb8 + Bd4 + Nf3`.
 *
 * `null` for an ordinary single commit and for a game that has not committed anything yet: there is
 * nothing to spell out, and the button label already says it. Only shown where there is room for a
 * line of prose; the action buttons are a third of a row wide and hold one line.
 */
fun undoDetail(lastCommit: List<String>): String? =
    if (lastCommit.size <= 1) null else "One press takes back: " + lastCommit.joinToString(" + ")
