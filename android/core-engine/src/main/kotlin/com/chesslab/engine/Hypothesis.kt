package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.move.Move

/** The ORDER is load-bearing: **pair before single with CNN, single before pair without**. Without a CNN a
 *  garbage pair over four residue squares outscores the true single (clip01). */
internal data class Candidate(
    val moves: List<Move>,
    val priorUsed: Boolean,
    /** `false` = endpoint candidate: skips the confirmer AND the absolute LL floor. */
    val vote: Boolean,
    val note: String? = null,
)

/** [viable] is [viableRaw] minus the moves whose DESTINATION is shadow-vetoed. */
internal class ViableMoves(
    val scored: List<Pair<Move, Double>>,
    val viableRaw: List<Pair<Move, Double>>,
    val viable: List<Pair<Move, Double>>,
    val obsMove: Move?,
    val best: Double,
    val second: Double,
)

/** Every touched square needs weak evidence, else one hot square (a nudge) scores cold-target moves net-positive.
 *  The shadow filter drops DESTINATION vetoes only — a shadow on FROM is vacate evidence. */
internal fun EngineState.scoreViableMoves(z: DoubleArray): ViableMoves {
    val scored = loglikScores(board, z, config.zThr, LL_K)
    val soft = config.zThr * PAIR_SOFT_FACTOR
    val veto = shadowVetoed
    val viableRaw = scored.filter { (mv, _) -> touchedReadable(mv, z, soft) }
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
        // Only when the filter changed the OUTCOME is the note useful; a blocked also-ran is debug material.
        note = "${board.san(viableRaw[0].first)}? destination shadow-vetoed — not a move"
    }
    return ViableMoves(scored, viableRaw, viable, obsMove, best, second)
}

/** Ein stummes ZIELFELD darf ein vom Modell bestaetigter Schlag sein: auf besetztem Feld sieht der Diff nichts,
 *  und der richtige Zug war nicht mehr viabel (`Nxe5 Nxe5 dxe5`: 205 Entscheidungen, `e5` nie in `changed`). */
internal fun EngineState.touchedReadable(
    mv: Move,
    z: DoubleArray,
    soft: Double,
): Boolean {
    val mask = moveTouchedMask(board, mv)
    if (allAbove(mask, z, soft)) return true
    val to = mv.to.ordinal
    // Jedes ANDERE stumme Feld bleibt ein Ausschluss — gelockert wird nur das Ziel des Schlags.
    for (i in 0 until Squares.COUNT) {
        if (mask.has(i) && z[i] < soft && i != to) return false
    }
    return mask.has(to) && z[to] < soft && capturesConfirmedColour(mv)
}

/** Farbe, nicht Identitaet: die bleibt die schwaechste Achse, und hier haengt ein Zug daran. */
private fun EngineState.capturesConfirmedColour(mv: Move): Boolean {
    val taken = board.pieceCharAt(mv.to.ordinal)
    val moving = board.pieceCharAt(mv.from.ordinal)
    // Die einzige Stelle, die einen Zug allein aus einer Modellfarbe viabel macht — roh gelesen trug sie ein
    // beliebig altes Bild aus einer anderen Stellung.
    val obs = freshSnapshot()?.takeIf { it.fen == board.fen() }?.obs
    val capture = taken != null && moving != null && taken.isUpperCase() != moving.isUpperCase()
    if (!capture || obs == null) return false
    val name = Squares.ALL[mv.to.ordinal]
    val colour = if (moving!!.isUpperCase()) "w" else "b"
    return obs.label(name)?.startsWith(colour) == true && obs.conf(name) >= CAPTURE_SURE
}

private const val CAPTURE_SURE = 0.9

internal fun allAbove(
    mask: Long,
    z: DoubleArray,
    thr: Double,
): Boolean {
    var ok = true
    mask.forEachSquare { if (z[it] < thr) ok = false }
    return ok
}

/** Exactly one [Candidate], or the frame is handled (stuck + patcher, ambiguous note, promotion) and `null`.
 *  [cur]/[curBgr] are the averaged pair the patcher heals from. */
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

private class Outcome(
    val candidate: Candidate?,
)

/** Too much change keeps base truth **unless a PAIR explains it** (up to ~8 squares). Occluded squares count
 *  as changed (invariant 4), and a pair is NEVER trusted while a hand is detected. */
private fun EngineState.tooMuchChangeGate(
    z: DoubleArray,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome? {
    val changedN = changed.countOneBits()
    val blockedN = tainted.countOneBits()
    // Squares a fresh, position-matched, confident read calls UNCHANGED stop counting (Qxe2: one move plus a
    // bleed cloud of 7 at `empty 1.000`). Counting only; the hand rule stays on the RAW tainted count.
    val confirmed = cnnConfirmedUnchanged(changed or tainted)
    val changedEff = changed.without(confirmed).countOneBits()
    val blockedEff = tainted.without(confirmed).countOneBits()
    if (changedEff + blockedEff <= config.maxChanged) return null
    if (blockedN == 0 && changedEff <= config.maxChanged + 2) {
        pairCandidate(z, moves.best)?.let { return Outcome(it) }
    }
    refuseTooMuchChange(changedN, blockedN, confirmed.countOneBits(), moves, cur, curBgr)
    return Outcome(null)
}

private fun EngineState.refuseTooMuchChange(
    changedN: Int,
    blockedN: Int,
    discounted: Int,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    confirmer.reset()
    // The stuck marker is what triggers recovery.
    markStuck(STUCK_TOO_MANY_CHANGED)
    maybePatchAnomaly(moves.best, cur, curBgr)
    if (stuckReason != null) {
        // Only when the discount was live: the base string is asserted byte-for-byte by the parity replay.
        note =
            "Much change ($changedN squares + $blockedN occluded) — " +
            "occluded/unstable, no move committed (base truth unchanged)" +
            if (discounted > 0) " ($discounted CNN-confirmed unchanged)" else ""
    }
}

private fun EngineState.pairBeforeSingle(
    z: DoubleArray,
    moves: ViableMoves,
): Outcome? = if (cnnOn) pairCandidate(z, moves.best)?.let { Outcome(it) } else null

/** Pair (without CNN, the conservative order) → destination-only endpoint (CNN only) → stuck + self-healing. */
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
            singleEndpointCandidate(z, moves.scored, cur, curBgr)?.let { sm ->
                // vote = false: the CNN verify IS this candidate's confirmation, so it skips confirmer and LL floor.
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
            // Eine Promotion hat die Leiter selbst beantwortet — die Q/R/B/N-Frage steht, kein Stuck.
            if (out == null && promoPending != null) out = Outcome(null)
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

/** The one exit that leaves no stuck marker, so it records its own row. Promotion is excluded: it raises
 *  `PromotionPending` and blocks detection until the user answers. */
private fun EngineState.ambiguityOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome {
    val res = resolveAmbiguity(moves, cur, curBgr)
    val move = res.move
    if (move == null && promoPending == null) {
        // Folded on the changed set: the gate re-fires every stable frame, so one row per EVIDENCE SET.
        recordRejection("", REASON_QUIET_EDGE, foldOnChanged = true)
    }
    return Outcome(if (move == null) null else Candidate(listOf(move), res.priorUsed, vote = true))
}

internal const val STUCK_TOO_MANY_CHANGED = "too_many_changed"

internal const val STUCK_NO_LEGAL_MOVE = "no_legal_move"

/** Unlike `STUCK no_legal_move` (fitted none): this evidence fitted too MANY, and the engine refused to choose. */
internal const val REASON_QUIET_EDGE = "QUIET ambiguous — evidence, but no candidate formed"
