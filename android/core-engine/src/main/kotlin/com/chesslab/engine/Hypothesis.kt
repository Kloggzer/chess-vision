package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.github.bhlangonijr.chesslib.move.Move

/**
 * Step 6 — the ONE place where evidence becomes a candidate, so the ORDER is load-bearing: **pair
 * before single with CNN, single before pair without**. Without a CNN a garbage pair over four residue
 * squares outscores the true single (clip01); with one it must match the post-pair position instead.
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
 * The result of step 5's scoring + viability filter, handed to [generateHypothesis]. [viable] is
 * [viableRaw] (every touched square carries at least soft evidence) minus the moves whose DESTINATION
 * squares are shadow-vetoed.
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
 * Step 5 — LL-scoring plus the two-stage viability filter. Every touched square must carry at least
 * weak evidence, else a single hot square (a nudge) scores moves with cold targets net-positive. The
 * shadow filter drops DESTINATION vetoes only — a shadow on FROM is vacate evidence, not a block.
 */
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
        // The filter changed the OUTCOME (the best raw candidate was shadow-blocked) — only then
        // is the note useful; a blocked also-ran is debug-card material.
        note = "${board.san(viableRaw[0].first)}? destination shadow-vetoed — not a move"
    }
    return ViableMoves(scored, viableRaw, viable, obsMove, best, second)
}

/**
 * Wie [allAbove], aber ein stummes ZIELFELD darf ein vom Modell bestaetigter Schlag sein: ein Schlag
 * auf besetztem Feld laesst dort eine Figur stehen, der Diff sieht nichts, und der richtige Zug ist
 * nicht mehr viabel (2026-08-30, `Nxe5 Nxe5 dxe5`: 205 Entscheidungen, `e5` nie in `changed`).
 */
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

/**
 * Ein Schlag, der die FARBE des Zielfelds wechselt und den das Modell dort sicher bestaetigt. Farbe,
 * nicht Identitaet: die bleibt die schwaechste Achse, und hier haengt ein Zug daran.
 */
private fun EngineState.capturesConfirmedColour(mv: Move): Boolean {
    val taken = board.pieceCharAt(mv.to.ordinal)
    val moving = board.pieceCharAt(mv.from.ordinal)
    val obs = cnnSnap?.obs
    val capture = taken != null && moving != null && taken.isUpperCase() != moving.isUpperCase()
    if (!capture || obs == null) return false
    val name = Squares.ALL[mv.to.ordinal]
    val colour = if (moving!!.isUpperCase()) "w" else "b"
    return obs.label(name)?.startsWith(colour) == true && obs.conf(name) >= CAPTURE_SURE
}

/** Wie sicher das Modell die neue Farbe lesen muss, damit ein stummes Zielfeld durchgeht. */
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

/**
 * Step 6 — turn the evidence into exactly one [Candidate], or handle the frame (stuck + anomaly
 * patcher, ambiguous note, promotion pending) and return `null`. [cur] / [curBgr] are the averaged
 * pair the anomaly patcher heals the reference from.
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
 * Too much change is occlusion/instability and the base truth stays, **unless a move PAIR explains it**
 * (fast play: two half-moves touch up to ~8 squares). Occluded/latched squares count as changed here
 * (invariant 4) and a pair is NEVER trusted while a hand is detected (`blockedN == 0`).
 */
private fun EngineState.tooMuchChangeGate(
    z: DoubleArray,
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome? {
    val changedN = changed.countOneBits()
    val blockedN = tainted.countOneBits()
    // Squares a fresh, position-matched, confident observation reads as UNCHANGED stop counting
    // toward the ceiling (Qxe2: one true move plus a bleed cloud of 7 read `empty 1.000`). Counting
    // only — z and `changed` are untouched, and the hand rule below stays on the RAW tainted count.
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

/** The refusal arm of [tooMuchChangeGate]: mark stuck, try the anomaly patch, say why. */
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
        // The suffix appears ONLY when the discount was live: the base string is asserted
        // byte-for-byte by the parity replay.
        note =
            "Much change ($changedN squares + $blockedN occluded) — " +
            "occluded/unstable, no move committed (base truth unchanged)" +
            if (discounted > 0) " ($discounted CNN-confirmed unchanged)" else ""
    }
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
            singleEndpointCandidate(z, moves.scored, cur, curBgr)?.let { sm ->
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

/**
 * The ambiguity arm — the one exit of [generateHypothesis] that leaves no stuck marker, so it records
 * its own row. Promotion is excluded on purpose: it sets [EngineState.promoPending], which raises
 * `TrackerEvent.PromotionPending` and blocks detection until the user answers.
 */
private fun EngineState.ambiguityOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
): Outcome {
    val res = resolveAmbiguity(moves, cur, curBgr)
    val move = res.move
    if (move == null && promoPending == null) {
        // Folded on the changed set: the gate re-fires on every stable frame while the same
        // standoff sits there, so one row per EVIDENCE SET is the whole budget this may spend.
        recordRejection("", REASON_QUIET_EDGE, foldOnChanged = true)
    }
    return Outcome(if (move == null) null else Candidate(listOf(move), res.priorUsed, vote = true))
}

internal const val STUCK_TOO_MANY_CHANGED = "too_many_changed"

internal const val STUCK_NO_LEGAL_MOVE = "no_legal_move"

/**
 * The quiet edge's reason string, deliberately unlike `STUCK no_legal_move`: that one means the
 * evidence fitted no legal move, this one that it fitted too MANY and the engine refused to choose.
 */
internal const val REASON_QUIET_EDGE = "QUIET ambiguous — evidence, but no candidate formed"
