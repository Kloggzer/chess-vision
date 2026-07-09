package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.MoveScoring
import com.chesslab.engine.uciOf
import com.github.bhlangonijr.chesslib.move.Move

/** Result of one recovery evaluation over an observation. */
sealed interface RecoveryOutcome {
    /** Too few confident squares — no statement (hand over the board). */
    data object Inconclusive : RecoveryOutcome

    /** Board matches the believed state — stuck diff was shadow/drift, no move. */
    data object BoardUnchanged : RecoveryOutcome

    /** Board deviates but no unambiguous move sequence explains it. */
    data class Conflicts(
        val squares: List<String>,
    ) : RecoveryOutcome

    /** The move sequence whose resulting position best explains the observation. */
    data class Moves(
        val ucis: List<String>,
        val agreement: Double,
    ) : RecoveryOutcome
}

/**
 * CNN occupancy/identity recovery (ports `cnn_recovery.py`): whole-board match
 * check plus the conflict-guided beam search `derive_moves_deep`
 * (`cnn_recovery.py:285-361`) that bridges up to [CnnConfig.recoveryMaxPlies]
 * half-moves when the diff tracker is stuck while play continues.
 */
class CnnRecovery(
    private val config: CnnConfig = CnnConfig(),
) {
    /** Full recovery evaluation mirroring `_cnn_tick`'s identity path (tracker.py:1393-1417). */
    fun evaluate(
        fen: String,
        obs: OccupancyObservation,
    ): RecoveryOutcome {
        val game = Game(fen)
        val matches = boardMatchesIdentity(game, obs)
        if (matches.match) return RecoveryOutcome.BoardUnchanged
        val (seq, agreement, _) = deriveMovesDeep(game, obs)
        return when {
            seq.isNotEmpty() -> RecoveryOutcome.Moves(seq.map(::uciOf), agreement)
            matches.inconclusive -> RecoveryOutcome.Inconclusive
            else -> RecoveryOutcome.Conflicts(matches.conflicts)
        }
    }

    /** Whole-board identity match (ports `board_matches_identity`, `cnn_recovery.py:216`). */
    fun boardMatchesIdentity(
        game: Game,
        obs: OccupancyObservation,
    ): IdentityMatch {
        val lc = obs.labelConfident(config.confThr)
        val checked = ALL_SQUARES.filter { lc[it] == true }
        if (checked.size < config.minConfidentBoard) {
            return IdentityMatch(match = false, emptyList(), checked.size, inconclusive = true)
        }
        val conflicts = checked.filter { obs.label.getValue(it) != expectedLabel(game, it) }
        return IdentityMatch(conflicts.isEmpty(), conflicts, checked.size, inconclusive = false)
    }

    data class IdentityMatch(
        val match: Boolean,
        val conflicts: List<String>,
        val n: Int,
        val inconclusive: Boolean,
    )

    /**
     * Conflict-guided beam search over up to `maxPlies` half-moves (ports
     * `derive_moves_deep`): only moves touching at least one conflicting square
     * are expanded; terminal candidates are grouped by final PLACEMENT
     * (transpositions are one hypothesis, the shortest sequence wins).
     * Works on piece identity; acceptance needs agreement >= minAgreement AND a
     * margin of `marginSquares` hits against the second-best DISTINCT position.
     */
    fun deriveMovesDeep(
        game: Game,
        obs: OccupancyObservation,
    ): Triple<List<Move>, Double, Double> {
        val lc = obs.labelConfident(config.confThr)
        val confSquares = ALL_SQUARES.filter { lc[it] == true }
        if (confSquares.size < config.minConfidentRecovery) return Triple(emptyList(), 0.0, 0.0)
        val target = confSquares.associateWith { obs.label.getValue(it) }
        val finals = beamSearch(game, confSquares, target)
        return rankFinals(finals, confSquares.size)
    }

    /** One search state: sequence so far, resulting position, remaining conflicts. */
    private data class SearchState(
        val seq: List<Move>,
        val board: Game,
        val conflicts: Set<String>,
    )

    /**
     * Conflict-guided expansion; returns terminal candidates grouped by final
     * placement (hits + shortest sequence per placement).
     */
    private fun beamSearch(
        game: Game,
        confSquares: List<String>,
        target: Map<String, String>,
    ): Map<String, Pair<Int, List<Move>>> {
        val n = confSquares.size
        val finals = mutableMapOf<String, Pair<Int, List<Move>>>()

        fun conflictsOf(b: Game): Set<String> = confSquares.filterTo(mutableSetOf()) { target.getValue(it) != expectedLabel(b, it) }

        fun note(
            seq: List<Move>,
            b: Game,
            conflictCount: Int,
        ) {
            val hits = n - conflictCount
            val key = b.fen().substringBefore(' ')
            val prev = finals[key]
            val better =
                prev == null || hits > prev.first || (hits == prev.first && seq.size < prev.second.size)
            if (better) finals[key] = hits to seq
        }

        var states = listOf(SearchState(emptyList(), game.copy(), conflictsOf(game)))
        note(emptyList(), game, states[0].conflicts.size)
        repeat(config.recoveryMaxPlies) {
            val next = mutableListOf<SearchState>()
            for (state in states) {
                if (state.conflicts.isEmpty()) continue // already fully explained
                expand(state, ::conflictsOf, ::note, next)
            }
            if (next.isNotEmpty()) {
                next.sortWith(compareBy({ it.conflicts.size }, { it.seq.size }))
                states = next.take(config.recoveryBeam)
            }
        }
        return finals
    }

    /** Expand one state by every legal move touching a conflicting square. */
    private fun expand(
        state: SearchState,
        conflictsOf: (Game) -> Set<String>,
        note: (List<Move>, Game, Int) -> Unit,
        next: MutableList<SearchState>,
    ) {
        for (mv in state.board.legalMoves()) {
            if (MoveScoring.moveTouchedSquares(state.board, mv).none { it in state.conflicts }) continue
            val b2 = state.board.copy().apply { push(mv) }
            val c2 = conflictsOf(b2)
            next.add(SearchState(state.seq + mv, b2, c2))
            note(state.seq + mv, b2, c2.size)
        }
    }

    /** Acceptance: agreement + margin against the second-best DISTINCT placement. */
    private fun rankFinals(
        finals: Map<String, Pair<Int, List<Move>>>,
        n: Int,
    ): Triple<List<Move>, Double, Double> {
        val ranked = finals.values.sortedWith(compareBy({ -it.first }, { it.second.size }))
        val (bestHits, bestSeq) = ranked[0]
        val secondHits = if (ranked.size > 1) ranked[1].first else -1
        val best = bestHits.toDouble() / n
        val second = (secondHits.toDouble() / n).coerceAtLeast(0.0)
        val accepted =
            bestSeq.isNotEmpty() &&
                best >= config.minAgreement &&
                (bestHits - maxOf(secondHits, 0)) >= config.marginSquares
        return if (accepted) Triple(bestSeq, best, second) else Triple(emptyList(), best, second)
    }
}
