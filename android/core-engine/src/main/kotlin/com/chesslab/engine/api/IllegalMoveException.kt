package com.chesslab.engine.api

/**
 * A move the position does not allow was handed to a board — thrown WHERE it enters, never later.
 *
 * chesslib applies such a move and returns at every validation level, so nothing downstream would
 * notice; the 2026-08-09 crash surfaced four call layers from its cause. [uci] and [fen] are what
 * make the report actionable — `TrackerEngine` turns both into the illegal-move alarm.
 */
class IllegalMoveException(
    val uci: String,
    val fen: String,
) : IllegalStateException("illegal move '$uci' in position '$fen'")
