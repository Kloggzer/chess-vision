package com.chesslab.tracker.ui.games

import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameSummary
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.buildPgn
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionInfo
import com.chesslab.tracker.record.SessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class GamesUi(
    val games: List<GameSummary> = emptyList(),
    val sessions: List<SessionInfo> = emptyList(),
    val sessionBytes: Long = 0L,
    val prefs: RecordingPrefs = RecordingPrefs(),
)

/**
 * The games screen's state. Not an `androidx.lifecycle.ViewModel` — the durable state is the file
 * store, and this survives nothing.
 *
 * Every read hits the filesystem, so all of them run off the main thread and the result is one
 * snapshot value. In particular [GamesUi.sessionBytes] walks the sessions tree: it is refreshed on
 * screen entry and on an explicit action, never on the capture path.
 */
class GamesViewModel(
    private val games: GameStore,
    private val sessions: SessionStore,
    private val settings: RecordingSettings,
    private val scope: CoroutineScope,
) {
    private val mutable = MutableStateFlow(GamesUi())

    val ui: StateFlow<GamesUi> = mutable

    fun refresh() =
        io {
            mutable.value = GamesUi(games.list(), sessions.list(), sessions.totalBytes(), settings.load())
        }

    fun setPrefs(prefs: RecordingPrefs) =
        io {
            settings.save(prefs)
            mutable.value = mutable.value.copy(prefs = prefs)
        }

    fun rename(
        id: String,
        white: String,
        black: String,
        event: String,
    ) = io {
        games.rename(id, white, black, event)
        mutable.value = mutable.value.copy(games = games.list())
    }

    fun delete(
        id: String,
        withSession: Boolean,
    ) = io {
        val sessionId = games.list().firstOrNull { it.id == id }?.sessionId
        games.delete(id)
        if (withSession) sessionId?.let(sessions::delete)
        mutable.value = mutable.value.copy(games = games.list(), sessions = sessions.list(), sessionBytes = sessions.totalBytes())
    }

    fun deleteSession(id: String) =
        io {
            sessions.delete(id)
            mutable.value = mutable.value.copy(sessions = sessions.list(), sessionBytes = sessions.totalBytes())
        }

    suspend fun open(id: String): StoredGame? = withContext(Dispatchers.IO) { games.open(id) }

    /** The export form: re-rendered, because the provenance toggle is an export-time choice. */
    suspend fun pgn(
        id: String,
        provenance: Boolean,
    ): String? = open(id)?.let { buildPgn(it, provenance) }

    fun sessionDir(id: String) = sessions.dir(id)

    private fun io(block: suspend () -> Unit) {
        scope.launch(Dispatchers.IO) { block() }
    }
}
