package com.chesslab.tracker.ui.home

import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.UNKNOWN
import com.chesslab.tracker.ui.games.accuracyOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** How many games Home lists before the row that opens the library. */
internal const val RECENT_GAMES = 3

/**
 * One row of Home's recent list. [whiteAccuracy] is null for a game nobody has reviewed — the row
 * says so rather than showing a zero.
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

data class HomeUi(
    /** False until the first read of the store returns — an empty state must not flash. */
    val loaded: Boolean = false,
    val recent: List<HomeGame> = emptyList(),
    /** What the library holds, for the row that opens it. The STATISTICS are on Games. */
    val games: Int = 0,
)

/**
 * What a launcher needs: the last few games, and how many there are.
 *
 * Not an `androidx.lifecycle.ViewModel`, for the same reason `GamesViewModel` is not: the durable
 * state is the file store.
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
            mutable.value =
                HomeUi(
                    loaded = true,
                    recent =
                        rows.take(RECENT_GAMES).map { row ->
                            row.toHomeGame(accuracyOf(games, reviews, budget, row))
                        },
                    games = rows.size,
                )
        }
    }
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
