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

/**
 * Per-move loss cap applied before AVERAGING, in centipawns. Classification never sees it.
 *
 * [MATE_CP] is 10 000 so the BANDS come out right: losing a forced mate must outrank every ordinary
 * blunder, and mate-in-5 -> mate-in-9 must cost nothing because both ends of the subtraction are the
 * same number. Feeding that straight into a mean is a different question, and it destroys it — over
 * a 42-ply side one such ply contributes 238 cp on its own.
 *
 * Measured on the device, 2026-08-03, the real 83-ply game `2026-08-02_2159`: the card read
 * **"White · 526 cp average loss over 42 plies · best 21"**, which is self-contradicting on its
 * face. Seven mate-scored plies were the whole 526.
 *
 * Lichess caps per-move loss before averaging for exactly this reason and 1000 is its figure — a
 * whole queen, past which "how much worse" has stopped measuring the move and started measuring the
 * position. 1000 and 10 000 are both far inside BLUNDER, so no ply changes band.
 */
private const val CP_LOSS_CAP = 1_000

/** How the review's engine budget differs from the live one — see [ReviewBudget]. */
private const val REVIEW_DEPTH = 30
private const val REVIEW_MOVETIME_MS = 3_000L

/**
 * The review pass's engine budget, and why it is not the live one.
 *
 * The eval bar runs `movetime 400` because it must not cost the tracker a frame. A grade is a
 * different claim: "this move lost the game" read at whatever depth 400 ms happened to reach is a
 * statement about the depth as much as about the move. **Measured on the device, 2026-08-03, over
 * the real 83-ply game `2026-08-02_2159`: 14 plies — one in six — change class between the two.**
 * Among them ply 57, which 400 ms called a BLUNDER at 9052 cp and a deeper search called an
 * INACCURACY at 95 cp. So the live budget is emphatically not a verdict.
 *
 * **[movetimeMs] is the budget and [depth] is only an early-out. That is the second thing the same
 * measurement decided, against the first design.** This started as `depth 16` capped at 3000 ms,
 * on the argument that a depth bound makes a grade reproducible across devices where a time bound
 * makes it a function of how hot the phone is. The run killed it twice over:
 *
 * - depth 16 cost **332 ms** per position against the live bar's 383, and reached a median depth of
 *   16 against its 15. It was not a bigger budget at all — it was the same budget with the multiPv
 *   slots spent differently, which is no basis for overruling it.
 * - worse, it was sometimes SHALLOWER. In a sparse endgame 400 ms reaches depth 31, so a depth-16
 *   bound stops early and throws the rest of the allowance away: at ply 68 the live readout was
 *   BEST at depth 31 and the "deep" one BLUNDER at depth 16. Three of the fourteen disagreements
 *   are this, not the reverse.
 *
 * A depth bound below what the live bar already reaches is a downgrade wearing the word "deep". So
 * [depth] is set above anything 400 ms buys and the time cap does the real bounding; the early-out
 * only saves the wall clock in positions the engine has genuinely exhausted. Cross-device
 * reproducibility was the price, and it was worth less than not being shallower than the eval bar.
 *
 * A ply reports the depth it actually reached and the UI shows it, so a grade is never presented as
 * more than the search behind it.
 */
data class ReviewBudget(
    val depth: Int = REVIEW_DEPTH,
    val movetimeMs: Long = REVIEW_MOVETIME_MS,
    val threads: Int = 2,
    val hashMb: Int = 64,
    /**
     * 1, because the review only ever reads the best line — the extra slots cost search depth in
     * the same wall clock. It is settable so `ReviewDepthMeasurement` can reproduce the live eval
     * bar's readout exactly (`movetime 400`, `multiPv 3`) and compare the two.
     */
    val multiPv: Int = 1,
)

/** One graded ply. [depth] is the depth actually reached, which is the weight of the grade. */
data class PlyGrade(
    val ply: Int,
    /**
     * The RAW loss, uncapped — a thrown-away mate really is [MATE_CP]. [SideSummary.averageCpLoss]
     * is where the cap belongs; a number shown against one ply should not be quietly clipped.
     */
    val cpLoss: Int,
    val quality: MoveQuality,
    val depth: Int,
    /** Either end of this ply's subtraction was a forced mate, so [cpLoss] is not a pawn count. */
    val mateScored: Boolean,
)

/** One side's report. Counts per band plus average centipawn loss — no invented accuracy formula. */
data class SideSummary(
    val plies: Int,
    /** Mean of the per-ply losses, each clamped to `0..`[CP_LOSS_CAP] first. */
    val averageCpLoss: Int,
    /**
     * How many of [plies] were scored against a forced mate. Reported because it is exactly where
     * [averageCpLoss] means least: in a won endgame most plies are mate-scored, every one of them is
     * clamped, and the mean stops being a centipawn measurement at all.
     */
    val mateScoredPlies: Int,
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
    fun findings(): List<PlyGrade> = plies.filter { it.quality == MoveQuality.BLUNDER || it.quality == MoveQuality.MISTAKE }
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

    private fun scoreOf(
        engine: UciEngine,
        fen: String,
    ): Score {
        val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: return Score(0, 0)
        terminalScore(board)?.let { return it }
        val whiteToMove = board.sideToMove == Side.WHITE
        val best =
            runCatching { engine.analyse(fen, budget.movetimeMs, budget.multiPv, depth = budget.depth) }
                .getOrNull()
                ?.firstOrNull()
                ?.toWhitePov(whiteToMove)
        return Score(cpOf(best), best?.depth ?: 0)
    }
}

/**
 * A terminal position has no move to evaluate and no line to ask for; its score is the outcome
 * itself. Asking the engine anyway returns an empty PV, which would read as an even position — so
 * a checkmate would grade the mating move as costing nothing.
 */
private fun terminalScore(board: Board): Score? =
    when {
        board.isMated -> Score(if (board.sideToMove == Side.WHITE) -MATE_CP else MATE_CP, 0)
        board.isStaleMate || board.isDraw -> Score(0, 0)
        else -> null
    }

/** One position's verdict in white-POV centipawns, and how deep the engine got to it. */
internal data class Score(
    val cp: Int,
    val depth: Int,
) {
    /** A forced mate either way. The score is a flag by then, not a pawn count. */
    val mate: Boolean get() = cp == MATE_CP || cp == -MATE_CP
}

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
            PlyGrade(ply, loss, classify(loss), minOf(before.depth, after.depth), before.mate || after.mate)
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
        // Two clamps, for two different reasons. The floor: a move that beats the engine's line at
        // this depth is a NEGATIVE loss, and letting it subtract would pay for a blunder with a
        // lucky best move. The ceiling: see CP_LOSS_CAP — a mate is scored at 10 000 so the bands
        // rank it correctly, and averaging that raw made the headline number meaningless.
        averageCpLoss = if (plies.isEmpty()) 0 else plies.sumOf { it.cpLoss.coerceIn(0, CP_LOSS_CAP) } / plies.size,
        mateScoredPlies = plies.count { it.mateScored },
        counts = plies.groupingBy { it.quality }.eachCount(),
    )
