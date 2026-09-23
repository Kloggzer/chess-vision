package com.chesslab.tracker.ui.games

import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.ui.launchStorageWork
import com.chesslab.tracker.ui.review.ReviewHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.coroutines.CoroutineContext

data class GamesUi(
    /** False until the first read of the store returns — an empty state must not flash. */
    val loaded: Boolean = false,
    val games: List<GameSummary> = emptyList(),
    val stats: LibraryStats = LibraryStats(0, 0, 0, null, 0, 0),
    /** The last load, edit or delete that did not happen. */
    val error: String? = null,
)

/**
 * The games screen's state. Not an `androidx.lifecycle.ViewModel` — the durable state is the file
 * store, and this survives nothing.
 *
 * It still holds a [SessionStore] and nothing else uses it here: deleting a game may take its
 * recorded frames with it, and that checkbox is on the delete dialog. Everything else about
 * recording — the preferences, the on-disk total, the per-session export — moved to
 * Settings › Recording with the panel it belongs to.
 *
 * The [LibraryStats] came the other way, off Home (specs/48): they describe this list, so they are
 * read where the list is.
 */
class GamesViewModel(
    private val games: GameStore,
    private val reviews: ReviewStore,
    private val sessions: SessionStore,
    private val scope: CoroutineScope,
    private val budget: ReviewBudget = ReviewBudget(),
    private val context: CoroutineContext = Dispatchers.IO,
) {
    private val mutable = MutableStateFlow(GamesUi())

    val ui: StateFlow<GamesUi> = mutable

    fun refresh() = io { reload() }

    fun updateDetails(
        id: String,
        white: String,
        black: String,
        event: String,
        result: GameResult,
    ) = io {
        games.updateDetails(id, white, black, event, result)
        reload()
    }

    fun delete(
        id: String,
        withSession: Boolean,
    ) = io {
        val sessionId = games.list().firstOrNull { it.id == id }?.sessionId
        // The confirmation says "the record, its PGN and its stored analysis" (specs/48 rule 6), and
        // until specs/50 the analysis was the one of the three that survived — as an orphan file
        // keyed to an id nothing lists. A run still grading it is stopped for the same reason.
        ReviewHost.model.value?.forget(id)
        games.delete(id)
        reviews.delete(id)
        if (withSession) sessionId?.let(sessions::delete)
        reload()
    }

    private fun reload() {
        val rows = games.list()
        val accuracies = rows.associate { it.id to accuracyOf(games, reviews, budget, it) }
        mutable.value = GamesUi(loaded = true, games = rows, stats = libraryStats(rows, accuracies))
    }

    private fun io(block: suspend () -> Unit) {
        scope.launchStorageWork(context, { mutable.value = mutable.value.copy(error = it) }, block)
    }
}
