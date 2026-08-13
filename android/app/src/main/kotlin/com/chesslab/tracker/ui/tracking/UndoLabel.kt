package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent

/**
 * The SANs one commit carried — empty for every event that is not a commit.
 *
 * A `SequenceCommitted` is a recovery of several plies at once and the engine unwinds the bridge
 * whole, so this is what [undoCount] counts. It is deliberately NOT a score sheet: the game's move
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
 * **How many plies one press of Undo takes back.**
 *
 * `TrackerEngine.undo` unwinds the last COMMIT, and a CNN recovery can commit several plies at once
 * — four of them in the live game of 2026-08-02. A control that says only "Undo" after such a bridge
 * understates what one press does, and a user who learned the old one-press-one-ply behaviour will
 * over-undo.
 *
 * It returns the COUNT and not the words: German pluralises differently from English, and a label
 * assembled here would be a second place the wording lives. The Compose layer resolves it through
 * `R.plurals.tracking_take_back`. An empty history still counts as one — the control is unadorned
 * then, which is what 1 renders as.
 */
fun undoCount(lastCommit: List<String>): Int = maxOf(1, lastCommit.size)

/**
 * The plies of the last commit, for the one place with room to spell them out.
 *
 * `null` for an ordinary single commit and for a game that has not committed anything yet: there is
 * nothing to spell out, and the control already says it. SAN is never translated, so this stays a
 * list of moves and the sentence around it is a resource.
 */
fun undoDetail(lastCommit: List<String>): List<String>? = lastCommit.takeIf { it.size > 1 }
