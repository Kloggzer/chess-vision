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
import kotlinx.serialization.Serializable
import kotlin.math.abs

/**
 * A mate, as a centipawn score, so one subtraction reaches every reader.
 *
 * Any value past lichess' ±1000 ceiling does — [winChanceCeiled] clamps it and lichess' own
 * `fromMate` does exactly this — which is why nothing here needs a mate special case any more.
 * Mate-in-5 -> mate-in-9 is one number minus itself, and a mate traded for a won endgame is the few
 * points the endgame is actually worse by rather than a subtraction of thousands.
 */
private const val MATE_CP = 10_000

/** How the review's engine budget differs from the live one — see [ReviewBudget]. */
private const val REVIEW_NODES = 1_500_000L
private const val REVIEW_CAP_MS = 3_000L

private const val FULL_PERCENT = 100.0

/**
 * The review pass's engine budget: **[nodes], the way lichess does it**, with [capMs] only as a
 * safety valve.
 *
 * Neither of the two obvious knobs works. A TIME budget is a property of the phone and its
 * temperature, so the same game grades differently warm and cool. A DEPTH bound is an arbitrary edge
 * that lands in a different place in every phase: measured on the real 83-ply game, a node budget
 * reaching a MEDIAN depth of 16 ranges 0..245 across the game, because a swapped-off endgame is
 * solved outright for the same effort a middlegame spends reaching 16. `depth 16` throws that away,
 * and specs/42 measured the consequence — in a sparse endgame the live bar's `movetime 400` reaches
 * depth 31, so the "deep" pass was the SHALLOWER of the two on three plies.
 *
 * Nodes are neither. They are the same amount of WORK everywhere and on every device, they go as
 * deep as a position cheaply allows, and they are what lichess' own analysis farm spends per move.
 * 1 500 000 is their figure, taken as-is.
 *
 * **What it costs and what it buys**, measured over all 84 positions of `2026-08-02_2159` against a
 * 6.8 M-node reference, classes counted with the shipped bands:
 *
 * | budget | median depth | class changes vs the deep read |
 * |---|---|---|
 * | `depth 16` | 16 | 17 of 83 |
 * | 200 k nodes | 16 | 17 of 83 |
 * | 500 k nodes | 18 | 14 of 83 |
 * | **1.5 M nodes** | **21** | **10 of 83** |
 *
 * It also answers the objection that put it here — *"I can't see all solutions with depth 30"*
 * (2026-08-03). A median of 21 is inside the band chess.com describes as where engine quality starts
 * showing diminishing returns, and it is roughly what a strong club player sees in a sharp position.
 * Grading a move by a refutation only a 6.8 M-node search finds teaches nobody anything.
 *
 * [capMs] is a SAFETY VALVE and not the budget: it stops one pathological position from parking the
 * review, at the price of reproducibility in exactly that position. The per-ply depth is reported on
 * screen either way, so a grade is never presented as more than the search behind it.
 *
 * It is `@Serializable` because it is the KEY of the stored analysis ([ReviewStore]), not a note
 * beside it: two budgets grade the same ply differently, so a cache that did not carry its budget
 * would merge two opinions silently.
 */
@Serializable
data class ReviewBudget(
    val nodes: Long = REVIEW_NODES,
    val capMs: Long = REVIEW_CAP_MS,
    val threads: Int = 2,
    val hashMb: Int = 64,
    /**
     * 1, because the review only ever reads the best line — the extra slots cost search depth in
     * the same budget. It is settable so `ReviewDepthMeasurement` can reproduce the live eval bar's
     * readout exactly (`movetime 400`, `multiPv 3`) and compare the two.
     */
    val multiPv: Int = 1,
)

/**
 * One graded ply, in the unit the screen speaks: win expectancy for the side that moved.
 *
 * There is no centipawn field. It was the unit until 2026-08-03 and it was the defect — see
 * `Accuracy.kt` for the 32-of-83 measurement that removed it.
 */
data class PlyGrade(
    val ply: Int,
    /** The move that was played, so a finding can name itself without the caller holding the game. */
    val san: String,
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
     * True when the position was already past lichess' ±1000 cp ceiling at BOTH ends — the game was
     * over and this move could not demonstrate anything.
     *
     * Such a ply scores exactly 100 % for free, and a long finish is full of them. Measured on
     * `2026-08-02_2159`, whose last 15 plies per side are played against a forced mate: counting
     * them reads White 76.5 / Black 75.6, dropping them reads **71.4 / 66.5**. Nine points of
     * Black's score was the length of their own defeat. Lichess counts these (their volatility
     * weight floors at 0.5 rather than 0); excluding them is OUR rule and the screen names the
     * denominator because of that.
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
)

val PlyGrade.missedMate: Boolean get() = mateBefore && !mateAfter && !playedBest

/**
 * One side's report. [accuracy] is over the plies that are evidence about this player: everything
 * except the ones played after the game was already decided, which score 100 % for free.
 *
 * A move the CNN RECOVERED is counted like any other, and that is a correction. The decider says how
 * the app found out what was played, not whether it happened — recovery normally reconstructs the
 * real move, and dropping half a game's plies on that basis was throwing away good evidence. What is
 * genuinely not a record of play is a SEAM, and those plies are not graded at all (see [grade]).
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
     * WHITE's win expectancy per POSITION — index 0 is the start, index n the position after ply n.
     * Null where the engine has not been yet. This is what the bar beside the board reads: the ply
     * being looked at, never the tracker's current position.
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
     * The plies that decided the game, worst first — sorted by SWING and by nothing else.
     *
     * It used to sort `compareByDescending { missedMate }` first, so every missed mate outranked
     * every real swing by construction: the top row of "What decided the game" was routinely a move
     * that went 98 % → 98 %. Missing a mate from a won position is a curiosity, not a turning
     * point, and it is [missedChances] now — its own question, its own section.
     */
    fun findings(): List<PlyGrade> =
        byPly.values
            .filter { it.quality >= MoveQuality.INACCURACY }
            .sortedByDescending { it.winBefore - it.winAfter }

    /**
     * The forced mates that were available and not taken, in the order they came up.
     *
     * A missed mate that also cost a large share of the position appears in [findings] TOO, and
     * that is correct: it is both things.
     */
    fun missedChances(): List<PlyGrade> = byPly.values.filter { it.missedMate }.sortedBy { it.ply }

    val forcedMatePlies: Int get() = byPly.values.count { it.forcedMateLine }

    fun missedMates(white: Boolean): Int = byPly.values.count { it.missedMate && (it.ply % 2 == 1) == white }
}

/**
 * Grades a finished game with the engine, NEAREST THE PLY BEING LOOKED AT FIRST.
 *
 * The old pass scored position 0 to position n and showed nothing until it was done: measured on the
 * device at the shipped budget, **25 of 84 positions in 55 s**, so a full game was minutes of a
 * counter. A ply needs the two positions either side of it, so grading outward from the reader's
 * finger puts a real grade on screen after two searches instead of after eighty-four.
 *
 * One position at a time on one engine process: a review is a background chore, not a race, and this
 * may run while the tracker still owns the camera.
 */
class GameReviewer(
    private val engineFactory: () -> UciEngine?,
    private val budget: ReviewBudget = ReviewBudget(),
) {
    /**
     * Scores [game]'s positions until all are done or the coroutine is cancelled, and hands the
     * whole score array to [onScored] after each one — the caller grades and persists it.
     *
     * [seed] pre-fills what a previous run already stored, so reopening a half-reviewed game
     * continues instead of restarting. [focus] is read fresh before every search: it is the ply the
     * user is looking at RIGHT NOW, and it moves while this runs.
     *
     * Returns false when no engine binary shipped for this ABI.
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
                currentCoroutineContext().ensureActive()
                val next = nextIndex(scores, focus()) ?: break
                scores[next] = scoreOf(engine, positions[next])
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
    ): Score {
        val board = runCatching { Board().apply { loadFromFen(fen) } }.getOrNull() ?: return Score(0, 0)
        terminalScore(board)?.let { return it }
        val whiteToMove = board.sideToMove == Side.WHITE
        val best =
            runCatching { engine.analyse(fen, budget.capMs, budget.multiPv, nodes = budget.nodes) }
                .getOrNull()
                ?.firstOrNull()
                ?.toWhitePov(whiteToMove)
        return Score(cpOf(best), best?.depth ?: 0, best?.pv.orEmpty(), mate = best?.mate)
    }
}

/**
 * The next position to search: the unscored one closest to [focus].
 *
 * [focus] is a PLY number and a ply is the step between positions `focus - 1` and `focus`, so
 * measuring the distance from the ply's own index reaches both of them first and then walks outward.
 */
internal fun nextIndex(
    scores: List<Score?>,
    focus: Int,
): Int? =
    scores.indices
        .filter { scores[it] == null }
        .minByOrNull { abs(it - focus) }

/**
 * A terminal position has no move to evaluate and no line to ask for; its score is the outcome
 * itself. Asking the engine anyway returns an empty PV, which would read as an even position — so
 * a checkmate would grade the mating move as costing nothing.
 */
private fun terminalScore(board: Board): Score? =
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

private fun cpOf(line: PvLine?): Int {
    val mate = line?.mate
    if (mate != null) return if (mate > 0) MATE_CP else -MATE_CP
    return line?.cp ?: 0
}

/**
 * The pure half: [scores] holds one entry per position, null where the engine has not reached it, so
 * ply `i` is the step from `scores[i]` to `scores[i + 1]` and is graded only once both exist.
 *
 * It takes the whole [game] because of SEAMS. A seam is a place where the app lost the board and
 * picked it up again somewhere else, and the plies that got there appear in NO segment's move list.
 * The first ply after one therefore does NOT follow from the position before it, and grading it would
 * charge a player for whatever happened in the gap. Those plies are skipped — see [seamPlies].
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
 * The first ply of every segment the app entered by a SEAM — the only plies in a tracked game whose
 * "before" position is not the result of the move before them.
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
    // Past the ceiling at both ends AND still the same side's game: a flip from won to lost is also
    // saturated at both ends and is the largest blunder there is, so the sign has to agree.
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
    )
}

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
 * of the line is "play this instead", and `e2e4` still says that.
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
 * rather than abandoned: half a line is still an idea, and an empty one is not.
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
