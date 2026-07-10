package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.MoveScoring
import com.chesslab.engine.api.VerifyVerdict
import com.chesslab.engine.uciOf
import com.github.bhlangonijr.chesslib.move.Move

/**
 * One verify observation either proposes a decision or asks for more frames.
 * `outcome` is the vote key (83a1e88: every verify outcome needs `verifyObsVotes`
 * consecutive agreeing observations); `votes=false` marks window/pair resolutions
 * that decide single-shot, exactly like the Python `_verify_tick`.
 */
sealed interface VerifyStep {
    data class Decided(
        val verdict: VerifyVerdict,
        val outcome: String = "",
        val votes: Boolean = false,
    ) : VerifyStep

    data class Continue(
        val note: String,
    ) : VerifyStep
}

/** Result of diffing believed vs observed occupancy (ports `resync_check`). */
data class ResyncCheck(
    val match: Boolean,
    val conflicts: List<String>,
    val moveUci: String?,
    val agreement: Double,
    val confidentN: Int,
)

/**
 * Pre-commit verification of a diff candidate by OCCUPANCY — the model's
 * reliable axis (~99.99% on `empty`, weak on piece identity). Ports the decision
 * ladder of `tracker.py:1497-1644` `_verify_tick` and `_verify_pair_tick` as a
 * pure evaluation over one observation; the [CnnSafeguard] worker drives it over
 * up to [CnnConfig.verifyWindow] observations.
 */
class OccupancyVerifier(
    private val config: CnnConfig = CnnConfig(),
) {
    /** Evaluate one observation of the pending candidate ([framesSeen] includes it). */
    fun evaluate(
        fenBefore: String,
        ucis: List<String>,
        obs: OccupancyObservation,
        framesSeen: Int,
    ): VerifyStep {
        val game = Game(fenBefore)
        val moves =
            resolveUcis(game, ucis)
                ?: return VerifyStep.Decided(
                    VerifyVerdict.Against(ucis, "candidate no longer legal for $fenBefore"),
                )
        return if (moves.size == 1) {
            evaluateSingle(game, ucis, moves[0], obs, framesSeen)
        } else {
            evaluatePair(game, ucis, moves, obs, framesSeen)
        }
    }

    /**
     * Reliable/unreliable axes (tracker.py:1550-1562): confident-EMPTY readings
     * are trustworthy, confident-OCCUPIED ones are not — from-square "still
     * occupied" never hard-rejects, it only withholds confirmation.
     */
    private fun evaluateSingle(
        game: Game,
        ucis: List<String>,
        move: Move,
        obs: OccupancyObservation,
        framesSeen: Int,
    ): VerifyStep {
        val axes = axesOf(game, move, obs)
        val touched = MoveScoring.moveTouchedSquares(game, move)
        val check = resyncCheck(game, obs, requiredSquares = touched)
        return when {
            // 1) Board unchanged -> shadow/no real move; engine keeps its known-good reference.
            check.match ->
                decideAgainst(ucis, "board unchanged (shadow/no move)", boardUnchanged = true, outcome = "shadow")
            // 2) Positive confirmation via the reliable axes FIRST (before any veto).
            commitEvidence(game, move, obs) ->
                VerifyStep.Decided(VerifyVerdict.For(ucis), outcome = "commit", votes = true)
            // 3) HARD veto: destination confidently EMPTY and origin did NOT clearly empty.
            axes.toEmptyConf && !axes.fromLeftConf ->
                decideAgainst(ucis, "ghost — ${axes.toSq} still empty", outcome = "ghost")
            // 4) CNN sees a DIFFERENT unambiguous move. Python overrules the diff
            //    (tracker.py:1619); the VerifyVerdict seam cannot carry a replacement
            //    move, so the candidate is rejected instead (STATUS.md discrepancy #13).
            check.moveUci != null && check.moveUci != ucis[0] && check.agreement >= config.minAgreement ->
                decideAgainst(ucis, "cnn sees ${check.moveUci} instead", outcome = "overrule:${check.moveUci}")
            // 5) Undecided: wait up to verifyWindow observations, then resolve single-shot.
            framesSeen >= config.verifyWindow -> resolveWindow(game, move, ucis, axes, obs)
            else ->
                VerifyStep.Continue("checking ${ucis[0]} via CNN… ($framesSeen/${config.verifyWindow})")
        }
    }

    /**
     * Positive commit confirmation (9432e1f + 6368b88):
     * - "piece left FROM" is NEVER commit evidence on its own (b1c4 incident) — non-castling
     *   needs the whole-board occupancy deriving exactly the pending move;
     * - to-arrived is insufficient when the ORIGIN confidently never emptied (d4b3 incident);
     * - touched-square occupancy agreement stays a direct confirmation.
     */
    private fun commitEvidence(
        game: Game,
        move: Move,
        obs: OccupancyObservation,
    ): Boolean {
        val (occAgree, occN) = verifyMove(game, move, obs)
        val touchedN = MoveScoring.moveTouchedSquares(game, move).size
        return occN == touchedN && occAgree >= config.minAgreement
    }

    /**
     * Endpoint evidence of a candidate move (tracker.py:1550-1562): the
     * reliable-axis booleans the decision ladder reasons over.
     */
    private data class EndpointAxes(
        val fromSq: String,
        val toSq: String,
        val fromConf: Boolean,
        val toConf: Boolean,
        val fromLeftConf: Boolean,
        val toEmptyConf: Boolean,
        val toArrivedConf: Boolean,
        val fromOccConf: Boolean,
    )

    private fun axesOf(
        game: Game,
        move: Move,
        obs: OccupancyObservation,
    ): EndpointAxes {
        val fromSq = move.from.value().lowercase()
        val toSq = move.to.value().lowercase()
        val conf = obs.confident(config.confThr)
        val toConf = conf[toSq] == true
        val fromConf = conf[fromSq] == true
        return EndpointAxes(
            fromSq = fromSq,
            toSq = toSq,
            fromConf = fromConf,
            toConf = toConf,
            fromLeftConf = fromConf && !obs.occupied(fromSq), // reliable FOR (empty axis)
            toEmptyConf = toConf && !obs.occupied(toSq), // reliable AGAINST
            toArrivedConf = toConf && obs.occupied(toSq) && !isCapture(game, move), // decent FOR
            fromOccConf = fromConf && obs.occupied(fromSq), // UNRELIABLE — no hard reject
        )
    }

    private fun resolveWindow(
        game: Game,
        move: Move,
        ucis: List<String>,
        axes: EndpointAxes,
        obs: OccupancyObservation,
    ): VerifyStep =
        when {
            // Origin still confidently occupied and destination never arrived -> ghost.
            axes.fromOccConf && !axes.toArrivedConf ->
                decideAgainst(ucis, "not confirmed — ${axes.fromSq} still occupied")
            // Both endpoints occluded the whole window -> can't tell -> discard.
            !(axes.toConf || axes.fromConf) ->
                VerifyStep.Decided(VerifyVerdict.Timeout(ucis))
            // Clear view, endpoints not strongly confirmed. Before trusting the diff, check
            // the WHOLE board against the POST-move position (b1d4 incident, cf31c81): any
            // occupancy conflict -> the move as believed did NOT happen -> discard.
            else -> {
                val after = game.copy().apply { push(move) }
                val touched = MoveScoring.moveTouchedSquares(game, move)
                val postCheck = resyncCheck(after, obs, requiredSquares = touched)
                if (postCheck.match) {
                    VerifyStep.Decided(VerifyVerdict.For(ucis))
                } else if (postCheck.conflicts.isNotEmpty()) {
                    decideAgainst(
                        ucis,
                        "board contradicts post-move position: ${postCheck.conflicts.take(SHOWN_CONFLICTS).joinToString(", ")}",
                    )
                } else {
                    VerifyStep.Decided(VerifyVerdict.Timeout(ucis))
                }
            }
        }

    /**
     * Pair candidate (fast play): whole-position occupancy match is the robust
     * axis with 3-4 touched squares (ports `_verify_pair_tick`).
     */
    private fun evaluatePair(
        game: Game,
        ucis: List<String>,
        moves: List<Move>,
        obs: OccupancyObservation,
        framesSeen: Int,
    ): VerifyStep {
        val touched = mutableSetOf<String>()
        val after = game.copy()
        for (mv in moves) {
            touched += MoveScoring.moveTouchedSquares(after, mv)
            after.push(mv)
        }
        val before = resyncCheck(game, obs, requiredSquares = touched)
        val afterCheck = resyncCheck(after, obs, requiredSquares = touched)
        return when {
            before.match -> decideAgainst(ucis, "board unchanged (shadow/no move)", boardUnchanged = true)
            afterCheck.match -> VerifyStep.Decided(VerifyVerdict.For(ucis))
            framesSeen >= config.verifyWindow -> VerifyStep.Decided(VerifyVerdict.Timeout(ucis))
            else ->
                VerifyStep.Continue(
                    "checking double move ${ucis.joinToString(" ")} via CNN… ($framesSeen/${config.verifyWindow})",
                )
        }
    }

    /**
     * LOCAL pre-commit check of one candidate move (ports `verify_move`,
     * `cnn_recovery.py:188`): only squares physically changed by the move count;
     * both endpoints must be confident, else (agreement 0.0, n<2) — wait.
     */
    fun verifyMove(
        game: Game,
        move: Move,
        obs: OccupancyObservation,
    ): Pair<Double, Int> {
        val conf = obs.confident(config.confThr)
        val touched = MoveScoring.moveTouchedSquares(game, move)
        val after = game.copy().apply { push(move) }
        val checked = touched.filter { conf[it] == true }
        if (checked.size < MIN_ENDPOINTS) return 0.0 to checked.size
        val hits = checked.count { obs.occupied(it) == (after.pieceCharAt(it) != null) }
        return hits.toDouble() / checked.size to checked.size
    }

    /** Diff believed vs observed occupancy over the confident squares (ports `resync_check`). */
    fun resyncCheck(
        game: Game,
        obs: OccupancyObservation,
        requiredSquares: Set<String> = emptySet(),
    ): ResyncCheck {
        val conf = obs.confident(config.confThr)
        val confidentN = conf.count { it.value }
        val conflicts =
            ALL_SQUARES.filter { sq ->
                conf[sq] == true && obs.occupied(sq) != (game.pieceCharAt(sq) != null)
            }
        val requiredVisible = requiredSquares.all { conf[it] == true }
        val enoughBoard = confidentN >= config.minConfidentBoard
        if (conflicts.isEmpty() && enoughBoard && requiredVisible) {
            return ResyncCheck(match = true, emptyList(), null, 1.0, confidentN)
        }
        val (mv, best, _) = scoreMoves(game, obs)
        return ResyncCheck(match = false, conflicts, mv?.let(::uciOf), best.coerceAtLeast(0.0), confidentN)
    }

    /**
     * Occupancy agreement of every legal move over the confident squares
     * (ports `score_moves`); (null, best, second) when nothing is clear enough.
     */
    fun scoreMoves(
        game: Game,
        obs: OccupancyObservation,
    ): Triple<Move?, Double, Double> {
        val confSquares =
            obs
                .confident(config.confThr)
                .filterValues { it }
                .keys
                .toList()
        val n = confSquares.size
        if (n < config.minConfidentRecovery) return Triple(null, 0.0, 0.0)
        var bestMv: Move? = null
        var bestHits = -1
        var secondHits = -1
        for (mv in game.legalMoves()) {
            val after = game.copy().apply { push(mv) }
            val hits = confSquares.count { obs.occupied(it) == (after.pieceCharAt(it) != null) }
            if (hits > bestHits) {
                secondHits = bestHits
                bestHits = hits
                bestMv = mv
            } else if (hits > secondHits) {
                secondHits = hits
            }
        }
        val best = if (bestHits >= 0) bestHits.toDouble() / n else 0.0
        val second = if (secondHits >= 0) secondHits.toDouble() / n else 0.0
        // Margin in squares: promotion variants are occupancy-identical -> intentionally null.
        val ambiguous =
            bestMv == null || best < config.minAgreement || (bestHits - secondHits) < config.marginSquares
        return if (ambiguous) Triple(null, best, second) else Triple(bestMv, best, second)
    }

    private fun decideAgainst(
        ucis: List<String>,
        reason: String,
        boardUnchanged: Boolean = false,
        outcome: String? = null,
    ): VerifyStep =
        VerifyStep.Decided(
            VerifyVerdict.Against(ucis, reason, boardUnchanged),
            outcome = outcome ?: "",
            votes = outcome != null,
        )

    private companion object {
        const val MIN_ENDPOINTS = 2
        const val SHOWN_CONFLICTS = 4
    }
}

/** Resolve a UCI sequence to legal moves on a copy of [game]; null when illegal. */
fun resolveUcis(
    game: Game,
    ucis: List<String>,
): List<Move>? {
    val g = game.copy()
    val moves = mutableListOf<Move>()
    for (u in ucis) {
        val mv = g.legalMoves().firstOrNull { uciOf(it) == u } ?: return null
        moves.add(mv)
        g.push(mv)
    }
    return moves.takeIf { it.isNotEmpty() }
}

/** True when [move] captures (incl. en passant: pawn moves diagonally to an empty square). */
fun isCapture(
    game: Game,
    move: Move,
): Boolean {
    val toSq = move.to.value().lowercase()
    if (game.pieceCharAt(toSq) != null) return true
    val fromSq = move.from.value().lowercase()
    val mover = game.pieceCharAt(fromSq)
    return (mover == 'P' || mover == 'p') && fromSq[0] != toSq[0]
}
