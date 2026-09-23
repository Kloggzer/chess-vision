package com.chesslab.cnn

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.IllegalMoveException
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

// Verify: at least the FROM and TO square must be readable.
private const val MIN_VERIFIED_SQUARES = 2

data class ScoredMove(
    val move: Move?,
    val best: Double,
    val second: Double,
)

data class DerivedMoves(
    val moves: List<Move>,
    val best: Double,
    val second: Double,
)

data class ResyncCheck(
    val match: Boolean,
    val conflicts: List<String>,
    val move: String?,
    val agreement: Double,
)

/** Three-valued: an inconclusive check is NOT a mismatch. */
data class IdentityCheck(
    val match: Boolean,
    val conflicts: List<String>,
    val n: Int,
    val inconclusive: Boolean,
)

/** The pure-evaluation half; pixels -> probabilities lives behind [SquareClassifier]. Implements the FEN
 *  seam [CnnEvaluator]; [boardMatchesIdentityFull] (which carries `n`) stays exposed beside it. */
class CnnRecovery(
    val config: CnnConfig = CnnConfig(),
) : CnnEvaluator {
    override val confThr: Double get() = config.confThr
    override val minConfidentBoard: Int get() = config.minConfidentBoard
    override val minAgreement: Double get() = config.minAgreement

    /** The standing position is one of the RIVALS, not the baseline: otherwise a single square misread as empty
     *  fabricates the one move that vacates it — the live phantom g6 (g7 read `p(occupied) = 0.13`, g7g6 won
     *  58/59 against 57/59). [deriveMovesDeepFull] seeds its beam with the empty sequence for the same reason. */
    fun scoreMoves(
        board: Board,
        obs: OccupancyObservation,
    ): ScoredMove {
        val confSquares = obs.confidentSquares(config.confThr)
        val n = confSquares.size
        var result = ScoredMove(null, NO_AGREEMENT, NO_AGREEMENT)
        if (n >= config.minConfidentRecovery) {
            val hitsOf = { b: Board ->
                confSquares.count { obs.occupied(it) == (b.getPiece(squareOf(it)) != Piece.NONE) }
            }
            val picked = pick(board.legalMoves().map { listOf(it) to board.clone().also { b -> b.doMove(it) } }, hitsOf)
            val rival = maxOf(picked.second, hitsOf(board))
            val best = frac(picked.hits, n)
            // Promotion variants are occupancy-identical (0 squares apart) -> intentionally no answer.
            val accepted =
                picked.seq.isNotEmpty() &&
                    best >= config.minAgreement &&
                    (picked.hits - rival) >= config.marginSquares
            result = ScoredMove(if (accepted) picked.seq.first() else null, best, frac(rival, n))
        }
        return result
    }

    /** LOCAL: only squares the move physically changes count. Fewer than two confident ones leaves it
     *  unconfirmed (0.0), so the window waits for a clear view. */
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

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult {
        val full = boardMatchesIdentityFull(boardOf(boardFen), asObservation(obs))
        return IdentityResult(match = full.match, inconclusive = full.inconclusive, conflicts = full.conflicts)
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
        // `move`/`agreement` ARE the overrule rung and `_cnn_tick`'s occupancy path; dropped, both were dead.
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
        // Fully qualified: the member would otherwise shadow the top-level function.
    ): Boolean = com.chesslab.cnn.hasOccupancyConflict(boardOf(boardFen), asObservation(obs), thr, conflicts)

    override fun guessIllegalMove(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
    ): String? = com.chesslab.cnn.guessIllegalMove(boardOf(boardFen), asObservation(obs), thr)
}

/** Fewer than `minConfidentBoard` label-confident squares is the blind-glance guard: inconclusive, never a mismatch. */
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

internal fun boardOf(fen: String): Board = Board().also { it.loadFromFen(fen) }

internal fun asObservation(obs: CnnObservation): OccupancyObservation {
    require(obs is OccupancyObservation) { "expected an OccupancyObservation, got ${obs.javaClass.name}" }
    return obs
}

/** The seam takes the move as a STRING, so a fabrication would enter here. It THROWS: an abstention would
 *  read as "too few confident squares", which means something else to the verify ladder. */
internal fun parseMove(
    board: Board,
    moveUci: String,
): Move {
    val move = Move(moveUci.lowercase(), board.sideToMove)
    if (board.legalMoves().none { it == move }) throw IllegalMoveException(moveUci, board.getFen(true, true))
    return move
}

internal fun uciOf(move: Move): String {
    val promotion = move.promotion
    val suffix = if (promotion == null || promotion == Piece.NONE) "" else promotion.fenSymbol.lowercase()
    return move.from.value().lowercase() + move.to.value().lowercase() + suffix
}

/** From, to, the rook squares on castling, and the captured pawn on en passant. */
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

/** Python's `_pick`: keeps the FIRST maximum (strict `>`). */
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
