package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GameView
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * How many plies change class between the LIVE bar's budget and the review's (`entry.md`); skipped
 * without a real engine: `:app:testDebugUnitTest --tests '*ReviewDepthMeasurement*' -Pchesslab.uci=<stockfish>`
 * (`-Pchesslab.uci.game=<file>` for other SAN). The count is the OUTPUT, never a threshold.
 */
class ReviewDepthMeasurementTest {
    @Test
    fun classChangesBetweenTheLiveBudgetAndTheReviewBudget() {
        val enginePath = System.getProperty("chesslab.uci").orEmpty()
        assumeTrue(enginePath.isNotBlank() && File(enginePath).canExecute(), "no UCI engine: pass -Pchesslab.uci=<path>")
        val game = gameOf(System.getProperty("chesslab.uci.game").orEmpty())

        val live = review(enginePath, game, LIVE_BUDGET)
        val deep = review(enginePath, game, ReviewBudget())
        assertEquals(live.byPly.keys, deep.byPly.keys)

        val changed = live.byPly.filter { (ply, a) -> deep.of(ply)!!.quality != a.quality }
        println("plies ${live.byPly.size} · class changes ${changed.size}")
        println("live  ${LIVE_BUDGET.capMs} ms multiPv ${LIVE_BUDGET.multiPv} · median depth ${median(live)}")
        println("deep  nodes ${ReviewBudget().nodes} cap ${ReviewBudget().capMs} ms · median depth ${median(deep)}")
        println("accuracy live W ${live.white.accuracy} B ${live.black.accuracy}")
        println("accuracy deep W ${deep.white.accuracy} B ${deep.black.accuracy}")
        changed.forEach { (ply, a) ->
            val b = deep.of(ply)!!
            println("ply $ply: ${a.quality} (${a.winBefore}->${a.winAfter} @${a.depth}) -> ${b.quality} @${b.depth}")
        }
    }

    private fun review(
        enginePath: String,
        game: GameView,
        budget: ReviewBudget,
    ): GameGrade =
        runBlocking {
            var last: List<Score?> = emptyList()
            val started = GameReviewer({ UciEngine(enginePath) }, budget).review(game) { last = it }
            if (!started) error("the engine produced no grade")
            grade(game, last, budget)
        }

    private fun median(grade: GameGrade): Int {
        val depths = grade.byPly.values.map { it.depth }
        return depths.sorted()[depths.size / 2]
    }

    private fun gameOf(path: String): GameView = reviewGameOf(path.takeIf { it.isNotBlank() }?.let { File(it).readText() } ?: DEVICE_GAME)

    private companion object {
        /** The live eval bar's own budget, verbatim from [AnalysisOptions]'s defaults. */
        val LIVE_BUDGET = ReviewBudget(nodes = Long.MAX_VALUE, capMs = 400, multiPv = 3)

        /** `data/_device/20260728-runaway/games/2026-07-26_2311`, 33 plies, inlined (`data/` is gitignored);
         *  tracked, not clean, so full of the half-wrong positions a shallow search misjudges. */
        const val DEVICE_GAME =
            "1. d4 d5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nh4 Nh5 5. Nxd5 Nxd4 6. Qxd4 Nf4 7. e4 Nxd5 8. " +
                "exd5 e6 9. Bb5+ Qd7 10. Bxd7+ Kxd7 11. dxe6+ Ke8 12. Qa4+ Kd8 13. Bg5+ Be7 14. " +
                "Bxe7+ Nf5+ 15. Qe4+ Kf6 16. Nxg7 h5 17. Nf5 O-O-O"
    }
}
