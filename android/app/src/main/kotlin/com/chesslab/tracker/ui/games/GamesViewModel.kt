package com.chesslab.tracker.ui.games

import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.buildPgn
import com.chesslab.tracker.record.SessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class GamesUi(
    val games: List<GameSummary> = emptyList(),
)

/**
 * The games screen's state. Not an `androidx.lifecycle.ViewModel` — the durable state is the file
 * store, and this survives nothing.
 *
 * It still holds a [SessionStore] and nothing else uses it here: deleting a game may take its
 * recorded frames with it, and that checkbox is on the delete dialog. Everything else about
 * recording — the preferences, the on-disk total, the per-session export — moved to
 * Settings › Recording with the panel it belongs to.
 */
class GamesViewModel(
    private val games: GameStore,
    private val sessions: SessionStore,
    private val scope: CoroutineScope,
) {
    private val mutable = MutableStateFlow(GamesUi())

    val ui: StateFlow<GamesUi> = mutable

    fun refresh() = io { mutable.value = GamesUi(games.list()) }

    fun rename(
        id: String,
        white: String,
        black: String,
        event: String,
    ) = io {
        games.rename(id, white, black, event)
        mutable.value = GamesUi(games.list())
    }

    fun delete(
        id: String,
        withSession: Boolean,
    ) = io {
        val sessionId = games.list().firstOrNull { it.id == id }?.sessionId
        games.delete(id)
        if (withSession) sessionId?.let(sessions::delete)
        mutable.value = GamesUi(games.list())
    }

    suspend fun open(id: String): StoredGame? = withContext(Dispatchers.IO) { games.open(id) }

    /** The export form: re-rendered, because the provenance toggle is an export-time choice. */
    suspend fun pgn(
        id: String,
        provenance: Boolean,
    ): String? = open(id)?.let { buildPgn(it, provenance) }

    private fun io(block: suspend () -> Unit) {
        scope.launch(Dispatchers.IO) { block() }
    }
}
