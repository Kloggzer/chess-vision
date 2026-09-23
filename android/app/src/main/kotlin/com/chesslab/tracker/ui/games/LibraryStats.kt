package com.chesslab.tracker.ui.games

import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.grade
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.reviewView

/** The app does not know which side the user was, so nothing says "you": [accuracy] is the mean over every
 *  graded side, [reviewed] its denominator. */
data class LibraryStats(
    val games: Int,
    val moves: Int,
    val reviewed: Int,
    val accuracy: Double?,
    val clean: Int,
    val recorded: Int,
)

/** A game is only OPENED when a stored analysis exists: an unreviewed one costs one failed file read. */
internal fun accuracyOf(
    games: GameStore,
    reviews: ReviewStore,
    budget: ReviewBudget,
    row: GameSummary,
): Pair<Double?, Double?>? {
    val scores = reviews.load(row.id, budget, row.moveCount + 1) ?: return null
    // Eine unlesbare Partie bleibt in der Liste — `open` wirft hier.
    val view = runCatching { games.open(row.id) }.getOrNull()?.reviewView() ?: return null
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
