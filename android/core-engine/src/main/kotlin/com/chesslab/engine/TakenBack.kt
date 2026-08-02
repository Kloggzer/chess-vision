package com.chesslab.engine

/** The note the recovery leaves when it declines to replay a line the user took back. */
internal const val NOTE_TAKEN_BACK_PREFIX = "CNN recovery would replay the moves you just took back"

/** What to do about it — the recovery will not move again on its own until one of these happens. */
internal const val NOTE_TAKEN_BACK_WAY_OUT = "— holding. Play on, or press \"New baseline\" if the board is right."

/**
 * The line the user has taken back with `undo`, and the position it was taken back TO.
 *
 * The incident of 2026-08-02: a three-move CNN recovery bridge (`b5c4 a3c5 c4c5`) was committed,
 * taken back, and then derived and committed again — identically, three times over. An undo moves
 * the APP's position; the CNN reads the BOARD; the board did not change; so the same bridge is the
 * same correct answer to the same question on the very next observation. Nothing in the recovery
 * path knew the user had just rejected exactly this, so no number of presses could win the loop.
 *
 * [ucis] is in PLAY order and ACCUMULATES over consecutive presses. That is not a nicety: once
 * another move has been committed on top of a bridge, `lastCommitSize` belongs to that move, so the
 * bridge comes back one press per ply and only the accumulated line ever spans it. In the incident
 * the user pressed Undo four times to unwind `a3` plus the three-ply bridge under it.
 */
internal data class TakenBack(
    /** The position the presses have unwound to — the veto is inert anywhere else. */
    val fen: String,
    val ucis: List<String>,
)

/**
 * Pop [plies] and remember the line they formed, so the CNN recovery cannot put it straight back.
 *
 * The pops and the record belong together: a pop that is not recorded is exactly the hole the
 * runaway came through, and the ucis are only readable while the moves are still on the board.
 */
internal fun EngineState.takeBack(plies: Int) {
    val fenBefore = board.fen()
    val popped = ArrayList<String>(plies)
    repeat(plies) {
        board.pop()?.let { popped.add(uciOf(it)) }
        history.removeAt(history.size - 1)
    }
    // Extend the line only when this press continues where the last one stopped; a press that
    // starts from somewhere else is a new take-back and the old line no longer describes anything.
    val previous = takenBack?.takeIf { it.fen == fenBefore }?.ucis ?: emptyList()
    takenBack = TakenBack(board.fen(), popped.reversed() + previous)
}

/**
 * True when [ucis], played from the position the board holds NOW, is a line the user already took
 * back — the whole line or a leading part of it.
 *
 * A PREFIX rather than an exact match, because the user unwinds one press at a time and typically
 * takes back more than the recovery re-derives: in the incident the four popped plies were
 * `b5c4 a3c5 c4c5 a2a3` and the bridge that kept coming back was the first three.
 *
 * Deliberately narrow in the other direction: a sequence that merely STARTS with the rejected line
 * and then continues differently is new evidence — the observation changed — and is let through.
 */
internal fun EngineState.wasTakenBack(ucis: List<String>): Boolean {
    val back = takenBack
    return back != null && ucis.isNotEmpty() && back.fen == board.fen() && back.ucis.take(ucis.size) == ucis
}
