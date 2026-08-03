package com.chesslab.tracker.analysis

import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.reviewView
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.gamesDir
import kotlinx.coroutines.runBlocking
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * **How long the first readable thing takes**, on a real game, on the real phone — plus what the
 * whole pass costs. The numbers `specs/44` is judged on.
 *
 * It has to run HERE and not on a desktop: `movetime` is a wall-clock bound, so what it buys is a
 * property of this SoC at this thermal state. The JVM-side `ReviewDepthMeasurementTest` exists for a
 * machine with a host Stockfish; this one is the answer for the device that ships.
 *
 *     gradlew.bat :app:connectedDebugAndroidTest --tests "*ReviewBudgetBenchmark*"
 *     -Pandroid.testInstrumentationRunnerArguments.game=<id>   # default: the newest stored game
 *
 * Results go to logcat under [TAG]. It asserts nothing: a threshold on any of this would encode
 * today's phone, which is exactly the taste the pack rules out.
 */
class ReviewBudgetBenchmark {
    @Test
    fun howLongUntilTheScreenSaysSomething() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = GameStore(gamesDir(context))
        val id = InstrumentationRegistry.getArguments().getString("game") ?: store.list().firstOrNull()?.id
        assumeTrue("no stored game on this device", id != null)
        val game = store.open(id!!)?.reviewView()
        assumeTrue("game $id did not open", game != null)
        assumeTrue("game $id has no plies", game!!.plies.isNotEmpty())

        // The screen opens on the LAST ply, so that is where a real run starts grading.
        val focus = game.plies.size
        val budget = proposedBudget()
        val started = System.nanoTime()
        var firstGrade = 0L
        var searches = 0
        var final: GameGrade? = null
        runBlocking {
            GameReviewer(stockfishEngineFactory(context), budget).review(game, focus = { focus }) { scores ->
                searches++
                val graded = grade(game.plies, game.startFen, scores, budget)
                if (firstGrade == 0L && graded.byPly.isNotEmpty()) {
                    firstGrade = (System.nanoTime() - started) / MS
                    Log.i(TAG, "FIRST GRADE after $searches searches · $firstGrade ms · ply ${graded.byPly.keys.first()}")
                }
                final = graded
            }
        }
        val total = (System.nanoTime() - started) / MS
        val done = final ?: error("no engine binary for this ABI")
        Log.i(TAG, "game $id · ${done.positions} positions in $total ms · ${total / done.positions} ms each · $budget")
        Log.i(TAG, "first grade $firstGrade ms · whole pass $total ms")
        Log.i(TAG, "accuracy W ${done.white.accuracy} over ${done.white.scored}/${done.white.plies}")
        Log.i(TAG, "accuracy B ${done.black.accuracy} over ${done.black.scored}/${done.black.plies}")
        Log.i(TAG, "rebuilt ${done.rebuilt().size} · decided ${done.byPly.values.count { it.decided }}")
        MoveQuality.entries.forEach { q ->
            Log.i(TAG, "  $q W ${done.white.count(q)} B ${done.black.count(q)}")
        }
        done.findings().take(TOP_FINDINGS).forEach {
            Log.i(TAG, "  finding ply ${it.ply} ${it.quality} ${it.winBefore}->${it.winAfter} best ${it.bestSan} @${it.depth}")
        }
    }

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
        const val MS = 1_000_000L
        const val TOP_FINDINGS = 8
    }
}
