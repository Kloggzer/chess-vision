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

/** A mate as centipawns past lichess' ±1000 ceiling, so one subtraction serves every reader. */
private const val MATE_CP = 10_000

private const val REVIEW_NODES = 1_500_000L
private const val REVIEW_CAP_MS = 3_000L

private const val FULL_PERCENT = 100.0
private const val FEN_FULLMOVE_INDEX = 5

/** Budget in [nodes], as lichess does; [capMs] is only a safety valve (`docs/game-review.md`). */
@Serializable
data class ReviewBudget(
    val nodes: Long = REVIEW_NODES,
    val capMs: Long = REVIEW_CAP_MS,
    val threads: Int = 2,
    val hashMb: Int = 64,
    /** 1: extra PV slots cost depth in the same budget. Settable only for `ReviewDepthMeasurement`. */
    val multiPv: Int = 1,
) {
    val profile: EngineProfile get() = EngineProfile(threads, hashMb)
}

/** Win expectancy for the mover — there is deliberately no centipawn field (`Accuracy.kt`). */
data class PlyGrade(
    val ply: Int,
    val san: String,
    /** Explicit identity from the position before the move; parity is wrong for imported FENs. */
    val whiteMoved: Boolean = ply % 2 == 1,
    /** FEN fullmove number, so an imported game does not restart its labels at move one. */
    val moveNumber: Int = (ply + 1) / 2,
    val quality: MoveQuality,
    val winBefore: Double,
    val winAfter: Double,
    val accuracy: Double,
    /** The depth actually reached — the SHALLOWER of the two searches, which is the weight of the grade. */
    val depth: Int,
    val bestSan: String?,
    val bestUci: String?,
    val bestLine: List<String>,
    /** Past lichess' ±1000 cp ceiling at BOTH ends: scores 100 % free (`docs/game-review.md`). */
    val decided: Boolean,
    val bestUciLine: List<String> = emptyList(),
    val mateBefore: Boolean = false,
    val mateAfter: Boolean = false,
    val playedBest: Boolean = false,
    val forcedMateLine: Boolean = false,
    val mateInBefore: Int? = null,
    val mateDistanceBefore: Int? = null,
    val mateDistanceAfter: Int? = null,
)

val PlyGrade.missedMate: Boolean get() = mateBefore && !mateAfter && !playedBest

/** [accuracy]: a RECOVERED move counts, a ply after a SEAM is not graded (`docs/game-review.md`). */
data class SideSummary(
    val plies: Int,
    /** How many of [plies] went into [accuracy]. The screen shows it — a rating owes its denominator. */
    val scored: Int,
    val accuracy: Double?,
    val counts: Map<MoveQuality, Int>,
) {
    fun count(quality: MoveQuality): Int = counts[quality] ?: 0
}

/** [byPly] is SPARSE: a partial review is a grade over fewer plies. */
data class GameGrade(
    val byPly: Map<Int, PlyGrade>,
    /** WHITE's win expectancy per POSITION, null where the engine has not been yet. */
    val winWhite: List<Double?>,
    val evalCp: List<Int?>,
    val evalMate: List<Int?>,
    val white: SideSummary,
    val black: SideSummary,
    val budget: ReviewBudget,
    val scored: Int,
    val positions: Int,
) {
    val complete: Boolean get() = scored >= positions

    fun of(ply: Int): PlyGrade? = byPly[ply]

    /** Sorted by swing only; a missed mate goes to [missedChances] (`docs/game-review.md`). */
    fun findings(): List<PlyGrade> =
        byPly.values
            .filter { it.quality >= MoveQuality.INACCURACY }
            .sortedByDescending { it.winBefore - it.winAfter }

    /** A missed mate that also cost a large share of the position appears in [findings] too. */
    fun missedChances(): List<PlyGrade> = byPly.values.filter { it.missedMate }.sortedBy { it.ply }

    fun missedMates(white: Boolean): Int = byPly.values.count { it.missedMate && it.whiteMoved == white }
}

/** Searches NEAREST THE VIEWED PLY FIRST: the old pass showed nothing for 55 s (`docs/game-review.md`). */
class GameReviewer(
    private val engines: EngineService,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    /** Hands the whole array to [onScored] per search; [focus] is re-read each time. False: no engine for this ABI. */
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
        engines.lease(EngineLane.REVIEW, budget.profile).use { lease ->
            while (true) {
                val context = currentCoroutineContext()
                context.ensureActive()
                val next = nextIndex(scores, focus()) ?: break
                scores[next] = analyseReviewPosition(lease, positions[next], budget) { !context.isActive } ?: return false
                context.ensureActive()
                onScored(scores.toList())
            }
        }
        return true
    }
}

/** The unscored position closest to [focus]; a ply's own index reaches both of its positions first. */
internal fun nextIndex(
    scores: List<Score?>,
    focus: Int,
): Int? =
    scores.indices
        .filter { scores[it] == null }
        .minByOrNull { abs(it - focus) }

/** The outcome itself: the engine's empty PV reads as even, and the mating move would cost nothing. */
internal fun terminalScore(board: Board): Score? =
    when {
        board.isMated -> Score(if (board.sideToMove == Side.WHITE) -MATE_CP else MATE_CP, 0, mate = 0)
        board.isStaleMate || board.isDraw -> Score(0, 0)
        else -> null
    }

data class Score(
    val cp: Int,
    val depth: Int,
    val line: List<String> = emptyList(),
    val mate: Int? = null,
) {
    val bestUci: String? get() = line.firstOrNull()
}

internal fun cpOf(line: PvLine?): Int {
    val mate = line?.mate
    if (mate != null) return if (mate > 0) MATE_CP else -MATE_CP
    return line?.cp ?: 0
}

/** Ply `i` is `scores[i]` -> `scores[i + 1]`. Takes the whole [game] because a SEAM's first ply is skipped. */
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

/** A SEAM's first ply: its "before" position is not the result of the move before it. */
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

/** Falls back to UCI: `e2e4` still says "play this instead". */
internal fun sanOf(
    fen: String,
    uci: String,
): String =
    runCatching {
        val side = Board().apply { loadFromFen(fen) }.sideToMove
        MoveList(fen).apply { add(Move(uci, side)) }.toSanArray().first()
    }.getOrDefault(uci)

/** Truncated at the first move chesslib will not play: half a line is still an idea. */
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

data class LineFrame(
    val fen: String,
    val lastMoveUci: String?,
)

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
