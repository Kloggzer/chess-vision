package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.TrackerEvent

/** A `SequenceCommitted` unwinds whole, so this is what [undoCount] counts. Not a score sheet. */
fun commitSans(event: TrackerEvent): List<String> =
    when (event) {
        is TrackerEvent.MoveCommitted -> listOf(event.san)
        is TrackerEvent.SequenceCommitted -> event.sans
        else -> emptyList()
    }

fun fenAfter(event: TrackerEvent): String? =
    when (event) {
        is TrackerEvent.MoveCommitted -> event.fenAfter
        is TrackerEvent.SequenceCommitted -> event.fenAfter
        else -> null
    }

/** The last COMMIT can be several plies (a recovery). The COUNT, not words: plurals differ by language
 *  (`R.plurals.tracking_take_back`). An empty history counts as one. */
fun undoCount(lastCommit: List<String>): Int = maxOf(1, lastCommit.size)

/** `null` for a single commit or none: nothing to spell out. */
fun undoDetail(lastCommit: List<String>): List<String>? = lastCommit.takeIf { it.size > 1 }
