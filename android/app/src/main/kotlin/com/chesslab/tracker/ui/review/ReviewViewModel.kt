package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.GameReviewer
import com.chesslab.tracker.analysis.ReviewProgress
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.buildPgn
import com.chesslab.tracker.games.reviewView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Everything the ARCHIVE side of the review screen shows. The live side needs no model at all. */
data class ReviewUi(
    val game: GameView? = null,
    val pgn: String = "",
    val grade: GameGrade? = null,
    val progress: ReviewProgress? = null,
    /** True once a run found no engine binary — the button disappears rather than failing again. */
    val engineMissing: Boolean = false,
)

/**
 * The archive source and the grading run behind it.
 *
 * Not an `androidx.lifecycle.ViewModel`, for the same reason `GamesViewModel` is not: the durable
 * state is the file store and this survives nothing. The grading job is cancelled with the scope,
 * so leaving the screen stops the engine — a review is worth a minute of CPU only while somebody is
 * waiting for it.
 */
class ReviewViewModel(
    private val store: GameStore,
    private val engineFactory: () -> UciEngine?,
    private val scope: CoroutineScope,
) {
    private val mutable = MutableStateFlow(ReviewUi())
    val ui: StateFlow<ReviewUi> = mutable

    private var running: Job? = null

    fun load(id: String) {
        scope.launch {
            val stored = withContext(Dispatchers.IO) { store.open(id) }
            mutable.value =
                ReviewUi(
                    game = stored?.reviewView(),
                    pgn = stored?.let { buildPgn(it) }.orEmpty(),
                )
        }
    }

    /** Idempotent while a run is in flight: a second tap must not start a second engine. */
    fun review() {
        val game = mutable.value.game ?: return
        if (running?.isActive == true) return
        running =
            scope.launch(Dispatchers.IO) {
                val reviewer = GameReviewer(engineFactory)
                val grade = reviewer.review(game) { mutable.value = mutable.value.copy(progress = it) }
                // A move-less game also grades to null, and that is not a missing engine.
                mutable.value =
                    mutable.value.copy(
                        grade = grade,
                        progress = null,
                        engineMissing = grade == null && game.plies.isNotEmpty(),
                    )
            }
    }
}
