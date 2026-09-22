package com.chesslab.tracker.ui.review

import android.content.Context
import com.chesslab.tracker.analysis.OpeningBook
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.gamesDir
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Where the grading run lives, and the reason it is not the screen.
 *
 * The review screen used to build its [ReviewViewModel] on `rememberCoroutineScope()`, so the job
 * died with the composition: switching tabs was safe, and **leaving the screen killed a pass that
 * takes minutes** — silently, in a way that then looked like a finished review with a partial
 * answer. "also changing view stop the analysis?" (2026-08-04). It did.
 *
 * The scope is the process instead. What that buys is exactly the user's instinct: leaving a screen
 * does not destroy work. What it costs is an engine that keeps two threads busy after the screen is
 * gone, and that cost is the reason for the two rules below.
 *
 * - **One review at a time.** [of] hands out ONE model for the process; opening a different game
 *   cancels the run in flight ([ReviewViewModel.load]) rather than starting a second Stockfish.
 * - **It must be visible and stoppable from outside.** [model] is what the app bar's analysis banner
 *   reads, on every screen, and that banner carries the only Stop control there is.
 * - **Not under `gateBlock`.** Heat, battery and frame budget never reach it, deliberately: it is
 *   started by the user, visible and stoppable (`docs/game-review.md`).
 *
 * There is deliberately no foreground service. specs/43 needed one for the tracker because the
 * tracker owns the camera and must survive the app being backgrounded for a whole game; a review is
 * minutes, is restartable, and — crucially — [com.chesslab.tracker.analysis.GameReviewer] persists
 * after EVERY position, so the worst a kill can cost is one search.
 */
object ReviewHost {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val current = MutableStateFlow<ReviewViewModel?>(null)

    /** Null until a review screen has been opened once; never cleared, so the banner keeps reading it. */
    val model: StateFlow<ReviewViewModel?> = current

    @Synchronized
    fun of(context: Context): ReviewViewModel = current.value ?: build(context.applicationContext).also { current.value = it }

    private fun build(context: Context): ReviewViewModel {
        val dir = gamesDir(context)
        val openingBook =
            lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
                context.assets.open("openings/openings.tsv").use { openings ->
                    context.assets.open("openings/continuations.tsv").use { continuations ->
                        OpeningBook.load(openings, continuations)
                    }
                }
            }
        return ReviewViewModel(
            GameStore(dir),
            ReviewStore(dir),
            stockfishEngineFactory(context),
            scope,
            openingBook = { openingBook.value },
        )
    }
}
