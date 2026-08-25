package com.chesslab.engine.still

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import java.util.Locale
import kotlin.math.ln

internal sealed interface Verdict {
    /** The reading matches the tracked position; nothing happened. */
    data object Unchanged : Verdict

    /** Moves that are certain now. [complete] when nothing ambiguous remains behind them. */
    data class Moves(
        val moves: List<Move>,
        val complete: Boolean,
    ) : Verdict

    /** The reading neither confirms the position nor any move clearly enough. */
    data object Unclear : Verdict
}

/**
 * Explains one classifier reading as legal moves from the tracked position.
 *
 * Legal continuations are searched depth-first, expanding only moves that improve the
 * log-likelihood the reading assigns to the resulting position — after a fast sequence the
 * backlog can be several plies deep, and each true ply gains strongly while noise loses.
 *
 * Committed is the longest common prefix of the near-best hypotheses AND of every legal
 * reordering of the best one — a still image cannot order a backlog, so the order must be forced
 * by legality before it is asserted. Ambiguity may stay open and resolve on a later reading;
 * a phantom may not.
 */
internal class MoveExplainer(
    private val classes: List<String>,
    private val trace: ((String) -> Unit)? = null,
) {
    private val emptyColumn = classes.indexOf("empty")
    private val whiteColumns = classes.indices.filter { classes[it].startsWith("w") }.toSet()
    private val blackColumns = classes.indices.filter { classes[it].startsWith("b") }.toSet()
    private val columns: Map<Piece, Int> =
        Piece.entries.filter { it != Piece.NONE }.associateWith { piece ->
            val side = if (piece.pieceSide == Side.WHITE) "w" else "b"
            classes.indexOf(side + LETTERS.getValue(piece.pieceType))
        }

    fun explain(
        position: Board,
        rows: Array<DoubleArray>,
        coverage: DoubleArray,
        coverageGate: Double,
    ): Verdict {
        val evidence = visibleLogProbs(rows, coverage, coverageGate)
        trace?.invoke(mismatches(position, rows, evidence))
        val hypotheses = search(position, evidence) ?: return Verdict.Unclear
        val best = hypotheses.maxBy { it.score }
        val idle = hypotheses.first()
        val near = hypotheses.filter { it.score >= best.score - AMBIGUITY }
        trace?.invoke(diagnostic(hypotheses, near, idle, evidence))
        val agreed = commonPrefix(near.map { it.moves } + listOf(commonPrefix(orderings(position, best.moves))))
        val prefix = visiblePrefix(position, agreed, evidence)
        val direct =
            prefix.isNotEmpty() &&
                hypotheses.first { it.moves == prefix }.score - idle.score >= COMMIT_PER_PLY * prefix.size
        val backed = prefix.isNotEmpty() && (direct || best.score - idle.score >= REFUTE)
        return when {
            near.all { it.moves.isEmpty() } -> Verdict.Unchanged
            !backed -> Verdict.Unclear
            else -> Verdict.Moves(prefix, complete = near.size == 1 && prefix == best.moves)
        }
    }

    /**
     * A move only commits while every square it touches is readable RIGHT NOW. Without this, a
     * lifted piece commits as a half-move: its origin already reads empty, its destination is
     * still in the hand — and wherever the piece actually lands makes that commit a phantom.
     */
    private fun visiblePrefix(
        position: Board,
        moves: List<Move>,
        evidence: Array<DoubleArray?>,
    ): List<Move> {
        val board = position.clone()
        val committable = ArrayList<Move>()
        for (move in moves) {
            if (touched(board, move).any { evidence[it] == null }) break
            committable += move
            board.doMove(move)
        }
        return committable
    }

    /**
     * Log-probability per class for each square the model may be believed on; null when gated.
     *
     * Occupancy and colour carry full weight, piece identity only [IDENTITY_WEIGHT]: the model
     * reads a visible occupancy at 99.9 % but a visible piece at 81 %, and on a re-aimed camera
     * the identities are what collapse first (measured: a rook read as wN@0.97 froze a whole
     * recording when identity was priced like occupancy).
     */
    private fun visibleLogProbs(
        rows: Array<DoubleArray>,
        coverage: DoubleArray,
        coverageGate: Double,
    ): Array<DoubleArray?> =
        Array(rows.size) { i ->
            if (rows[i].isEmpty() || coverage[i] > coverageGate) {
                null
            } else {
                val white = whiteColumns.sumOf { rows[i][it] }
                val black = blackColumns.sumOf { rows[i][it] }
                DoubleArray(classes.size) { c ->
                    val group =
                        if (c == emptyColumn) {
                            rows[i][emptyColumn]
                        } else if (c in whiteColumns) {
                            white
                        } else {
                            black
                        }
                    (1 - IDENTITY_WEIGHT) * ln(maxOf(group, FLOOR)) +
                        IDENTITY_WEIGHT * ln(maxOf(rows[i][c], FLOOR))
                }
            }
        }

    private class Hypothesis(
        val moves: List<Move>,
        val score: Double,
    )

    /**
     * Depth-first over legal moves, expanding only children that gain evidence. Null when the
     * tree explodes — that happens under heavy occlusion, where no reading decides anything.
     */
    private fun search(
        position: Board,
        evidence: Array<DoubleArray?>,
    ): List<Hypothesis>? {
        val board = position.clone()
        val all = ArrayList<Hypothesis>()
        val trail = ArrayList<Double>()
        var nodes = 0

        // A child may pay for one contradicted square (MIN_GAIN) — that is a transit move whose
        // successor repays it — but every two plies the chain must NET new evidence, or it is a
        // piece wandering for free and the tree is unbounded.
        fun dfs(path: List<Move>) {
            val here = score(board, evidence)
            all += Hypothesis(path, here - PLY_PRIOR * path.size)
            trail += here
            if (path.size >= MAX_DEPTH || nodes > NODE_CAP) {
                trail.removeLast()
                return
            }
            val children =
                board
                    .legalMoves()
                    .mapNotNull { move ->
                        board.doMove(move)
                        val gained = score(board, evidence) - here
                        board.undoMove()
                        val progress = path.isEmpty() || here + gained >= trail[path.size - 1] + MIN_PROGRESS
                        if (gained > MIN_GAIN && progress) move to gained else null
                    }.sortedByDescending { it.second }
                    .take(BEAM)
            nodes += 1
            for ((move, _) in children) {
                board.doMove(move)
                dfs(path + move)
                board.undoMove()
            }
            trail.removeLast()
        }
        dfs(emptyList())
        return if (nodes > NODE_CAP) null else all
    }

    private fun score(
        board: Board,
        evidence: Array<DoubleArray?>,
    ): Double {
        var sum = 0.0
        for (i in evidence.indices) {
            val logs = evidence[i] ?: continue
            val piece = board.getPiece(Square.squareAt(i))
            sum += logs[if (piece == Piece.NONE) emptyColumn else columns.getValue(piece)]
        }
        return sum
    }

    /**
     * Every legal reordering of [moves] that reaches the same final position. One still image
     * cannot tell them apart — the search may have kept only one (a persistent misread makes one
     * ordering pay its penalty earlier), so equivalence is established here, by construction.
     */
    private fun orderings(
        position: Board,
        moves: List<Move>,
    ): List<List<Move>> {
        if (moves.isEmpty()) return listOf(emptyList())
        val target =
            position.clone().let { board ->
                moves.forEach(board::doMove)
                board.getFen(false)
            }
        val found = ArrayList<List<Move>>()
        val board = position.clone()

        fun permute(
            remaining: List<Move>,
            path: List<Move>,
        ) {
            if (remaining.isEmpty()) {
                if (board.getFen(false) == target) found += path
                return
            }
            for (move in remaining.distinct()) {
                if (!board.legalMoves().contains(move)) continue
                board.doMove(move)
                permute(remaining - move, path + move)
                board.undoMove()
            }
        }
        permute(moves, emptyList())
        return found
    }

    /** The squares whose occupant this move changes — from board diff, so castling and e.p. count. */
    private fun touched(
        board: Board,
        move: Move,
    ): Set<Int> {
        val before = Array(SQUARES) { board.getPiece(Square.squareAt(it)) }
        board.doMove(move)
        val squares = (0 until SQUARES).filterTo(HashSet()) { board.getPiece(Square.squareAt(it)) != before[it] }
        board.undoMove()
        return squares
    }

    private fun commonPrefix(sequences: List<List<Move>>): List<Move> {
        if (sequences.isEmpty()) return emptyList()
        var prefix = sequences.first()
        for (other in sequences) {
            var n = 0
            while (n < prefix.size && n < other.size && prefix[n] == other[n]) n++
            prefix = prefix.subList(0, n)
        }
        return prefix
    }

    private fun mismatches(
        position: Board,
        rows: Array<DoubleArray>,
        evidence: Array<DoubleArray?>,
    ): String {
        val off =
            (0 until SQUARES).mapNotNull { i ->
                if (evidence[i] == null) return@mapNotNull "${sqName(i)}:gated"
                val piece = position.getPiece(Square.squareAt(i))
                val expected = if (piece == Piece.NONE) emptyColumn else columns.getValue(piece)
                val argmax = classes.indices.maxBy { rows[i][it] }
                if (argmax == expected) null else "${sqName(i)}:${classes[argmax]}@${"%.2f".format(Locale.ROOT, rows[i][argmax])}"
            }
        return "off: " + off.joinToString(" ").ifEmpty { "none" }
    }

    /**
     * Squares that are legible and contradict the tracked position on OCCUPANCY OR COLOUR.
     *
     * Identity is deliberately excluded: a rook read as a knight is the model's known weakness
     * (81 % on visible identity against 99.9 % on visible occupancy), and an alarm built on it
     * would fire on a perfectly correct board. The same split the search prices with
     * [IDENTITY_WEIGHT] decides here, only harder.
     */
    fun conflicts(
        position: Board,
        rows: Array<DoubleArray>,
        coverage: DoubleArray,
        coverageGate: Double,
    ): List<String> {
        val evidence = visibleLogProbs(rows, coverage, coverageGate)
        return (0 until SQUARES).mapNotNull { i ->
            if (evidence[i] == null) return@mapNotNull null
            val piece = position.getPiece(Square.squareAt(i))
            val expected = if (piece == Piece.NONE) emptyColumn else columns.getValue(piece)
            val argmax = classes.indices.maxBy { rows[i][it] }
            if (group(argmax) == group(expected)) null else sqName(i)
        }
    }

    /** Empty, white or black — the axis the model is reliable on. */
    private fun group(column: Int): Int =
        when (column) {
            emptyColumn -> 0
            in whiteColumns -> 1
            else -> 2
        }

    private fun sqName(i: Int): String = "${'a' + i % GRID}${i / GRID + 1}"

    private fun diagnostic(
        hypotheses: List<Hypothesis>,
        ordered: List<Hypothesis>,
        idle: Hypothesis,
        evidence: Array<DoubleArray?>,
    ): String {
        val top =
            hypotheses.sortedByDescending { it.score }.take(TRACED).joinToString(" | ") {
                val name = it.moves.joinToString("+").ifEmpty { "idle" }
                "$name ${"%.1f".format(Locale.ROOT, it.score - idle.score)}"
            }
        return "gated ${evidence.count { it == null }} · ordered ${ordered.size} · rel-to-idle: $top"
    }

    private companion object {
        val LETTERS =
            mapOf(
                PieceType.PAWN to "P",
                PieceType.KNIGHT to "N",
                PieceType.BISHOP to "B",
                PieceType.ROOK to "R",
                PieceType.QUEEN to "Q",
                PieceType.KING to "K",
            )

        const val SQUARES = 64

        /** Softmax floor: one flatly wrong square costs ~9.2 nats, never infinity. */
        const val FLOOR = 1e-4

        /**
         * How much of a square's evidence rides on WHICH piece rather than whose/whether. Large
         * enough that a confident promotion choice clears [AMBIGUITY] (0.4 · 9.2 > 3), small
         * enough that one misidentified piece cannot outvote an occupancy.
         */
        const val IDENTITY_WEIGHT = 0.4

        /** A hypothesis this close to the best is not ruled out — only their shared prefix commits. */
        const val AMBIGUITY = 3.0

        /** What a prefix backed by its own evidence must gain per ply over "nothing happened". */
        const val COMMIT_PER_PLY = 6.0

        /**
         * The alternative licence: the best hypothesis refutes "nothing happened" by net one and
         * a half confident squares. Lets a pure-transit prefix (a2a4 before a4a5) commit on the
         * strength of the chain that needs it.
         */
        const val REFUTE = 10.0

        /**
         * Occam: every ply is a cost. A detour explanation (e7e6+e6e5 for e7e5) reaches the same
         * position with one move more, ties on evidence, and must fall OUT of [AMBIGUITY].
         */
        const val PLY_PRIOR = 3.5

        /**
         * One fully contradicted square must survive expansion: a transit move (a2a4 before
         * a4a5) pays ~9.2 on the square its successor re-explains. Two contradicted squares —
         * a move the reading opposes outright — stay pruned.
         */
        const val MIN_GAIN = -10.5

        /** What any two consecutive plies must net together; free wandering nets zero. */
        const val MIN_PROGRESS = 5.0

        /** Fast play leaves several plies between two readable stills; six covers what we saw. */
        const val MAX_DEPTH = 6
        const val BEAM = 8
        const val NODE_CAP = 3000

        const val TRACED = 5
    }
}
