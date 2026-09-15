package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.startsWithBlack
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveGenerator
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.isActive
import kotlinx.serialization.Serializable
import kotlin.math.abs

/**
 * A mate as a centipawn score, so one subtraction reaches every reader and no mate special case is
 * needed. Any value past lichess' ±1000 ceiling would do (`docs/game-review.md`).
 */
private const val MATE_CP = 10_000

/** How the review's engine budget differs from the live one — see [ReviewBudget]. */
private const val REVIEW_NODES = 1_500_000L
private const val REVIEW_CAP_MS = 3_000L

private const val FULL_PERCENT = 100.0
private const val FEN_FULLMOVE_INDEX = 5

/**
 * The review pass's engine budget: **[nodes], the way lichess does it**, [capMs] only a safety
 * valve. Why, what 1.5 M buys, and why it is the cache KEY: `docs/game-review.md`.
 */
@Serializable
data class ReviewBudget(
    val nodes: Long = REVIEW_NODES,
    val capMs: Long = REVIEW_CAP_MS,
    val threads: Int = 2,
    val hashMb: Int = 64,
    /**
     * 1, because the review only reads the best line and extra slots cost depth in the same budget.
     * Settable only so `ReviewDepthMeasurement` can reproduce the live bar exactly.
     */
    val multiPv: Int = 1,
)

/**
 * One graded ply, in the unit the screen speaks: win expectancy for the side that moved. There is no
 * centipawn field — it was the unit until 2026-08-03 and it was the defect (`Accuracy.kt`).
 */
data class PlyGrade(
    val ply: Int,
    /** The move that was played, so a finding can name itself without the caller holding the game. */
    val san: String,
    /** Explicit identity from the position before the move; parity is wrong for imported FENs. */
    val whiteMoved: Boolean = ply % 2 == 1,
    /** FEN fullmove number, so an imported game does not restart its labels at move one. */
    val moveNumber: Int = (ply + 1) / 2,
    val quality: MoveQuality,
    /** The mover's winning chances before and after, 0..100. */
    val winBefore: Double,
    val winAfter: Double,
    /** Lichess' per-move accuracy for this ply, 0..100. */
    val accuracy: Double,
    /** The depth actually reached — the SHALLOWER of the two searches, which is the weight of the grade. */
    val depth: Int,
    /** The engine's own move in the position before this ply. Null when the search returned no line. */
    val bestSan: String?,
    val bestUci: String?,
    /** Its whole continuation from that position, in SAN — "what would have been better", spelled out. */
    val bestLine: List<String>,
    /**
     * Past lichess' ±1000 cp ceiling at BOTH ends: the move showed nothing and scores 100 % free.
     * Counting them cost Black nine points of their own defeat (`docs/game-review.md`).
     */
    val decided: Boolean,
    /** The engine's continuation in UCI, kept beside [bestLine] so the UI can replay it on a board. */
    val bestUciLine: List<String> = emptyList(),
    /** The mover could force mate before this move. */
    val mateBefore: Boolean = false,
    /** The same mover can still force mate after this move. */
    val mateAfter: Boolean = false,
    /** True when the played UCI exactly matched the engine's first move before this ply. */
    val playedBest: Boolean = false,
    /** The move stayed inside the same already-forced mating sequence. */
    val forcedMateLine: Boolean = false,
    /** Exact mate distance available to the mover before this move. */
    val mateInBefore: Int? = null,
    /** Absolute engine mate distance before this move, regardless of which side is winning. */
    val mateDistanceBefore: Int? = null,
    /** Absolute engine mate distance after this move, regardless of which side is winning. */
    val mateDistanceAfter: Int? = null,
)

val PlyGrade.missedMate: Boolean get() = mateBefore && !mateAfter && !playedBest

/**
 * One side's report. [accuracy] is over the plies that are evidence about this player — a RECOVERED
 * move counts like any other, a ply after a SEAM is not graded at all (`docs/game-review.md`).
 */
data class SideSummary(
    val plies: Int,
    /** How many of [plies] went into [accuracy]. The screen shows it — a rating owes its denominator. */
    val scored: Int,
    /** Null while nothing this side played has been graded yet. */
    val accuracy: Double?,
    val counts: Map<MoveQuality, Int>,
) {
    fun count(quality: MoveQuality): Int = counts[quality] ?: 0
}

/**
 * A game as far as it has been graded. [byPly] is SPARSE on purpose: the pass no longer runs to
 * completion before anything is shown, so a partial review is simply a grade over fewer plies.
 */
data class GameGrade(
    val byPly: Map<Int, PlyGrade>,
    /**
     * WHITE's win expectancy per POSITION; null where the engine has not been yet. The bar beside
     * the board reads the ply being looked at, never the tracker's current position.
     */
    val winWhite: List<Double?>,
    /** White-POV engine score per position, used for the score sheet's position trend. */
    val evalCp: List<Int?>,
    /** White-POV mate distance per position; magnitude is the remaining number of moves. */
    val evalMate: List<Int?>,
    val white: SideSummary,
    val black: SideSummary,
    val budget: ReviewBudget,
    /** Positions scored so far, out of the game's `plies + 1`. Equal means the review is finished. */
    val scored: Int,
    val positions: Int,
) {
    val complete: Boolean get() = scored >= positions

    fun of(ply: Int): PlyGrade? = byPly[ply]

    /**
     * The plies that decided the game, worst first — sorted by SWING and nothing else. A missed mate
     * is a curiosity, not a turning point, so it is [missedChances] instead (`docs/game-review.md`).
     */
    fun findings(): List<PlyGrade> =
        byPly.values
            .filter { it.quality >= MoveQuality.INACCURACY }
            .sortedByDescending { it.winBefore - it.winAfter }

    /**
     * The forced mates that were available and not taken, in the order they came up. One that also
     * cost a large share of the position appears in [findings] TOO: it is both things.
     */
    fun missedChances(): List<PlyGrade> = byPly.values.filter { it.missedMate }.sortedBy { it.ply }

    val forcedMatePlies: Int get() = byPly.values.count { it.forcedMateLine }

    fun missedMates(white: Boolean): Int = byPly.values.count { it.missedMate && it.whiteMoved == white }
}

/**
 * Grades a finished game with the engine, NEAREST THE PLY BEING LOOKED AT FIRST — the old pass
 * measured 25 of 84 positions in 55 s and showed nothing until done (`docs/game-review.md`).
 */
class GameReviewer(
    private val engineFactory: () -> UciEngine?,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    /**
     * Scores [game]'s positions until done or cancelled, handing the whole array to [onScored] each
     * time. [seed] resumes a stored run, [focus] is re-read per search. False: no engine for this ABI.
     */
    suspend fun review(
        game: GameView,
        seed: List<Score?> = emptyList(),
        focus: () -> Int = { 0 },
        onScored: suspend (List<Score?>) -> Unit,
    ): Boolean {
        val positions = listOf(game.startFen) + game.plies.map { it.fenAfter }
        val scores = MutableList<Score?>(positions.size) { seed.getOrNull(it) }
        // Nothing to search: an empty game, or one the store already had in full. Either way the
        // caller still gets the scores, so a reopened review paints from disk without an engine.
        if (game.plies.isEmpty() || scores.all { it != null }) {
            onScored(scores)
            return true
        }
        val engine = engineFactory() ?: return false
        try {
            engine.start(budget.threads, budget.hashMb)
            while (true) {
                val context = currentCoroutineContext()
                context.ensureActive()
                val next = nextIndex(scores, focus()) ?: break
                scores[next] = scoreOf(engine, positions[next]) { !context.isActive }
                context.ensureActive()
                onScored(scores.toList())
            }
        } finally {
            engine.close()
        }
        return true
    }

    private fun scoreOf(
        engine: UciEngine,
        fen: String,
        cancelled: () -> Boolean,
    ): Score = analyseReviewPosition(engine, fen, budget, cancelled)
}

/**
 * The next position to search: the unscored one closest to [focus]. A ply is the step between
 * positions `focus - 1` and `focus`, so its own index reaches both first, then walks outward.
 */
internal fun nextIndex(
    scores: List<Score?>,
    focus: Int,
): Int? =
    scores.indices
        .filter { scores[it] == null }
        .minByOrNull { abs(it - focus) }

/**
 * A terminal position's score is the outcome itself. Asking the engine returns an empty PV, which
 * reads as even — a checkmate would then grade the mating move as costing nothing.
 */
internal fun terminalScore(board: Board): Score? =
    when {
        board.isMated -> Score(if (board.sideToMove == Side.WHITE) -MATE_CP else MATE_CP, 0, mate = 0)
        board.isStaleMate || board.isDraw -> Score(0, 0)
        else -> null
    }

/** One position's verdict in white-POV centipawns, how deep the engine got, and the line it wants. */
data class Score(
    val cp: Int,
    val depth: Int,
    /** The engine's continuation from this position, in UCI. Empty for a terminal position. */
    val line: List<String> = emptyList(),
    /** Stockfish's signed mate distance from White's point of view. */
    val mate: Int? = null,
) {
    val bestUci: String? get() = line.firstOrNull()
}

internal fun cpOf(line: PvLine?): Int {
    val mate = line?.mate
    if (mate != null) return if (mate > 0) MATE_CP else -MATE_CP
    return line?.cp ?: 0
}

/**
 * The pure half: ply `i` is the step from `scores[i]` to `scores[i + 1]`, graded once both exist. It
 * takes the whole [game] because of SEAMS, whose first ply is skipped (`docs/game-review.md`).
 */
internal fun grade(
    game: GameView,
    scores: List<Score?>,
    budget: ReviewBudget,
): GameGrade {
    val plies = game.plies
    val whiteFirst = !startsWithBlack(game.startFen)
    val fensBefore = listOf(game.startFen) + plies.map { it.fenAfter }
    val skip = seamPlies(game)
    val byPly = LinkedHashMap<Int, PlyGrade>()
    val white = ArrayList<PlyGrade>()
    val black = ArrayList<PlyGrade>()
    plies.forEachIndexed { index, ply ->
        if (ply.ply in skip) return@forEachIndexed
        val before = scores.getOrNull(index) ?: return@forEachIndexed
        val after = scores.getOrNull(index + 1) ?: return@forEachIndexed
        val isWhite = (index % 2 == 0) == whiteFirst
        val graded = gradeOne(ply, isWhite, before, after, fensBefore[index])
        byPly[ply.ply] = graded
        (if (isWhite) white else black) += graded
    }
    return GameGrade(
        byPly = byPly,
        winWhite = scores.map { it?.let { score -> winChanceCeiled(score.cp) } },
        evalCp = scores.map { it?.cp },
        evalMate = scores.map { it?.mate },
        white = summarise(white),
        black = summarise(black),
        budget = budget,
        scored = scores.count { it != null },
        positions = plies.size + 1,
    )
}

/**
 * The first ply of every segment the app entered by a SEAM — the only plies whose "before" position
 * is not the result of the move before them.
 */
internal fun seamPlies(game: GameView): Set<Int> =
    game.segments
        .filter { it.enteredBy != null }
        .mapNotNull { it.plies.firstOrNull()?.ply }
        .toSet()

private fun gradeOne(
    ply: ReviewPly,
    whiteMoved: Boolean,
    before: Score,
    after: Score,
    fenBefore: String,
): PlyGrade {
    val winBefore = winFor(before.cp, whiteMoved)
    val winAfter = winFor(after.cp, whiteMoved)
    // Past the ceiling at both ends AND still the same side's game: a flip from won to lost is
    // saturated too, and is the largest blunder there is.
    val forcedMateLine = mateWinnerWhite(before) != null && mateWinnerWhite(before) == mateWinnerWhite(after)
    val decided = forcedMateLine || isDecided(before.cp) && isDecided(after.cp) && (before.cp > 0) == (after.cp > 0)
    // Floored at zero: a move that beats the engine's line at this depth is a NEGATIVE drop, and
    // letting it through would pay for a blunder elsewhere with a lucky best move.
    val drop = (winBefore - winAfter).coerceAtLeast(0.0)
    val bestUci = before.bestUci
    val playedBest = bestUci != null && bestUci == ply.uci
    val bestLine = sansOf(fenBefore, before.line)
    return PlyGrade(
        ply = ply.ply,
        san = ply.san,
        whiteMoved = whiteMoved,
        moveNumber = fenBefore.fullmoveNumberOr(ply.ply),
        quality = classify(drop, playedEngineMove = playedBest),
        winBefore = winBefore,
        winAfter = winAfter,
        accuracy = accuracyPercent(drop),
        depth = minOf(before.depth, after.depth),
        bestSan = bestLine.firstOrNull() ?: bestUci,
        bestUci = bestUci,
        bestLine = bestLine,
        decided = decided,
        bestUciLine = before.line,
        mateBefore = moverMateIn(before, whiteMoved) != null,
        mateAfter = moverMateIn(after, whiteMoved) != null,
        playedBest = playedBest,
        forcedMateLine = forcedMateLine,
        mateInBefore = moverMateIn(before, whiteMoved),
        mateDistanceBefore = before.mate?.let(::abs),
        mateDistanceAfter = after.mate?.let(::abs),
    )
}

private fun String.fullmoveNumberOr(ply: Int): Int =
    trim().split(Regex("\\s+")).getOrNull(FEN_FULLMOVE_INDEX)?.toIntOrNull() ?: (ply + 1) / 2

private fun moverMateIn(
    score: Score,
    whiteMoved: Boolean,
): Int? {
    val winnerWhite = mateWinnerWhite(score) ?: return null
    return score.mate?.takeIf { winnerWhite == whiteMoved }?.let(::abs)
}

private fun mateWinnerWhite(score: Score): Boolean? = score.mate?.let { if (it == 0) score.cp > 0 else it > 0 }

/** Win expectancy for the side that just moved, 0..100, through lichess' ceiling. */
private fun winFor(
    whitePovCp: Int,
    whiteMoved: Boolean,
): Double = winChanceCeiled(whitePovCp).let { if (whiteMoved) it else FULL_PERCENT - it }

private fun summarise(plies: List<PlyGrade>): SideSummary {
    val evidence = plies.filterNot { it.decided }
    return SideSummary(
        plies = plies.size,
        scored = evidence.size,
        accuracy = gameAccuracy(evidence.map { it.accuracy }),
        counts = plies.groupingBy { it.quality }.eachCount(),
    )
}

/**
 * SAN for display. An unparsable move falls back to its UCI rather than showing nothing — the point
 * of the line is "play this instead", and `e2e4` still says it.
 */
internal fun sanOf(
    fen: String,
    uci: String,
): String =
    runCatching {
        val side = Board().apply { loadFromFen(fen) }.sideToMove
        MoveList(fen).apply { add(Move(uci, side)) }.toSanArray().first()
    }.getOrDefault(uci)

/**
 * A whole UCI line as SAN, replayed from [fen]. Truncated at the first move chesslib will not play
 * rather than abandoned: half a line is still an idea.
 */
internal fun sansOf(
    fen: String,
    line: List<String>,
): List<String> {
    if (line.isEmpty()) return emptyList()
    val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: return emptyList()
    val moves = MoveList(fen)
    for (uci in line) {
        // The same generated-legality check `GameView.replay` needs: chesslib will happily apply an
        // illegal move and every SAN after it would be a fabrication.
        val move =
            runCatching { Move(uci, board.sideToMove) }
                .getOrNull()
                ?.takeIf { candidate -> MoveGenerator.generateLegalMoves(board).any { it.toString() == candidate.toString() } }
                ?: break
        moves.add(move)
        board.doMove(move)
    }
    return runCatching { moves.toSanArray().toList() }.getOrDefault(emptyList())
}

/** One step of an engine line, including the untouched starting position at index zero. */
data class LineFrame(
    val fen: String,
    val lastMoveUci: String?,
)

/** Replay as much of an engine line as is legal, never fabricating positions after a broken move. */
internal fun lineFrames(
    startFen: String,
    uciLine: List<String>,
): List<LineFrame> {
    val board = runCatching { Board().apply { loadFromFen(startFen) } }.getOrNull() ?: return emptyList()
    val frames = mutableListOf(LineFrame(board.fen, null))
    for (uci in uciLine) {
        val move =
            runCatching { Move(uci, board.sideToMove) }
                .getOrNull()
                ?.takeIf { candidate -> MoveGenerator.generateLegalMoves(board).any { it.toString() == candidate.toString() } }
                ?: break
        board.doMove(move)
        frames += LineFrame(board.fen, uci)
    }
    return frames
}
