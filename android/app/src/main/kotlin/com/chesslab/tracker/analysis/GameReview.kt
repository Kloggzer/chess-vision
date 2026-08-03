package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.startsWithBlack
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

/**
 * A mate, as a centipawn score, so one subtraction grades every ply.
 *
 * Far outside the blunder band, so losing a forced mate is a blunder and mate-in-5 -> mate-in-9 is
 * not a loss at all — both sides of the subtraction are this same number.
 */
private const val MATE_CP = 10_000

/** How the review's engine budget differs from the live one — see [ReviewBudget]. */
private const val REVIEW_DEPTH = 16
private const val REVIEW_MOVETIME_MS = 3_000L

/**
 * The review pass's engine budget, and why it is not the live one.
 *
 * The eval bar runs `movetime 400` because it must not cost the tracker a frame. A grade is a
 * different claim: "this move lost the game" read at whatever depth 400 ms happened to reach is a
 * statement about the depth as much as about the move.
 *
 * So the review searches to a fixed DEPTH, capped by a movetime it may not exceed. Depth first
 * because a grade should not depend on how hot the phone is — two phones grading the same game
 * agree wherever both reach [depth]. The cap is what stops a hard position from running forever;
 * a ply graded at the cap reports the shallower depth it actually reached, and the UI shows it.
 */
data class ReviewBudget(
    val depth: Int = REVIEW_DEPTH,
    val movetimeMs: Long = REVIEW_MOVETIME_MS,
    val threads: Int = 2,
    val hashMb: Int = 64,
)

/** One graded ply. [depth] is the depth actually reached, which is the weight of the grade. */
data class PlyGrade(
    val ply: Int,
    val cpLoss: Int,
    val quality: MoveQuality,
    val depth: Int,
)

/** One side's report. Counts per band plus average centipawn loss — no invented accuracy formula. */
data class SideSummary(
    val plies: Int,
    val averageCpLoss: Int,
    val counts: Map<MoveQuality, Int>,
) {
    fun count(quality: MoveQuality): Int = counts[quality] ?: 0
}

/** A graded game. [plies] is dense and in ply order, so `plies[n - 1]` is ply `n`. */
data class GameGrade(
    val plies: List<PlyGrade>,
    val white: SideSummary,
    val black: SideSummary,
    val budget: ReviewBudget,
) {
    fun of(ply: Int): PlyGrade? = plies.getOrNull(ply - 1)?.takeIf { it.ply == ply }

    /** The plies worth opening the screen for, worst first. */
    fun findings(): List<PlyGrade> =
        plies.filter { it.quality == MoveQuality.BLUNDER || it.quality == MoveQuality.MISTAKE }
}

/** How far a run has got, for a screen that must not look frozen for a minute. */
data class ReviewProgress(
    val done: Int,
    val total: Int,
)

/**
 * Grades every ply of a finished game with the engine.
 *
 * The maths is [cpLoss] and [classify] verbatim — both were written for this pass and, until this
 * class existed, called by nothing but their own unit test. Nothing here re-implements them.
 *
 * One position at a time on one engine process: a review is a background chore, not a race, and
 * this may run while the tracker still owns the camera.
 */
class GameReviewer(
    private val engineFactory: () -> UciEngine?,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    /**
     * Analyses the [game]'s positions and grades its plies. Cancellable at every position, and it
     * returns null when no engine binary shipped for this ABI.
     *
     * [onProgress] is called from this coroutine, once per analysed position.
     */
    suspend fun review(
        game: GameView,
        onProgress: (ReviewProgress) -> Unit = {},
    ): GameGrade? {
        val plies = game.plies
        if (plies.isEmpty()) return null
        val engine = engineFactory() ?: return null
        val positions = listOf(game.startFen) + plies.map { it.fenAfter }
        val scores = ArrayList<Score>(positions.size)
        try {
            engine.start(budget.threads, budget.hashMb)
            positions.forEachIndexed { index, fen ->
                currentCoroutineContext().ensureActive()
                scores += scoreOf(engine, fen)
                onProgress(ReviewProgress(index + 1, positions.size))
            }
        } finally {
            engine.close()
        }
        return grade(plies.map { it.ply }, startsWithBlack(game.startFen), scores, budget)
    }

    /**
     * A terminal position has no move to evaluate and no line to ask for; its score is the outcome
     * itself. Asking the engine anyway returns an empty PV that would read as an even position.
     */
    private fun scoreOf(
        engine: UciEngine,
        fen: String,
    ): Score {
        val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: return Score(0, 0)
        val whiteToMove = board.sideToMove == Side.WHITE
        if (board.isMated) return Score(if (whiteToMove) -MATE_CP else MATE_CP, 0)
        if (board.isStaleMate || board.isDraw) return Score(0, 0)
        val best =
            runCatching { engine.analyse(fen, budget.movetimeMs, multiPv = 1, depth = budget.depth) }
                .getOrNull()
                ?.firstOrNull()
                ?.toWhitePov(whiteToMove)
        return Score(cpOf(best), best?.depth ?: 0)
    }
}

/** One position's verdict in white-POV centipawns, and how deep the engine got to it. */
internal data class Score(
    val cp: Int,
    val depth: Int,
)

private fun cpOf(line: PvLine?): Int {
    val mate = line?.mate
    if (mate != null) return if (mate > 0) MATE_CP else -MATE_CP
    return line?.cp ?: 0
}

/**
 * The pure half: [scores] holds one score per position, so ply `i` is the step from `scores[i]` to
 * `scores[i + 1]`. Split out from the engine loop because this is the part worth testing.
 *
 * A ply's grade is weighted by the SHALLOWER of the two searches that produced it — a loss measured
 * against a position the engine only reached depth 9 on is a depth-9 claim whatever the other end
 * managed.
 */
internal fun grade(
    plyNumbers: List<Int>,
    startsWithBlack: Boolean,
    scores: List<Score>,
    budget: ReviewBudget,
): GameGrade {
    val graded =
        plyNumbers.mapIndexed { index, ply ->
            val before = scores[index]
            val after = scores[index + 1]
            val loss = cpLoss(before.cp, after.cp, whiteMoved = whiteMoved(index, startsWithBlack))
            PlyGrade(ply, loss, classify(loss), minOf(before.depth, after.depth))
        }
    val byWhite = graded.filterIndexed { index, _ -> whiteMoved(index, startsWithBlack) }
    return GameGrade(
        plies = graded,
        white = summarise(byWhite),
        black = summarise(graded - byWhite.toSet()),
        budget = budget,
    )
}

/** Index 0 is White unless the game was adopted on Black's turn. */
private fun whiteMoved(
    index: Int,
    startsWithBlack: Boolean,
): Boolean = (index % 2 == 0) != startsWithBlack

private fun summarise(plies: List<PlyGrade>): SideSummary =
    SideSummary(
        plies = plies.size,
        // Only losses count toward ACPL. A move that beats the engine's line at this depth is a
        // negative loss, and letting it subtract would pay for a blunder with a lucky best move.
        averageCpLoss = if (plies.isEmpty()) 0 else plies.sumOf { maxOf(0, it.cpLoss) } / plies.size,
        counts = plies.groupingBy { it.quality }.eachCount(),
    )
