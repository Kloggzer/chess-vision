package com.chesslab.tracker.ui.games

import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.grade
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.reviewView

/**
 * The library in four numbers, every one of them already measured by something else.
 *
 * They used to be on Home, which made Home a dashboard: on a fresh install it read `0`, `0 of 1` and
 * `1`, and a "Games" row sat beside a "Games" tile counting the same thing. They belong beside the
 * data they describe (specs/48), so they are on the Games screen and the duplication went with them.
 *
 * Nothing here is derived from a model of the player: the app does not know which side the user was,
 * so nothing says "you". [accuracy] is the mean over every graded side of every reviewed game, and
 * [reviewed] is the denominator the tile prints beside it.
 */
data class LibraryStats(
    val games: Int,
    val moves: Int,
    val reviewed: Int,
    val accuracy: Double?,
    val clean: Int,
    val recorded: Int,
)

/**
 * White's and Black's accuracy for one game, or null when it has no analysis at the current budget.
 *
 * A game is only OPENED when a stored analysis exists for it, so an unreviewed game costs one failed
 * file read. Shared by Home (which prints it per row) and Games (which averages it).
 */
internal fun accuracyOf(
    games: GameStore,
    reviews: ReviewStore,
    budget: ReviewBudget,
    row: GameSummary,
): Pair<Double?, Double?>? {
    val scores = reviews.load(row.id, budget, row.moveCount + 1) ?: return null
    val view = games.open(row.id)?.reviewView() ?: return null
    val graded = grade(view, scores, budget)
    return graded.white.accuracy to graded.black.accuracy
}

internal fun libraryStats(
    rows: List<GameSummary>,
    accuracies: Map<String, Pair<Double?, Double?>?>,
): LibraryStats {
    val sides = accuracies.values.filterNotNull().flatMap { listOfNotNull(it.first, it.second) }
    return LibraryStats(
        games = rows.size,
        moves = rows.sumOf { it.moveCount },
        reviewed = accuracies.values.count { it != null },
        accuracy = sides.average().takeIf { sides.isNotEmpty() },
        clean = rows.count { it.seams == 0 },
        recorded = rows.count { it.sessionId != null },
    )
}
