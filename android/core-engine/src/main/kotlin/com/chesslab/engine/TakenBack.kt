package com.chesslab.engine

/** The note the recovery leaves while it is held at a position the user undid back to. */
internal const val NOTE_TAKEN_BACK_PREFIX = "CNN recovery is held — you took this position back"

/** What to do about it — the recovery will not move again on its own until one of these happens. */
internal const val NOTE_TAKEN_BACK_WAY_OUT = "— holding. Play on, or press \"New baseline\" if the board is right."

/** Pop [plies] and remember the position, so the CNN recovery cannot bridge straight back over it. */
internal fun EngineState.takeBack(plies: Int) {
    repeat(plies) {
        board.pop()
        history.removeAt(history.size - 1)
    }
    takenBack = board.fen()
}

/**
 * True while the board sits at a position an undo returned it to, keyed to the POSITION not the line:
 * the CNN produced two different bridges for the same undo. The exits are the user's — baseline,
 * accept-CNN, or a FEN resync.
 */
internal fun EngineState.recoveryHeld(): Boolean = takenBack == board.fen()
