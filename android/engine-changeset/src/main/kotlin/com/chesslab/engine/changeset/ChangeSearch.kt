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
     * [objections] is the model's say, and it COSTS a hypothesis rather than killing it.
     *
     * Two wrong shapes were measured before this one. As a plain veto it killed the best
     * hypothesis and the engine gave up. As a hard filter over the ranked list it was worse: on
     * `VID_20260726_233432` the model reads badly, refused nearly every candidate, and the arm
     * committed NOTHING in 21 plies — `a2a4` sat there at 10.0 against a commit floor of 4 and
     * was thrown out.
     *
     * A price is the honest shape. The colour axis was measured wrong at full confidence twice in
     * one session, so it is a witness, not a gate: enough to separate hypotheses that the pixels
     * leave tied (three routes of one queen to a4), never enough to overrule pixels that plainly
     * moved.
     */
    fun explain(
        position: Board,
        evidence: ChangeEvidence,
        covered: Set<Int>,
        objections: (Board, Set<Int>) -> Int = { _, _ -> 0 },
    ): Change {
        val raw = search(position, evidence).sortedByDescending { it.score }
        // Only the top of the list is priced: below it the pixels have ruled a hypothesis out
        // already, and every question costs a board clone.
        val priced = raw.take(WEIGHED).map { charged(position, it, objections) }.sortedByDescending { it.score }
        val viable = priced + raw.drop(WEIGHED)
        val best = viable.firstOrNull()
        val near = viable.filter { best != null && it.score >= best.score - AMBIGUITY }
        trace?.invoke(diagnostic(viable, near, evidence))
        // The pixels offered a move and the price pushed it under "nothing happened": two
        // witnesses at odds, most often a hand halfway out of frame — not a wrong board.
        val moveSurvived = best != null && best.moves.isNotEmpty()
        val moveOffered = raw.any { it.moves.isNotEmpty() && it.score > 0.0 }
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

    /** The same hypothesis, minus what the model's disagreement costs it. */
    private fun charged(
        position: Board,
        hypothesis: Hypothesis,
        objections: (Board, Set<Int>) -> Int,
    ): Hypothesis {
        if (hypothesis.moves.isEmpty()) return hypothesis
        val after = position.clone().also { board -> hypothesis.moves.forEach(board::doMove) }
        val count = objections(after, hypothesis.touched)
        if (count == 0) return hypothesis
        return Hypothesis(hypothesis.moves, hypothesis.touched, hypothesis.score - OBJECTION_COST * count)
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

        /**
         * What one contradicted square costs a hypothesis. Above [AMBIGUITY], so it separates
         * hypotheses the pixels leave tied; well under two squares of evidence, so it cannot
         * overrule a move the pixels plainly show.
         */
        private const val OBJECTION_COST = 4.0
    }
}
