package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.GameReviewer
import com.chesslab.tracker.analysis.MateLineResolver
import com.chesslab.tracker.analysis.ResolvedMateLine
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.analysis.grade
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
    /** True while the engine is working. The grade fills in underneath it. */
    val running: Boolean = false,
    /** True once a run found no engine binary — the button disappears rather than failing again. */
    val engineMissing: Boolean = false,
)

/**
 * The archive source and the grading run behind it.
 *
 * Not an `androidx.lifecycle.ViewModel`, for the same reason `GamesViewModel` is not: the durable
 * state is the file store. It used to say "this survives nothing", and that was the complaint —
 * every second of engine time died with the screen. It now survives in [ReviewStore], keyed by the
 * budget that produced it, and a re-opened game is graded from disk in one read.
 *
 * Since specs/50 the RUN survives too, because the scope is the process ([ReviewHost]) and not the
 * composition. Which is why [load] is a no-op for the game already open: it is called from a
 * `LaunchedEffect` every time the screen is entered, and a reload would have thrown away the run it
 * came back to watch.
 */
class ReviewViewModel(
    private val store: GameStore,
    private val reviews: ReviewStore,
    private val engineFactory: () -> UciEngine?,
    private val scope: CoroutineScope,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    private val mutable = MutableStateFlow(ReviewUi())
    val ui: StateFlow<ReviewUi> = mutable

    private var running: Job? = null

    /**
     * The ply the user is looking at. The engine grades outward from here — see [GameReviewer].
     * A review opens at the START, so that is where the first searches go.
     */
    @Volatile
    private var focus: Int = 0

    fun load(id: String) {
        if (mutable.value.game?.id == id) return
        // A different game: one review at a time, and the positions already scored are on disk.
        running?.cancel()
        running = null
        scope.launch {
            val stored = withContext(Dispatchers.IO) { store.open(id) }
            val game = stored?.reviewView()
            focus = 0
            val stale =
                game?.let { view ->
                    withContext(Dispatchers.IO) { reviews.load(id, budget, view.plies.size + 1) }
                        ?.let { grade(view, it, budget) }
                }
            mutable.value = ReviewUi(game = game, pgn = stored?.let { buildPgn(it) }.orEmpty(), grade = stale)
        }
    }

    /** Called as the user seeks; the next search goes to whatever is nearest this ply. */
    fun focus(ply: Int) {
        focus = ply
    }

    /** Loads a completed position-hash line, or resolves and persists it once if this is a miss. */
    suspend fun resolveMateLine(
        startFen: String,
        seed: List<String>,
    ): ResolvedMateLine =
        withContext(Dispatchers.IO) {
            reviews.loadMateLine(startFen, budget)?.let { return@withContext it }
            MateLineResolver(engineFactory, budget).resolve(startFen, seed).also { resolved ->
                reviews.saveMateLine(startFen, budget, resolved)
            }
        }

    /** Idempotent while a run is in flight: a second tap must not start a second engine. */
    fun review() {
        val game = mutable.value.game ?: return
        if (running?.isActive == true) return
        mutable.value = mutable.value.copy(running = true)
        running =
            scope.launch(Dispatchers.IO) {
                val seed = reviews.load(game.id, budget, game.plies.size + 1).orEmpty()
                val started =
                    GameReviewer(engineFactory, budget).review(game, seed, { focus }) { scores ->
                        reviews.save(game.id, budget, scores)
                        mutable.value = mutable.value.copy(grade = grade(game, scores, budget))
                    }
                mutable.value =
                    mutable.value.copy(
                        running = false,
                        // A move-less game also produces no grade, and that is not a missing engine.
                        engineMissing = !started && game.plies.isNotEmpty(),
                    )
            }
    }

    /**
     * Stops the run and keeps what it scored — the counterpart of the run outliving the screen.
     *
     * Every scored position is already on disk, so this loses at most the search in flight and
     * `Continue review` picks the rest up.
     */
    fun stop() {
        running?.cancel()
        running = null
        mutable.value = mutable.value.copy(running = false)
    }

    /**
     * The game is gone. Since the run outlives the screen, one still grading a DELETED record would
     * go on writing `<id>.analysis.json` for a game that no longer exists.
     */
    fun forget(id: String) {
        if (mutable.value.game?.id != id) return
        stop()
        mutable.value = ReviewUi()
    }

    /** Throws the stored analysis away and starts again — the only way to re-search a graded game. */
    fun discard() {
        val game = mutable.value.game ?: return
        running?.cancel()
        running = null
        scope.launch(Dispatchers.IO) { reviews.delete(game.id) }
        mutable.value = mutable.value.copy(grade = null, running = false)
    }
}
