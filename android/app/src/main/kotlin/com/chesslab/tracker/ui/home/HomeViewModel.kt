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

internal const val RECENT_GAMES = 3

/** [whiteAccuracy] is null for an unreviewed game — the row says so rather than showing a zero. */
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
    val loaded: Boolean = false,
    val recent: List<HomeGame> = emptyList(),
    val games: Int = 0,
)

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

internal fun sideLabel(
    name: String,
    fallback: String,
): String = if (name.isBlank() || name == UNKNOWN) fallback else name

private val DATE = SimpleDateFormat("d MMM yyyy", Locale.getDefault())
