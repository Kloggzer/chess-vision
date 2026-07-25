package com.chesslab.cnn

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.ResyncResult
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.Rank
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import kotlin.math.abs
import com.github.bhlangonijr.chesslib.File as ChessFile

internal const val NO_AGREEMENT = 0.0
internal const val FULL_AGREEMENT = 1.0
internal const val NO_HITS = -1

// verify_move: at least the FROM and TO square must be readable (cnn_recovery.py:204).
private const val MIN_VERIFIED_SQUARES = 2

// derive_moves_identity only enumerates pairs from this ply budget upward.
private const val PAIR_PLIES = 2

/** `score_moves` result: the accepted move (or null) plus both agreement fractions. */
data class ScoredMove(
    val move: Move?,
    val best: Double,
    val second: Double,
)

/** `derive_moves_identity` / `derive_moves_deep` result. */
data class DerivedMoves(
    val moves: List<Move>,
    val best: Double,
    val second: Double,
)

/**
 * `cnn_recovery.py:386 resync_check` result. Declared here with the other result types;
 * `Resync.kt` holds the functions.
 */
data class ResyncCheck(
    val match: Boolean,
    val conflicts: List<String>,
    val move: String?,
    val agreement: Double,
)

/** `board_matches_identity` — three-valued: an inconclusive check is NOT a mismatch. */
data class IdentityCheck(
    val match: Boolean,
    val conflicts: List<String>,
    val n: Int,
    val inconclusive: Boolean,
)

/**
 * Port of `cnn_recovery.py:118 CnnRecovery` — the pure-evaluation half only. `observe`
 * (pixels -> probabilities) lives behind [SquareClassifier]; the ONNX implementation is
 * phase 05c in `:app`.
 *
 * Implements the frozen engine seam [CnnEvaluator] (phase 00a), which takes the position as a
 * FEN. The seam is still narrower than Python on the identity axis, so the Python-faithful
 * [boardMatchesIdentityFull] (which carries `n`) stays exposed alongside it.
 */
class CnnRecovery(
    val config: CnnConfig = CnnConfig(),
) : CnnEvaluator {
    override val confThr: Double get() = config.confThr
    override val minConfidentBoard: Int get() = config.minConfidentBoard
    override val minAgreement: Double get() = config.minAgreement

    /**
     * `cnn_recovery.py:159 score_moves` — the legal move whose resulting OCCUPANCY best
     * explains the observation over the confident squares.
     */
    fun scoreMoves(
        board: Board,
        obs: OccupancyObservation,
    ): ScoredMove {
        val confSquares = obs.confidentSquares(config.confThr)
        val n = confSquares.size
        var result = ScoredMove(null, NO_AGREEMENT, NO_AGREEMENT)
        if (n >= config.minConfidentRecovery) {
            val picked =
                pick(board.legalMoves().map { listOf(it) to board.clone().also { b -> b.doMove(it) } }) { b ->
                    confSquares.count { obs.occupied(it) == (b.getPiece(squareOf(it)) != Piece.NONE) }
                }
            val best = frac(picked.hits, n)
            val second = frac(picked.second, n)
            // Margin in SQUARES: promotion variants (e7e8q vs e7e8r) are occupancy-identical
            // (0 squares apart) -> intentionally no answer.
            val accepted =
                picked.seq.isNotEmpty() &&
                    best >= config.minAgreement &&
                    (picked.hits - picked.second) >= config.marginSquares
            result = ScoredMove(if (accepted) picked.seq.first() else null, best, second)
        }
        return result
    }

    /**
     * `cnn_recovery.py:188 verify_move` — LOCAL, not whole-board: only squares physically
     * changed by the move count. Fewer than two confident touched squares leaves the move
     * unconfirmed (0.0) so the multi-frame window waits for a clear view.
     */
    override fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int> {
        val b = boardOf(boardFen)
        val o = asObservation(obs)
        val move = parseMove(b, moveUci)
        val after = b.clone().also { it.doMove(move) }
        val confident = o.confidentSquares(config.confThr).toSet()
        val checked = moveTouchedSquares(b, move).filter { it in confident }
        val hits = checked.count { o.occupied(it) == (after.getPiece(squareOf(it)) != Piece.NONE) }
        return if (checked.size < MIN_VERIFIED_SQUARES) {
            NO_AGREEMENT to checked.size
        } else {
            hits.toDouble() / checked.size to checked.size
        }
    }

    /** `cnn_recovery.py:371 verify_move_identity` — same shape, on the IDENTITY channel. */
    fun verifyMoveIdentity(
        board: Board,
        moveUci: String,
        obs: OccupancyObservation,
    ): Pair<Double, Int> {
        val move = parseMove(board, moveUci)
        val after = board.clone().also { it.doMove(move) }
        val confident = obs.labelConfidentSquares(config.confThr).toSet()
        val checked = moveTouchedSquares(board, move).filter { it in confident }
        val hits = checked.count { obs.label(it) == labelAt(after, it) }
        return if (checked.size < MIN_VERIFIED_SQUARES) {
            NO_AGREEMENT to checked.size
        } else {
            hits.toDouble() / checked.size to checked.size
        }
    }

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult {
        val full = boardMatchesIdentityFull(boardOf(boardFen), asObservation(obs))
        return IdentityResult(match = full.match, inconclusive = full.inconclusive, conflicts = full.conflicts)
    }

    /**
     * `cnn_recovery.py:229 derive_moves_identity` — the legal move SEQUENCE (1, or with
     * `maxPlies >= 2` also 2 half-moves) whose resulting identities best match the
     * observation. Singles are preferred; the pair must beat the best SINGLE too, else the
     * single is the more parsimonious explanation.
     */
    fun deriveMovesIdentity(
        board: Board,
        obs: OccupancyObservation,
        maxPlies: Int = 1,
    ): DerivedMoves {
        val confSquares = obs.labelConfidentSquares(config.confThr)
        val n = confSquares.size
        if (n < config.minConfidentRecovery) {
            return DerivedMoves(emptyList(), NO_AGREEMENT, NO_AGREEMENT)
        }
        val hitsOf = { b: Board -> confSquares.count { obs.label(it) == labelAt(b, it) } }
        val singles = board.legalMoves().map { listOf(it) to board.clone().also { b -> b.doMove(it) } }
        val single = pick(singles, hitsOf)
        val best = frac(single.hits, n)
        val second = frac(single.second, n)
        var result = DerivedMoves(emptyList(), best, second)
        if (single.seq.isNotEmpty() &&
            best >= config.minAgreement &&
            (single.hits - single.second) >= config.marginSquares
        ) {
            result = DerivedMoves(single.seq, best, second)
        } else if (maxPlies >= PAIR_PLIES) {
            val pairs =
                singles.flatMap { (seq, b) ->
                    b.legalMoves().map { mv2 -> (seq + mv2) to b.clone().also { it.doMove(mv2) } }
                }
            val pair = pick(pairs, hitsOf)
            val pairBest = frac(pair.hits, n)
            val rival = maxOf(pair.second, single.hits)
            if (pair.seq.isNotEmpty() &&
                pairBest >= config.minAgreement &&
                (pair.hits - rival) >= config.marginSquares
            ) {
                result = DerivedMoves(pair.seq, pairBest, rival.toDouble() / n)
            }
        }
        return result
    }

    /** `cnn_recovery.py:363 derive_move_identity` — the 1-ply wrapper. */
    fun deriveMoveIdentity(
        board: Board,
        obs: OccupancyObservation,
    ): ScoredMove {
        val derived = deriveMovesIdentity(board, obs, maxPlies = 1)
        return ScoredMove(derived.moves.firstOrNull(), derived.best, derived.second)
    }

    override fun deriveMovesDeep(
        boardFen: String,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult {
        val derived = deriveMovesDeepFull(boardOf(boardFen), asObservation(obs), maxPlies, config.beam)
        return DeriveResult(
            moves = derived.moves.map { uciOf(it) },
            agreement = derived.best,
            inconclusive = derived.moves.isEmpty(),
        )
    }

    override fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult {
        val o = asObservation(obs)
        val full = resyncCheckFull(boardOf(boardFen), o)
        // `move`/`agreement` ARE the overrule rung and `_cnn_tick`'s occupancy path; dropping them
        // made both silently dead against the real evaluator (STATUS D04a-1).
        return ResyncResult(
            match = full.match,
            conflicts = full.conflicts,
            checked = o.confidentSquares(config.confThr).size,
            move = full.move,
            agreement = full.agreement,
        )
    }

    override fun hasOccupancyConflict(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
        conflicts: List<String>,
        // fully qualified: the member would otherwise shadow the top-level function
    ): Boolean = com.chesslab.cnn.hasOccupancyConflict(boardOf(boardFen), asObservation(obs), thr, conflicts)

    override fun guessIllegalMove(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
    ): String? = com.chesslab.cnn.guessIllegalMove(boardOf(boardFen), asObservation(obs), thr)
}

/**
 * `cnn_recovery.py:216 board_matches_identity`. Fewer than `minConfidentBoard` label-confident
 * squares is the blind-glance guard: **inconclusive**, never a mismatch.
 */
fun CnnRecovery.boardMatchesIdentityFull(
    board: Board,
    obs: OccupancyObservation,
): IdentityCheck {
    val checked = obs.labelConfidentSquares(config.confThr)
    if (checked.size < config.minConfidentBoard) {
        return IdentityCheck(match = false, conflicts = emptyList(), n = checked.size, inconclusive = true)
    }
    val expected = expectedLabels(board)
    val conflicts = checked.filter { obs.label(it) != expected[it] }
    return IdentityCheck(match = conflicts.isEmpty(), conflicts = conflicts, n = checked.size, inconclusive = false)
}

/** The seam speaks FEN (see [CnnEvaluator]); this is the one place it becomes a chesslib board. */
internal fun boardOf(fen: String): Board = Board().also { it.loadFromFen(fen) }

internal fun asObservation(obs: CnnObservation): OccupancyObservation {
    require(obs is OccupancyObservation) { "expected an OccupancyObservation, got ${obs.javaClass.name}" }
    return obs
}

internal fun parseMove(
    board: Board,
    moveUci: String,
): Move = Move(moveUci.lowercase(), board.sideToMove)

internal fun uciOf(move: Move): String {
    val promotion = move.promotion
    val suffix = if (promotion == null || promotion == Piece.NONE) "" else promotion.fenSymbol.lowercase()
    return move.from.value().lowercase() + move.to.value().lowercase() + suffix
}

/**
 * `cnn_recovery.py:87 _move_touched_squares` — from, to, + the rook squares on castling,
 * + the captured pawn on en passant.
 */
internal fun moveTouchedSquares(
    board: Board,
    move: Move,
): Set<String> {
    val from = move.from
    val to = move.to
    val squares = linkedSetOf(from.value().lowercase(), to.value().lowercase())
    val piece = board.getPiece(from)
    val fromFile = from.file.ordinal
    val toFile = to.file.ordinal
    val type = if (piece == Piece.NONE) PieceType.NONE else piece.pieceType
    if (type == PieceType.KING && abs(toFile - fromFile) == CASTLING_FILE_SPAN) {
        val rookFiles =
            if (toFile > fromFile) {
                listOf(ChessFile.FILE_H, ChessFile.FILE_F)
            } else {
                listOf(ChessFile.FILE_A, ChessFile.FILE_D)
            }
        rookFiles.mapTo(squares) { squareNameAt(it, from.rank) }
    }
    // en passant: a pawn changing file onto an empty square
    if (type == PieceType.PAWN && fromFile != toFile && board.getPiece(to) == Piece.NONE) {
        squares.add(squareNameAt(to.file, from.rank))
    }
    return squares
}

private const val CASTLING_FILE_SPAN = 2

private fun squareNameAt(
    file: ChessFile,
    rank: Rank,
): String = Square.encode(rank, file).value().lowercase()

private data class Picked(
    val seq: List<Move>,
    val hits: Int,
    val second: Int,
)

/** Python's `_pick`: the best/second update keeps the FIRST maximum (strict `>`). */
private fun pick(
    candidates: List<Pair<List<Move>, Board>>,
    hitsOf: (Board) -> Int,
): Picked {
    var bestSeq: List<Move> = emptyList()
    var bestHits = NO_HITS
    var secondHits = NO_HITS
    for ((seq, board) in candidates) {
        val hits = hitsOf(board)
        if (hits > bestHits) {
            secondHits = bestHits
            bestHits = hits
            bestSeq = seq
        } else if (hits > secondHits) {
            secondHits = hits
        }
    }
    return Picked(bestSeq, bestHits, secondHits)
}

private fun frac(
    hits: Int,
    n: Int,
): Double = if (hits >= 0) hits.toDouble() / n else NO_AGREEMENT
