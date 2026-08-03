package com.chesslab.tracker.ui.home

import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.grade
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.games.reviewView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** How many games the dashboard lists before "See all". */
internal const val RECENT_GAMES = 3

/**
 * One row of the dashboard's recent list. [whiteAccuracy] is null for a game nobody has reviewed —
 * the row says so rather than showing a zero.
 */
data class HomeGame(
    val id: String,
    val date: String,
    val result: String,
    val moveCount: Int,
    val white: String,
    val black: String,
    val seams: Int,
    val whiteAccuracy: Double? = null,
    val blackAccuracy: Double? = null,
)

/**
 * The library in four numbers, every one of them already measured by something else.
 *
 * Nothing here is derived from a model of the player: the app does not know which side the user
 * was, so nothing on this dashboard says "you". [accuracy] is the mean over every graded side of
 * every reviewed game, and [reviewed] is the denominator the card prints beside it.
 */
data class HomeStats(
    val games: Int,
    val moves: Int,
    val reviewed: Int,
    val accuracy: Double?,
    val clean: Int,
    val recorded: Int,
)

data class HomeUi(
    /** False until the first read of the store returns — an empty state must not flash. */
    val loaded: Boolean = false,
    val recent: List<HomeGame> = emptyList(),
    val stats: HomeStats = HomeStats(0, 0, 0, null, 0, 0),
)

/**
 * The dashboard's numbers.
 *
 * Not an `androidx.lifecycle.ViewModel`, for the same reason `GamesViewModel` is not: the durable
 * state is the file store.
 *
 * A game is only OPENED when a stored analysis exists for it at the current budget — the accuracy
 * is the only figure here that needs the moves, and an unreviewed game therefore costs one failed
 * file read. Everything else falls out of `index.json`.
 */
class HomeViewModel(
    private val games: GameStore,
    private val reviews: ReviewStore,
    private val scope: CoroutineScope,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    private val mutable = MutableStateFlow(HomeUi())
    val ui: StateFlow<HomeUi> = mutable

    fun refresh() {
        scope.launch(Dispatchers.IO) {
            val rows = games.list()
            val accuracies = rows.associate { it.id to accuracyOf(it) }
            mutable.value =
                HomeUi(
                    loaded = true,
                    recent = rows.take(RECENT_GAMES).map { row -> row.toHomeGame(accuracies[row.id]) },
                    stats = statsOf(rows, accuracies),
                )
        }
    }

    /** White's and Black's accuracy, or null when this game has no analysis at the current budget. */
    private fun accuracyOf(row: GameSummary): Pair<Double?, Double?>? {
        val scores = reviews.load(row.id, budget, row.moveCount + 1) ?: return null
        val view = games.open(row.id)?.reviewView() ?: return null
        val graded = grade(view, scores, budget)
        return graded.white.accuracy to graded.black.accuracy
    }
}

private fun statsOf(
    rows: List<GameSummary>,
    accuracies: Map<String, Pair<Double?, Double?>?>,
): HomeStats {
    val sides = accuracies.values.filterNotNull().flatMap { listOfNotNull(it.first, it.second) }
    return HomeStats(
        games = rows.size,
        moves = rows.sumOf { it.moveCount },
        reviewed = accuracies.values.count { it != null },
        accuracy = sides.average().takeIf { sides.isNotEmpty() },
        clean = rows.count { it.seams == 0 },
        recorded = rows.count { it.sessionId != null },
    )
}

private fun GameSummary.toHomeGame(accuracy: Pair<Double?, Double?>?) =
    HomeGame(
        id = id,
        date = DATE.format(Date(startedAtEpochMs)),
        result = result,
        moveCount = moveCount,
        white = white,
        black = black,
        seams = seams,
        whiteAccuracy = accuracy?.first,
        blackAccuracy = accuracy?.second,
    )

/** Names a side by what was captured for it; `?` is stored for a game whose players were skipped. */
internal fun sideLabel(
    name: String,
    fallback: String,
): String = if (name.isBlank() || name == UNKNOWN) fallback else name

private val DATE = SimpleDateFormat("d MMM yyyy", Locale.getDefault())
