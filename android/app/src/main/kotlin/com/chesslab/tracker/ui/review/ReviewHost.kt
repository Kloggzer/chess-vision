package com.chesslab.tracker.ui.review

import android.content.Context
import com.chesslab.tracker.analysis.OpeningBook
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.ui.analysis.EngineServiceHost
import com.chesslab.tracker.ui.games.gamesDir
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Process-scoped: a pass takes minutes, and leaving the screen once killed it silently. ONE review at a
 *  time ([of] cancels the old run); visible and stoppable from every screen via [model]; not under
 *  `gateBlock`. No foreground service: the reviewer persists after EVERY position. */
object ReviewHost {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val current = MutableStateFlow<ReviewViewModel?>(null)

    /** Never cleared, so the banner keeps reading it. */
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
            EngineServiceHost.of(context),
            scope,
            openingBook = { openingBook.value },
        )
    }
}
