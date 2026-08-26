package com.chesslab.engine.changeset

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move

sealed interface Change {
    /** Nothing on the board moved since the last understood picture. */
    data object None : Change

    /** Moves that are certain. [complete] when nothing ambiguous remains behind them. */
    data class Moves(
        val moves: List<Move>,
        val complete: Boolean,
    ) : Change

    /** Something changed and no legal continuation accounts for it. */
    data object Unexplained : Change

    /**
     * The pixels offered an account and the MODEL refused all of them.
     *
     * Not the same thing as unexplained, and keeping them apart is what stops a false alarm: a
     * board nobody can explain is a board that may really be wrong, while a board the model
     * disagrees with is two witnesses at odds — most often a hand halfway out of frame. Measured
     * on `11-55-19`: with a hand over the a-file every hypothesis was refused, the alarm latched,
     * and nothing committed for the rest of the recording.
     */
    data object Disputed : Change
}

/**
 * Which legal continuation moved exactly the squares that changed.
 *
 * The score of a hypothesis is the sum of [ChangeEvidence] over the squares it touches, and
 * "nothing happened" scores zero by construction — a square that changed and stays untouched
 * subtracts the same amount it would have added. This is the first engine's `Scoring.kt` shape,
 * reached from the other side: it never asks WHAT is on a square, only WHETHER it changed.
 *
 * Committed is the longest common prefix of the near-best hypotheses and of every legal reordering
 * of the best one — a still picture cannot order a backlog, so legality has to force the order
 * before it is asserted.
 */
class ChangeSearch(
    private val trace: ((String) -> Unit)? = null,
) {
    private class Hypothesis(
        val moves: List<Move>,
        val touched: Set<Int>,
        val score: Double,
    )

    /**
     * [accepts] is the model's say, and it CHOOSES rather than vetoes.
     *
     * Built the other way round first, and measured wrong on `11-55-19`: as a veto it killed the
     * best hypothesis and the engine gave up, where three routes of the same queen (`d8a5`,
     * `d8d7`, `d8e8`) tied within the ambiguity band and one look at whether `a5` or `d7` is
     * occupied separates them. A check that only kills throws that away.
     */
    fun explain(
        position: Board,
        evidence: ChangeEvidence,
        covered: Set<Int>,
        accepts: (Board, Set<Int>) -> Boolean = { _, _ -> true },
    ): Change {
        val ranked = search(position, evidence).sortedByDescending { it.score }
        // Only the top of the list is put to the model: below it the score has ruled a hypothesis
        // out already, and every question costs a board clone.
        val viable = ranked.take(WEIGHED).filter { agreeable(position, it, accepts) }
        val best = viable.firstOrNull()
        val near = viable.filter { best != null && it.score >= best.score - AMBIGUITY }
        trace?.invoke(diagnostic(ranked, near, evidence))
        // "Nothing happened" is always agreeable, so the question is whether a MOVE survived. If
        // the pixels offered one and the model refused every one, that is a dispute, not a verdict.
        val moveSurvived = viable.any { it.moves.isNotEmpty() }
        val moveOffered = ranked.any { it.moves.isNotEmpty() && it.score > 0.0 }
        if (best == null || best.moves.isEmpty() || best.score <= 0.0) return idle(evidence, moveOffered, moveSurvived)
        // Routes that end in the same position are still not interchangeable AS PLIES, and the
        // ply list is the deliverable. Committing the best of them was measured on `11-55-19`:
        // three routes of one queen to a4 tied, the engine picked `Qd7` where the board had played
        // `Qa5`, and two phantoms went into the record. A missed move can be recovered from; an
        // invented one is the veto (`docs/engine-changeset.md`).
        val agreed = commonPrefix(near.map { it.moves } + listOf(commonPrefix(orderings(position, best.moves))))
        val prefix = uncoveredPrefix(position, agreed, covered)
        if (prefix.isEmpty() || best.score < COMMIT_FLOOR * prefix.size) return Change.Unexplained
        return Change.Moves(prefix, complete = near.size == 1 && prefix == best.moves)
    }

    /** Does the model agree with the position this hypothesis produces, on the squares it moved? */
    private fun agreeable(
        position: Board,
        hypothesis: Hypothesis,
        accepts: (Board, Set<Int>) -> Boolean,
    ): Boolean {
        if (hypothesis.moves.isEmpty()) return true
        val after = position.clone().also { board -> hypothesis.moves.forEach(board::doMove) }
        return accepts(after, hypothesis.touched)
    }

    /**
     * Nothing beat "nothing happened" — but WHY decides what that means. A settled board whose
     * pixels moved without any legal account is the desync case; one whose account the model threw
     * out is two witnesses at odds, and only the first of those is worth an alarm.
     */
    private fun idle(
        evidence: ChangeEvidence,
        offered: Boolean,
        survived: Boolean,
    ): Change =
        when {
            offered && !survived -> Change.Disputed
            evidence.changed().size < STRAY -> Change.None
            else -> Change.Unexplained
        }

    /**
     * A move commits only while every square it touches is legible RIGHT NOW. Under a hand the
     * origin already reads empty while the piece is still in the air, and whatever it lands on
     * makes that commit a phantom.
     */
    private fun uncoveredPrefix(
        position: Board,
        moves: List<Move>,
        covered: Set<Int>,
    ): List<Move> {
        if (covered.isEmpty()) return moves
        val board = position.clone()
        val out = ArrayList<Move>()
        for (move in moves) {
            if (touched(board, move).any { it in covered }) break
            out += move
            board.doMove(move)
        }
        return out
    }

    /** Depth-first, expanding only continuations that claim change nobody has claimed yet. */
    private fun search(
        position: Board,
        evidence: ChangeEvidence,
    ): List<Hypothesis> {
        val board = position.clone()
        val all = ArrayList<Hypothesis>()
        all += Hypothesis(emptyList(), emptySet(), 0.0)
        var nodes = 0

        fun dfs(
            path: List<Move>,
            claimed: Set<Int>,
        ) {
            if (path.size >= MAX_DEPTH || nodes > NODE_CAP) return
            nodes += 1
            for (move in board.legalMoves()) {
                val union = claimed + touched(board, move)
                val score = evidence.sum(union) - PLY_PRIOR * (path.size + 1)
                // A ply that claims no new change is a piece wandering for free; one that claims
                // a little may still be the transit half of a capture, so the bar is not zero.
                if (evidence.sum(union) - evidence.sum(claimed) < MIN_CLAIM) continue
                board.doMove(move)
                all += Hypothesis(path + move, union, score)
                dfs(path + move, union)
                board.undoMove()
            }
        }
        dfs(emptyList(), emptySet())
        return all
    }

    /** The squares whose occupant this move changes — from a board diff, so castling and e.p. count. */
    private fun touched(
        board: Board,
        move: Move,
    ): Set<Int> {
        val before = Array(ChangeEvidence.SQUARES) { board.getPiece(Square.squareAt(it)) }
        board.doMove(move)
        val out = (0 until ChangeEvidence.SQUARES).filterTo(HashSet()) { board.getPiece(Square.squareAt(it)) != before[it] }
        board.undoMove()
        return out
    }

    /**
     * Every legal reordering of [moves] that reaches the same position. One picture cannot tell
     * them apart, so equivalence is established here rather than assumed.
     */
    private fun orderings(
        position: Board,
        moves: List<Move>,
    ): List<List<Move>> {
        if (moves.size <= 1) return listOf(moves)
        val target =
            position.clone().let { b ->
                moves.forEach(b::doMove)
                b.getFen(false)
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
        return found.ifEmpty { listOf(moves) }
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

    private fun diagnostic(
        all: List<Hypothesis>,
        near: List<Hypothesis>,
        evidence: ChangeEvidence,
    ): String {
        val top =
            all.sortedByDescending { it.score }.take(TRACED).joinToString(" | ") {
                "${it.moves.joinToString("+").ifEmpty { "idle" }} ${ChangeEvidence.round1(it.score)}"
            }
        return "changed ${evidence.describe()} · near ${near.size} · $top"
    }

    companion object {
        /**
         * The squares a whole sequence changes, so the colour check can be asked about the
         * position the sequence PRODUCES rather than the one it left.
         */
        fun landedOn(
            position: Board,
            moves: List<Move>,
        ): Set<Int> {
            val board = position.clone()
            val before = Array(ChangeEvidence.SQUARES) { board.getPiece(Square.squareAt(it)) }
            moves.forEach(board::doMove)
            return (0 until ChangeEvidence.SQUARES).filterTo(HashSet()) {
                board.getPiece(Square.squareAt(it)) != before[it]
            }
        }

        /** A hypothesis this close to the best is not ruled out; only their shared prefix commits. */
        private const val AMBIGUITY = 3.0

        /** What a committed ply must be worth. Two squares that plainly changed clear it. */
        private const val COMMIT_FLOOR = 4.0

        /** Occam: a longer account of the same picture must fall out of [AMBIGUITY]. */
        private const val PLY_PRIOR = 2.0

        /** What each further ply must claim of change nobody claimed before it. */
        private const val MIN_CLAIM = 1.0

        /** Below this many changed squares a settled board is noise, not a lost position. */
        private const val STRAY = 2

        /** Fast play leaves several plies between two readable stills. */
        private const val MAX_DEPTH = 4
        private const val NODE_CAP = 4000
        private const val TRACED = 5

        /**
         * How many of the best hypotheses the model is asked about. Beyond this the score has
         * already ruled them out, and each question costs a board clone.
         */
        private const val WEIGHED = 12
    }
}
