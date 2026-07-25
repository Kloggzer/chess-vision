package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.move.Move

/**
 * Step 6 of `_try_detect` — the ONE place where evidence becomes a candidate.
 *
 * Python reference: `_generate_hypothesis` (`tracker.py:3188-3277`), plus the step-5 scoring and
 * viability filter it consumes (`tracker.py:2995-3011`).
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
 * The result of step 5's scoring + viability filter (`tracker.py:2995-3006`), handed to
 * [generateHypothesis].
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
 * The per-frame detection context [generateHypothesis] needs beyond the scored moves.
 *
 * @property blockedN `len(self._tainted)` — entry.md invariant 4: latched squares count toward
 *   `maxChanged` even though their z was zeroed. 03d passes `state.tainted.size`.
 */
internal class DetectContext(
    val changed: Set<String>,
    val shadowVeto: Set<String>,
    val blockedN: Int,
    val cur: GrayImage,
    val curBgr: BgrImage?,
)

/**
 * `_maybe_patch_anomaly(changed, bestLl, cur, curBgr)` — owned by phase 03d. 03c only calls the
 * seam; 03d wires its own implementation in (`state::maybePatchAnomaly`).
 */
internal typealias AnomalyPatcher = (Set<String>, Double, GrayImage, BgrImage?) -> Unit

/** Default hook: does nothing. 03d replaces it with the real cell patcher. */
internal val NO_ANOMALY_PATCH: AnomalyPatcher = { _, _, _, _ -> }

/**
 * Step 5 — LL-scoring plus the two-stage viability filter (`tracker.py:2995-3011`).
 *
 * A move is viable only when **every physically touched square** carries at least weak evidence
 * (`z >= zThr * 0.5`); otherwise a single hot square (a nudge!) scores moves with completely cold
 * target squares net-positive. `moveTouchedSquares` is the right set here — castling adds both
 * rook squares, en passant the captured pawn's square.
 *
 * The shadow filter then drops moves whose **destination** squares are shadow-vetoed — destinations
 * ONLY, never the full touched set (`specs/09`): a shadow on the FROM square is vacate evidence and
 * must not block the move, which is exactly why 02a keeps `moveDestinationSquares` separate.
 *
 * Writes [EngineState.bestScore] / [EngineState.secondScore] / [EngineState.candidateUci] and
 * appends the blocked UCIs to [EngineState.shadowBlocked] (cleared here, once per detection).
 */
internal fun EngineState.scoreViableMoves(
    z: Map<String, Double>,
    shadowVeto: Set<String>,
): ViableMoves {
    val scored = loglikScores(board, z, config.zThr, config.llK)
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val viableRaw =
        scored.filter { (mv, _) ->
            moveTouchedSquares(board, mv).all { (z[it] ?: 0.0) >= soft }
        }
    val viable =
        viableRaw.filter { (mv, _) ->
            moveDestinationSquares(board, mv).none { it in shadowVeto }
        }
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

/**
 * Step 6 — turn the evidence into exactly one [Candidate], or handle the frame (stuck + anomaly
 * patcher, ambiguous note, promotion pending) and return `null`.
 *
 * Port of `_generate_hypothesis` (`tracker.py:3188-3277`).
 */
internal fun EngineState.generateHypothesis(
    z: Map<String, Double>,
    moves: ViableMoves,
    ctx: DetectContext,
    patchAnomaly: AnomalyPatcher = NO_ANOMALY_PATCH,
): Candidate? {
    val outcome =
        tooMuchChangeGate(z, moves, ctx, patchAnomaly)
            ?: pairBeforeSingle(z, moves, ctx)
            ?: noSingleFitsGate(z, moves, ctx, patchAnomaly)
            ?: ambiguityOutcome(moves, ctx)
    return outcome.candidate
}

/** A handled frame: [candidate] `null` means "return null from [generateHypothesis]". */
private class Outcome(
    val candidate: Candidate?,
)

/**
 * `tracker.py:3197-3209` — too much change is occlusion/instability and the base truth stays,
 * **unless a move PAIR explains it** (fast play: two half-moves touch up to ~8 squares).
 *
 * Occluded/latched squares count as changed here ([DetectContext.blockedN], invariant 4) and a
 * pair is NEVER trusted while a hand is detected (`blockedN == 0` precondition).
 */
private fun EngineState.tooMuchChangeGate(
    z: Map<String, Double>,
    moves: ViableMoves,
    ctx: DetectContext,
    patchAnomaly: AnomalyPatcher,
): Outcome? {
    var out: Outcome? = null
    if (ctx.changed.size + ctx.blockedN > config.maxChanged) {
        if (ctx.blockedN == 0 && ctx.changed.size <= config.maxChanged + 2) {
            pairCandidate(z, moves.best, ctx.shadowVeto)?.let { out = Outcome(it) }
        }
        if (out == null) {
            confirmer.reset()
            // Spec 09: the stuck marker is the recovery trigger via `_cnn_tick`.
            markStuck(STUCK_TOO_MANY_CHANGED)
            patchAnomaly(ctx.changed, moves.best, ctx.cur, ctx.curBgr)
            if (stuckReason != null) {
                note =
                    "Much change (${ctx.changed.size} squares + ${ctx.blockedN} occluded) — " +
                    "occluded/unstable, no move committed (base truth unchanged)"
            }
            out = Outcome(null)
        }
    }
    return out
}

/** `tracker.py:3218-3222` — the pair is tried BEFORE the single, with CNN verify only. */
private fun EngineState.pairBeforeSingle(
    z: Map<String, Double>,
    moves: ViableMoves,
    ctx: DetectContext,
): Outcome? {
    val pair = if (cnnOn) pairCandidate(z, moves.best, ctx.shadowVeto) else null
    return pair?.let { Outcome(it) }
}

/**
 * `tracker.py:3227-3243` — no single move explains the change: pair (without CNN, the conservative
 * order) → destination-only endpoint candidate (with CNN only) → stuck + self-healing.
 */
private fun EngineState.noSingleFitsGate(
    z: Map<String, Double>,
    moves: ViableMoves,
    ctx: DetectContext,
    patchAnomaly: AnomalyPatcher,
): Outcome? {
    var out: Outcome? = null
    if (moves.obsMove == null || moves.best < 0.0) {
        if (!cnnOn) {
            pairCandidate(z, moves.best, ctx.shadowVeto)?.let { out = Outcome(it) }
        }
        if (out == null && cnnOn) {
            singleEndpointCandidate(z, moves.scored, ctx.shadowVeto)?.let { sm ->
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
            patchAnomaly(ctx.changed, moves.best, ctx.cur, ctx.curBgr)
            if (stuckReason != null) {
                note =
                    "Change on ${ctx.changed.size} squares, but no legal move fits — " +
                    "possible wrong move, base truth unchanged (resync needed?)"
            }
            out = Outcome(null)
        }
    }
    return out
}

/** `tracker.py:3245-3277` — the ambiguity gate resolves (or handles) the single candidate. */
private fun EngineState.ambiguityOutcome(
    moves: ViableMoves,
    ctx: DetectContext,
): Outcome {
    val res = resolveAmbiguity(moves, ctx.cur, ctx.curBgr)
    val move = res.move
    return Outcome(
        if (move == null) null else Candidate(listOf(move), res.priorUsed, vote = true),
    )
}

/** `_mark_stuck("too_many_changed")` — Spec 09's recovery trigger. */
internal const val STUCK_TOO_MANY_CHANGED = "too_many_changed"

/** `_mark_stuck("no_legal_move")`. */
internal const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
