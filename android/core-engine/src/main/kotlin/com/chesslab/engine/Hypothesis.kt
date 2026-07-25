package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.move.Move

/**
 * Step 6 of `_try_detect` — the ONE place where evidence becomes a candidate.
 *
 * Python reference: `_generate_hypothesis`, plus the step-5 scoring and viability filter it
 * consumes.
 *
 * Everything that can fabricate a move happens here, which is why the ORDER is load-bearing and
 * counterintuitive: **pair before single with CNN, single before pair without**. Without a CNN a
 * garbage pair covering four residue squares always outscores the true single (clip01 replay), so
 * the conservative order is required there; with a CNN the pair goes pending and must match the
 * post-pair position, so trying it first is what stops a reply landing in the same settle window
 * from being silently swallowed by a net-positive single.
 */
internal data class Candidate(
    /** 1 = single / endpoint / promotion, 2 = pair. */
    val moves: List<Move>,
    val priorUsed: Boolean,
    /** `false` = endpoint candidate: skips the confirmer AND the absolute LL floor. */
    val vote: Boolean,
    val note: String? = null,
)

/**
 * The result of step 5's scoring + viability filter, handed to [generateHypothesis].
 *
 * @property scored the full `loglikScores` ranking, sorted descending.
 * @property viableRaw moves whose EVERY touched square carries at least soft evidence.
 * @property viable [viableRaw] minus the moves whose DESTINATION squares are shadow-vetoed.
 */
internal class ViableMoves(
    val scored: List<Pair<Move, Double>>,
    val viableRaw: List<Pair<Move, Double>>,
    val viable: List<Pair<Move, Double>>,
    val obsMove: Move?,
    val best: Double,
    val second: Double,
)

/**
 * Step 5 — LL-scoring plus the two-stage viability filter.
 *
 * A move is viable only when **every physically touched square** carries at least weak evidence
 * (`z >= zThr * 0.5`); otherwise a single hot square (a nudge!) scores moves with completely cold
 * target squares net-positive. `moveTouchedMask` is the right set here — castling adds both rook
 * squares, en passant the captured pawn's square.
 *
 * The shadow filter then drops moves whose **destination** squares are shadow-vetoed — destinations
 * ONLY, never the full touched set (`specs/09`): a shadow on the FROM square is vacate evidence and
 * must not block the move, which is exactly why `moveDestinationMask` is kept separate.
 *
 * Writes [EngineState.bestScore] / [EngineState.secondScore] / [EngineState.candidateUci] and
 * appends the blocked UCIs to [EngineState.shadowBlocked] (cleared here, once per detection).
 */
internal fun EngineState.scoreViableMoves(z: DoubleArray): ViableMoves {
    val scored = loglikScores(board, z, config.zThr, config.llK)
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val veto = shadowVetoed
    val viableRaw = scored.filter { (mv, _) -> allAbove(moveTouchedMask(board, mv), z, soft) }
    val viable = viableRaw.filter { (mv, _) -> moveDestinationMask(board, mv) and veto == 0L }
    val kept = viable.mapTo(HashSet()) { it.first }
    shadowBlocked.clear()
    for ((mv, _) in viableRaw) {
        if (mv !in kept) shadowBlocked.add(uciOf(mv))
    }

    val obsMove = viable.firstOrNull()?.first
    val best = if (viable.isEmpty()) NO_SCORE else viable[0].second
    val second = if (viable.size > 1) viable[1].second else NO_SCORE
    bestScore = if (viable.isNotEmpty()) best else (scored.firstOrNull()?.second ?: 0.0)
    secondScore = second
    candidateUci = obsMove?.let { uciOf(it) }
    if (viableRaw.isNotEmpty() && (viable.isEmpty() || viable[0].first != viableRaw[0].first)) {
        // The filter changed the OUTCOME (the best raw candidate was shadow-blocked) — only then
        // is the note useful; a blocked also-ran is debug-card material.
        note = "${board.san(viableRaw[0].first)}? destination shadow-vetoed — not a move"
    }
    return ViableMoves(scored, viableRaw, viable, obsMove, best, second)
}

internal fun allAbove(
    mask: Long,
    z: DoubleArray,
    thr: Double,
): Boolean {
    var ok = true
    mask.forEachSquare { if (z[it] < thr) ok = false }
    return ok
}

/**
 * Step 6 — turn the evidence into exactly one [Candidate], or handle the frame (stuck + anomaly
 * patcher, ambiguous note, promotion pending) and return `null`.
 *
 * `changed`, `shadowVetoed` and `tainted` are read off the state, exactly like Python's
 * `self._changed` / `self._tainted`; [cur] / [curBgr] are the averaged pair the anomaly patcher
 * heals the reference from.
 */
internal fun EngineState.generateHypothesis(
    z: DoubleArray,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Candidate? {
    val outcome =
        tooMuchChangeGate(z, moves, cur, curBgr)
            ?: pairBeforeSingle(z, moves)
            ?: noSingleFitsGate(z, moves, cur, curBgr)
            ?: ambiguityOutcome(moves, cur, curBgr)
    return outcome.candidate
}

/** A handled frame: [candidate] `null` means "return null from [generateHypothesis]". */
private class Outcome(
    val candidate: Candidate?,
)

/**
 * Too much change is occlusion/instability and the base truth stays, **unless a move PAIR explains
 * it** (fast play: two half-moves touch up to ~8 squares).
 *
 * Occluded/latched squares count as changed here (invariant 4) and a pair is NEVER trusted while a
 * hand is detected (the `blockedN == 0` precondition).
 */
private fun EngineState.tooMuchChangeGate(
    z: DoubleArray,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome? {
    val changedN = changed.countOneBits()
    val blockedN = tainted.countOneBits()
    var out: Outcome? = null
    if (changedN + blockedN > config.maxChanged) {
        if (blockedN == 0 && changedN <= config.maxChanged + 2) {
            pairCandidate(z, moves.best)?.let { out = Outcome(it) }
        }
        if (out == null) {
            confirmer.reset()
            // Spec 09: the stuck marker is the recovery trigger via `_cnn_tick`.
            markStuck(STUCK_TOO_MANY_CHANGED)
            maybePatchAnomaly(moves.best, cur, curBgr)
            if (stuckReason != null) {
                note =
                    "Much change ($changedN squares + $blockedN occluded) — " +
                    "occluded/unstable, no move committed (base truth unchanged)"
            }
            out = Outcome(null)
        }
    }
    return out
}

/** The pair is tried BEFORE the single, with CNN verify only. */
private fun EngineState.pairBeforeSingle(
    z: DoubleArray,
    moves: ViableMoves,
): Outcome? = if (cnnOn) pairCandidate(z, moves.best)?.let { Outcome(it) } else null

/**
 * No single move explains the change: pair (without CNN, the conservative order) →
 * destination-only endpoint candidate (with CNN only) → stuck + self-healing.
 */
private fun EngineState.noSingleFitsGate(
    z: DoubleArray,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome? {
    var out: Outcome? = null
    if (moves.obsMove == null || moves.best < 0.0) {
        if (!cnnOn) {
            pairCandidate(z, moves.best)?.let { out = Outcome(it) }
        }
        if (out == null && cnnOn) {
            singleEndpointCandidate(z, moves.scored)?.let { sm ->
                // vote = false: the CNN verify IS this candidate's multi-frame confirmation, so it
                // skips both the confirmer (step 8) and the absolute LL floor (step 6b).
                out =
                    Outcome(
                        Candidate(
                            moves = listOf(sm),
                            priorUsed = false,
                            vote = false,
                            note = "low-contrast move ${board.san(sm)}? verifying via CNN…",
                        ),
                    )
            }
        }
        if (out == null) {
            confirmer.reset()
            markStuck(STUCK_NO_LEGAL_MOVE)
            maybePatchAnomaly(moves.best, cur, curBgr)
            if (stuckReason != null) {
                note =
                    "Change on ${changed.countOneBits()} squares, but no legal move fits — " +
                    "possible wrong move, base truth unchanged (resync needed?)"
            }
            out = Outcome(null)
        }
    }
    return out
}

private fun EngineState.ambiguityOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome {
    val res = resolveAmbiguity(moves, cur, curBgr)
    val move = res.move
    return Outcome(if (move == null) null else Candidate(listOf(move), res.priorUsed, vote = true))
}

/** `_mark_stuck("too_many_changed")` — Spec 09's recovery trigger. */
internal const val STUCK_TOO_MANY_CHANGED = "too_many_changed"

/** `_mark_stuck("no_legal_move")`. */
internal const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
