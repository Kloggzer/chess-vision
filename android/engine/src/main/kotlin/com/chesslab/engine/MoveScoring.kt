package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.move.Move

/** UCI string of a chesslib move (e.g. "e2e4", "e7e8q"). */
fun uciOf(move: Move): String {
    val promo = if (move.promotion != null && move.promotion != Piece.NONE) {
        move.promotion.fenSymbol.lowercase()
    } else {
        ""
    }
    return move.from.value().lowercase() + move.to.value().lowercase() + promo
}

/**
 * Log-likelihood move scoring over legal moves (ports tracker.py:423-509,357,476):
 * `loglikScores`, `loglikPairScores`, `movePrior`, `moveTouchedSquares` and the
 * move-classification helpers they need (capture / en passant / castling / check).
 */
object MoveScoring {
    private const val CLIP = 12.0
    private const val SOFT_FACTOR = 0.5
    private const val PRIOR_CAPTURE = 0.5
    private const val PRIOR_CHECK = 0.3
    private const val PRIOR_FORWARD = 0.2
    private const val PRIOR_CAP = 1.0
    private const val KINGSIDE_ROOK_FILE = 7
    private const val KINGSIDE_ROOK_TO = 5
    private const val QUEENSIDE_ROOK_TO = 3

    /** True when `move` castles (king moves two files). */
    fun isCastling(game: Game, move: Move): Boolean {
        val piece = game.pieceCharAt(move.from.value().lowercase())?.uppercaseChar()
        return piece == 'K' && kotlin.math.abs(move.to.file.ordinal - move.from.file.ordinal) == 2
    }

    /** True when `move` captures en passant (pawn changes file onto an empty square). */
    fun isEnPassant(game: Game, move: Move): Boolean {
        val piece = game.pieceCharAt(move.from.value().lowercase())?.uppercaseChar()
        return piece == 'P' && move.to.file != move.from.file &&
            game.pieceCharAt(move.to.value().lowercase()) == null
    }

    fun isCapture(game: Game, move: Move): Boolean =
        game.pieceCharAt(move.to.value().lowercase()) != null || isEnPassant(game, move)

    /** True when a legal `move` gives check. */
    fun givesCheck(game: Game, move: Move): Boolean {
        val g = game.copy()
        g.push(move)
        return g.isCheck()
    }

    /**
     * Squares a move physically changes: from, to, + rook squares on castling, + the captured
     * pawn square on en passant (ports tracker.py:357 `move_touched_squares`).
     */
    fun moveTouchedSquares(game: Game, move: Move): Set<String> {
        val sqs = mutableSetOf(move.from.value().lowercase(), move.to.value().lowercase())
        if (isCastling(game, move)) {
            val rank = move.from.value().lowercase()[1]
            if (move.to.file.ordinal > move.from.file.ordinal) {
                sqs.add("${'a' + KINGSIDE_ROOK_FILE}$rank")
                sqs.add("${'a' + KINGSIDE_ROOK_TO}$rank")
            } else {
                sqs.add("a$rank")
                sqs.add("${'a' + QUEENSIDE_ROOK_TO}$rank")
            }
        }
        if (isEnPassant(game, move)) {
            sqs.add("${move.to.value().lowercase()[0]}${move.from.value().lowercase()[1]}")
        }
        return sqs
    }

    private fun logit(z: Map<String, Double>, zThr: Double, k: Double): Map<String, Double> =
        z.mapValues { (_, v) -> (k * (v - zThr)).coerceIn(-CLIP, CLIP) }

    /**
     * Log-likelihood score per legal move relative to "no move": each touched square
     * contributes clip(k*(z - zThr), +-12). Sorted descending (ports tracker.py:423).
     */
    fun loglikScores(
        game: Game,
        z: Map<String, Double>,
        zThr: Double = TrackerConfig.DEFAULT_Z_THR,
        k: Double = 1.0,
    ): List<Pair<Move, Double>> {
        val lg = logit(z, zThr, k)
        return game.legalMoves()
            .map { mv -> mv to moveTouchedSquares(game, mv).sumOf { lg.getValue(it) } }
            .sortedByDescending { it.second }
    }

    /**
     * LL score for MOVE PAIRS (half-move + reply, fast play). Only pairs whose all from/to
     * endpoints carry at least weak evidence (z >= soft) are candidates (ports tracker.py:442).
     */
    fun loglikPairScores(
        game: Game,
        z: Map<String, Double>,
        zThr: Double = TrackerConfig.DEFAULT_Z_THR,
        k: Double = 1.0,
    ): List<Pair<List<Move>, Double>> {
        val soft = zThr * SOFT_FACTOR
        val lg = logit(z, zThr, k)
        fun ok(mv: Move) = z.getValue(mv.from.value().lowercase()) >= soft &&
            z.getValue(mv.to.value().lowercase()) >= soft
        val scored = mutableListOf<Pair<List<Move>, Double>>()
        for (mv1 in game.legalMoves()) {
            if (!ok(mv1)) continue
            val t1 = moveTouchedSquares(game, mv1)
            val g2 = game.copy()
            g2.push(mv1)
            for (mv2 in g2.legalMoves()) {
                if (!ok(mv2)) continue
                val touched = t1 + moveTouchedSquares(g2, mv2)
                scored.add(listOf(mv1, mv2) to touched.sumOf { lg.getValue(it) })
            }
        }
        return scored.sortedByDescending { it.second }
    }

    /**
     * Small plausibility prior in LL units: capture +0.5, check +0.3, forward +0.2, capped
     * at 1.0 — decides ONLY genuine near-ties (ports tracker.py:476 `move_prior`).
     */
    fun movePrior(game: Game, move: Move): Double {
        var p = 0.0
        if (isCapture(game, move)) p += PRIOR_CAPTURE
        if (givesCheck(game, move)) p += PRIOR_CHECK
        val fwd = move.to.rank.ordinal - move.from.rank.ordinal
        if (fwd != 0 && (fwd > 0) == game.whiteToMove) p += PRIOR_FORWARD
        return minOf(p, PRIOR_CAP)
    }

    /** True when the move is a pawn promotion. */
    fun isPromotion(move: Move): Boolean =
        move.promotion != null && move.promotion != Piece.NONE &&
            move.promotion.pieceType != PieceType.NONE
}
