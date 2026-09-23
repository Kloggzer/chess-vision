package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.reviewView
import com.github.bhlangonijr.chesslib.move.MoveList

internal fun reviewGameOf(
    san: String,
    count: Int = Int.MAX_VALUE,
): GameView {
    val moves = MoveList().apply { loadFromSan(san) }
    val sans = moves.toSanArray()
    return StoredGame(
        id = "g",
        startFen = moves.startFen,
        startedAtEpochMs = 0,
        finishedAtEpochMs = 0,
        profileName = "t",
        result = "*",
        moves = moves.take(count).mapIndexed { index, move -> StoredMove(index + 1, sans[index], move.toString(), 0L) },
    ).reviewView()
}
