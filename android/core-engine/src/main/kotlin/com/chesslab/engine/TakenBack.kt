package com.chesslab.engine

internal const val NOTE_TAKEN_BACK_PREFIX = "CNN recovery is held — you took this position back"

/** The recovery will not move again on its own until one of these happens. */
internal const val NOTE_TAKEN_BACK_WAY_OUT = "— holding. Play on, or press \"New baseline\" if the board is right."

/** Remember the position, so the CNN recovery cannot bridge straight back over it. */
internal fun EngineState.takeBack(plies: Int) {
    repeat(plies) {
        board.pop()
        history.removeAt(history.size - 1)
    }
    takenBack = board.fen()
}

/** Keyed to the POSITION, not the line: the CNN produced two different bridges for the same undo. The exits
 *  are the user's — baseline, accept-CNN, or a FEN resync. */
internal fun EngineState.recoveryHeld(): Boolean = takenBack == board.fen()
