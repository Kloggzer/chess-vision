package com.chesslab.tracker.analysis

import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.reviewView
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.gamesDir
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import kotlin.system.measureTimeMillis

/**
 * **How many plies change class** between the live eval bar's budget and the review pass's, on a
 * real game, on the real phone. The number `specs/42/entry.md` says must decide the review budget.
 *
 * It has to run HERE and not on a desktop. 400 ms is a wall-clock bound, so what it buys is a
 * property of this SoC at this thermal state — measuring it on a laptop measures the laptop. The
 * JVM-side `ReviewDepthMeasurementTest` exists for a machine with a host Stockfish; this one is the
 * answer for the device that ships.
 *
 *     gradlew.bat :app:connectedDebugAndroidTest --tests "*ReviewBudgetBenchmark*"
 *     -Pandroid.testInstrumentationRunnerArguments.game=<id>   # default: the newest stored game
 *
 * Results go to logcat under [TAG]. It asserts only that both passes graded the same plies: a
 * threshold on the class-change count would be exactly the taste the pack rules out, and it would
 * encode today's phone.
 */
class ReviewBudgetBenchmark {
    @Test
    fun classChangesBetweenTheLiveBudgetAndTheReviewBudget() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = GameStore(gamesDir(context))
        val id = InstrumentationRegistry.getArguments().getString("game") ?: store.list().firstOrNull()?.id
        assumeTrue("no stored game on this device", id != null)
        val game = store.open(id!!)?.reviewView()
        assumeTrue("game $id did not open", game != null)
        assumeTrue("game $id has no plies", game!!.plies.isNotEmpty())

        val live = run(context, game, LIVE_BUDGET, "live")
        val deep = run(context, game, proposedBudget(), "deep")
        assertEquals(live.plies.size, deep.plies.size)

        val changed = live.plies.indices.filter { live.plies[it].quality != deep.plies[it].quality }
        Log.i(TAG, "game $id · ${live.plies.size} plies · CLASS CHANGES ${changed.size}")
        Log.i(TAG, "live depth median ${median(live)} · deep depth median ${median(deep)}")
        Log.i(TAG, "live acpl W ${live.white.averageCpLoss} B ${live.black.averageCpLoss}")
        Log.i(TAG, "deep acpl W ${deep.white.averageCpLoss} B ${deep.black.averageCpLoss}")
        Log.i(TAG, "mate-scored plies W ${deep.white.mateScoredPlies} B ${deep.black.mateScoredPlies}")
        changed.forEach {
            val a = live.plies[it]
            val b = deep.plies[it]
            Log.i(TAG, "ply ${a.ply}: ${a.quality} (${a.cpLoss} cp @${a.depth}) -> ${b.quality} (${b.cpLoss} cp @${b.depth})")
        }
    }

    private fun run(
        context: android.content.Context,
        game: GameView,
        budget: ReviewBudget,
        label: String,
    ): GameGrade {
        var grade: GameGrade? = null
        val elapsed =
            measureTimeMillis {
                grade = runBlocking { GameReviewer(stockfishEngineFactory(context), budget).review(game) }
            }
        val result = grade ?: error("no engine binary for this ABI")
        val positions = result.plies.size + 1
        Log.i(TAG, "$label · $positions positions in $elapsed ms · ${elapsed / positions} ms per position · $budget")
        return result
    }

    private fun median(grade: GameGrade): Int = grade.plies.map { it.depth }.sorted()[grade.plies.size / 2]

    /** The candidate under test — [ReviewBudget]'s shipped defaults unless the run overrides them. */
    private fun proposedBudget(): ReviewBudget {
        val args = InstrumentationRegistry.getArguments()
        val default = ReviewBudget()
        return default.copy(
            depth = args.getString("depth")?.toIntOrNull() ?: default.depth,
            movetimeMs = args.getString("cap")?.toLongOrNull() ?: default.movetimeMs,
        )
    }

    private companion object {
        const val TAG = "ReviewBudget"

        /** The live eval bar's own budget, verbatim from [AnalysisOptions]'s defaults. */
        val LIVE_BUDGET = ReviewBudget(depth = 99, movetimeMs = 400, multiPv = 3)
    }
}
