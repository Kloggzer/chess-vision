package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.EngineLane
import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.GameReviewer
import com.chesslab.tracker.analysis.MateLineResolver
import com.chesslab.tracker.analysis.OpeningBook
import com.chesslab.tracker.analysis.OpeningSummary
import com.chesslab.tracker.analysis.PositionLibraryWarmer
import com.chesslab.tracker.analysis.ResolvedMateLine
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.grade
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.buildPgn
import com.chesslab.tracker.games.reviewView
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.concurrent.atomic.AtomicLong

/** Everything the archived review screen can render. */
data class ReviewUi(
    val game: GameView? = null,
    val pgn: String = "",
    val grade: GameGrade? = null,
    val opening: OpeningSummary? = null,
    val running: Boolean = false,
    /** True after the game itself is complete while nearby book continuations are being cached. */
    val warmingLibrary: Boolean = false,
    val libraryCached: Int = 0,
    val libraryTotal: Int = 0,
    val engineMissing: Boolean = false,
    /** Prevents a route change from flashing the previous game or a false "not found" state. */
    val loading: Boolean = false,
    /** Retryable failures are visible and, unlike a fake zero score, are never cached. */
    val error: String? = null,
)

/**
 * Process-owned review state. A monotonically increasing generation fences every asynchronous
 * writer: once a game is changed, stopped, discarded or deleted, an older callback cannot touch
 * either the UI or the analysis files.
 */
class ReviewViewModel(
    private val store: GameStore,
    private val reviews: ReviewStore,
    private val engines: EngineService,
    private val scope: CoroutineScope,
    private val budget: ReviewBudget = ReviewBudget(),
    private val openingBook: () -> OpeningBook = { OpeningBook.EMPTY },
) {
    private val mutable = MutableStateFlow(ReviewUi())
    val ui: StateFlow<ReviewUi> = mutable

    @Volatile private var running: Job? = null

    @Volatile private var loading: Job? = null
    private val generation = AtomicLong()

    @Volatile private var requestedId: String? = null

    @Volatile private var forceFresh = false

    @Volatile
    private var focus: Int = 0

    @Synchronized
    fun load(id: String) {
        if (requestedId == id && (loading?.isActive == true || mutable.value.game?.id == id)) return
        val token = generation.incrementAndGet()
        requestedId = id
        forceFresh = false
        running?.cancel()
        loading?.cancel()
        running = null
        mutable.value = ReviewUi(loading = true)
        loading =
            scope.launch {
                try {
                    val stored = withContext(Dispatchers.IO) { store.open(id) }
                    val game = stored?.reviewView()
                    val opening = game?.let { view -> runCatching { openingBook().identify(view) }.getOrNull() }
                    focus = 0
                    val stale =
                        game?.let { view ->
                            withContext(Dispatchers.IO) { reviews.loadCached(id, budget, positions(view)) }
                                ?.let { scores -> grade(view, scores, budget) }
                        }
                    if (owns(token, id)) {
                        mutable.value =
                            ReviewUi(
                                game = game,
                                pgn = stored?.let { buildPgn(it) }.orEmpty(),
                                grade = stale,
                                opening = opening,
                            )
                    }
                } catch (_: CancellationException) {
                    // A newer route owns the state.
                } catch (failure: IOException) {
                    if (owns(token, id)) mutable.value = ReviewUi(error = failure.userMessage())
                } finally {
                    synchronized(this@ReviewViewModel) {
                        if (generation.get() == token) loading = null
                    }
                }
            }
    }

    fun focus(ply: Int) {
        focus = ply
    }

    /** Updates PGN metadata without throwing away the already loaded analysis or board position. */
    fun editGameDetails(
        white: String,
        black: String,
        event: String,
        result: GameResult,
    ) {
        val game = mutable.value.game ?: return
        val token = generation.get()
        scope.launch(Dispatchers.IO) {
            val stored =
                runCatching {
                    store.updateDetails(game.id, white, black, event, result)
                    store.open(game.id)
                }.getOrNull() ?: return@launch
            if (owns(token, game.id)) {
                mutable.value =
                    mutable.value.copy(
                        game = stored.reviewView(),
                        pgn = buildPgn(stored),
                    )
            }
        }
    }

    suspend fun resolveMateLine(
        startFen: String,
        seed: List<String>,
    ): ResolvedMateLine =
        withContext(Dispatchers.IO) {
            reviews.loadMateLine(startFen, budget)?.let { return@withContext it }
            MateLineResolver(engines, EngineLane.REVIEW, budget).resolve(startFen, seed).also { resolved ->
                reviews.saveMateLine(startFen, budget, resolved)
            }
        }

    @Synchronized
    fun review() {
        val game = mutable.value.game ?: return
        if (running?.isActive == true) return
        val token = generation.incrementAndGet()
        val fresh = forceFresh
        forceFresh = false
        val positions = positions(game)
        mutable.value =
            mutable.value.copy(
                running = true,
                warmingLibrary = false,
                libraryCached = 0,
                libraryTotal = 0,
                engineMissing = false,
                error = null,
            )
        running =
            scope.launch(Dispatchers.IO) {
                try {
                    val seed = if (fresh) emptyList() else reviews.loadCached(game.id, budget, positions).orEmpty()
                    val persisted = BooleanArray(positions.size) { seed.getOrNull(it) != null }
                    val started =
                        GameReviewer(engines, budget).review(game, seed, { focus }) onScored@{ scores ->
                            if (!owns(token, game.id)) return@onScored
                            scores.forEachIndexed { index, score ->
                                if (score != null && !persisted[index]) {
                                    reviews.savePosition(positions[index], budget, score)
                                    persisted[index] = true
                                }
                            }
                            reviews.save(game.id, budget, scores)
                            if (owns(token, game.id)) {
                                mutable.value = mutable.value.copy(grade = grade(game, scores, budget))
                            }
                        }
                    finishRun(started, token, game)
                } catch (_: CancellationException) {
                    // Stop, delete and route changes already published their replacement state.
                } catch (failure: IOException) {
                    if (owns(token, game.id)) {
                        mutable.value = mutable.value.copy(running = false, warmingLibrary = false, error = failure.userMessage())
                    }
                } finally {
                    synchronized(this@ReviewViewModel) {
                        if (generation.get() == token) running = null
                    }
                }
            }
    }

    @Synchronized
    fun stop() {
        generation.incrementAndGet()
        running?.cancel()
        running = null
        mutable.value = mutable.value.copy(running = false, warmingLibrary = false)
    }

    /** Cancels and joins before the caller deletes files, so a late search cannot resurrect them. */
    suspend fun forget(id: String) {
        val jobs =
            synchronized(this) {
                if (requestedId != id) return
                generation.incrementAndGet()
                requestedId = null
                val owned = listOfNotNull(running, loading)
                owned.forEach(Job::cancel)
                running = null
                loading = null
                mutable.value = ReviewUi()
                owned
            }
        jobs.forEach { it.cancelAndJoin() }
    }

    /** Deletes the game snapshot and makes the next tap bypass the shared position cache once. */
    @Synchronized
    fun discard() {
        val game = mutable.value.game ?: return
        val token = generation.incrementAndGet()
        val old = running
        old?.cancel()
        forceFresh = true
        mutable.value = mutable.value.copy(grade = null, running = false, warmingLibrary = false, error = null)
        running =
            scope.launch(Dispatchers.IO) {
                old?.cancelAndJoin()
                reviews.delete(game.id)
                synchronized(this@ReviewViewModel) {
                    if (generation.get() == token) running = null
                }
            }
    }

    private fun owns(
        token: Long,
        id: String,
    ): Boolean = generation.get() == token && requestedId == id

    /** Best-effort idle work: a failure here must not turn a completed game review into an error. */
    private suspend fun warmLibrary(
        token: Long,
        game: GameView,
    ) {
        val candidates = runCatching { openingBook().likelyContinuationFens(game) }.getOrDefault(emptyList())
        val missing = candidates.distinct().filter { reviews.loadPosition(it, budget) == null }
        if (missing.isEmpty() || !owns(token, game.id)) return
        mutable.value =
            mutable.value.copy(
                warmingLibrary = true,
                libraryCached = 0,
                libraryTotal = missing.size,
            )
        try {
            PositionLibraryWarmer(engines, reviews, budget).warm(missing) { done, total ->
                if (owns(token, game.id)) {
                    mutable.value = mutable.value.copy(libraryCached = done, libraryTotal = total)
                }
            }
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: IOException) {
            // The played game is already complete and saved; future reviews can retry warming.
        } finally {
            if (owns(token, game.id)) mutable.value = mutable.value.copy(warmingLibrary = false)
        }
    }

    private suspend fun finishRun(
        started: Boolean,
        token: Long,
        game: GameView,
    ) {
        if (started && owns(token, game.id)) warmLibrary(token, game)
        if (owns(token, game.id)) {
            mutable.value =
                mutable.value.copy(
                    running = false,
                    warmingLibrary = false,
                    engineMissing = !started && game.plies.isNotEmpty(),
                )
        }
    }

    private fun positions(game: GameView): List<String> = listOf(game.startFen) + game.plies.map { it.fenAfter }

    private fun IOException.userMessage(): String = message?.takeIf(String::isNotBlank) ?: "Analysis failed"
}
