package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.StoredMove
import com.chesslab.tracker.games.reviewView
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The measurement `entry.md` asks for: **how many plies change class** between the LIVE eval bar's
 * budget and the review pass's.
 *
 * 400 ms at `multiPv 3` is a live readout, not a verdict — a blunder found there can be a phantom of
 * the depth rather than of the move. That number decides the review budget, and nothing else may.
 *
 * It is skipped without a real engine, because the answer is a property of Stockfish on the device
 * it runs on and a scripted process would be a fabrication of it. To take it:
 *
 * ```
 * gradlew.bat :app:testDebugUnitTest --tests '*ReviewDepthMeasurement*' -Pchesslab.uci=<stockfish>
 * ```
 *
 * `-Pchesslab.uci.game=<file>` takes the SAN move text from a file instead of [DEVICE_GAME].
 *
 * It asserts only that both passes graded the same plies. The class-change count is the OUTPUT, and
 * a threshold on it would be exactly the taste the pack rules out.
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

    /** SAN move text (a PGN movetext body) -> the same projection the review screen renders. */
    private fun gameOf(path: String): GameView {
        val text = path.takeIf { it.isNotBlank() }?.let { File(it).readText() } ?: DEVICE_GAME
        val moves = MoveList().apply { loadFromSan(text) }
        val sans = moves.toSanArray()
        return StoredGame(
            id = "measurement",
            startFen = moves.startFen,
            startedAtEpochMs = 0,
            finishedAtEpochMs = 0,
            profileName = "measurement",
            result = "*",
            moves = moves.mapIndexed { index, move -> StoredMove(index + 1, sans[index], move.toString(), 0L) },
        ).reviewView()
    }

    private companion object {
        /** The live eval bar's own budget, verbatim from [AnalysisOptions]'s defaults. */
        val LIVE_BUDGET = ReviewBudget(nodes = Long.MAX_VALUE, capMs = 400, multiPv = 3)

        /**
         * A game the tracker really recorded — `data/_device/20260728-runaway/games/2026-07-26_2311`,
         * 33 plies. Inlined rather than read from `data/`, which is gitignored.
         *
         * It is deliberately a tracked game and not a clean one: it is full of the sharp, half-wrong
         * positions this grader will actually be pointed at, which is where a shallow search is most
         * likely to disagree with a deeper one.
         */
        const val DEVICE_GAME =
            "1. d4 d5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nh4 Nh5 5. Nxd5 Nxd4 6. Qxd4 Nf4 7. e4 Nxd5 8. " +
                "exd5 e6 9. Bb5+ Qd7 10. Bxd7+ Kxd7 11. dxe6+ Ke8 12. Qa4+ Kd8 13. Bg5+ Be7 14. " +
                "Bxe7+ Nf5+ 15. Qe4+ Kf6 16. Nxg7 h5 17. Nf5 O-O-O"
    }
}
