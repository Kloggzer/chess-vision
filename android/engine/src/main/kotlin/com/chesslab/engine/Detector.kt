package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.MoveCandidate
import com.chesslab.engine.api.OccupancySafeguard
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent

/**
 * Ordered detection pipeline of one stable frame (ports tracker.py:1942 `_try_detect`;
 * step numbering mirrors docs/move-tracker-flow.md):
 * 1 guards, 2 evidence, 3 vetoes, 4 noise learning, 5 quiet/re-anchor, 6 hypothesis,
 * 7 motion prerequisite, 8 confirmer, 9 dispatch.
 */
internal class Detector(
    private val config: TrackerConfig,
    private val state: EngineState,
    private val safeguard: () -> OccupancySafeguard?,
) {
    val hypothesis = HypothesisGenerator(config) { safeguard() != null }
    val patcher = AnomalyPatcher(config)
    var confirmer = Confirmer(config.confirmFrames)

    private val geom get() = BoardGeometry(state.refGray?.width ?: 0, whitePov = true, extendUp = config.overhang)

    fun tryDetect(
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
        events: MutableList<TrackerEvent>,
    ) {
        if (!guards()) return
        val ev = computeEvidence(cur, curBgr, nowS)
        if (ev.changed.isEmpty() && quietHandled(ev, cur, curBgr)) return
        when (val outcome = hypothesis.generate(state.game, ev, blockedN = 0)) {
            is HypothesisOutcome.Stuck -> onStuck(outcome, ev, cur, curBgr, nowS)
            is HypothesisOutcome.Ambiguous -> {
                confirmer.reset()
                state.note = outcome.note
            }
            is HypothesisOutcome.Promotion -> onPromotion(outcome, cur, curBgr, events)
            is HypothesisOutcome.Candidate -> onCandidate(outcome, cur, curBgr, nowS, events)
        }
    }

    /** Step 1 — abort conditions before any evidence is computed (ports tracker.py:2075). */
    private fun guards(): Boolean =
        when {
            state.pending != null || state.promoPending != null -> false
            state.refGray == null || state.refFen != state.game.fen() -> {
                state.invalidateRef()
                false
            }
            else -> true
        }

    /** Steps 2+3+4 — diff -> z-scores, occlusion taint, shadow veto, noise learning. */
    private fun computeEvidence(
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
    ): Evidence {
        val diffs = SquareDiff.normalizeDiffs(SquareDiff.perSquareDiff(state.refGray!!, cur, geom))
        val z = state.noise.z(diffs).toMutableMap()
        // Baseline-absdiff occlusion (hand squares): without a CNN arbiter, >2 flagged squares
        // are treated as a hand — their z is ZEROED and they are latched (tracker.py:1964).
        if (state.motionOccluded.isNotEmpty()) {
            val taint = if (state.motionOccluded.size > 2) state.motionOccluded else emptySet()
            for (sq in taint) {
                z[sq] = 0.0
                state.tainted[sq] = nowS + config.motionHoldS
            }
        }
        state.occludedVetoed = state.motionOccluded.sorted()
        state.motionOccluded = emptySet()
        state.occlusionExpiry.entries.removeIf { nowS >= it.value }
        val changed = z.filterValues { it >= config.zThr }.keys.toMutableSet()
        state.changedVals =
            z
                .filterValues { it >= config.zThr * HALF }
                .toList()
                .sortedByDescending { it.second }
                .take(TOP_CHANGED)
        val shadowVeto = applyShadowVeto(cur, curBgr, changed)
        state.changed = changed.sorted()
        // Noise learns on EVERY stable frame the non-candidate squares (tracker.py:1984).
        state.noise.update(diffs, exclude = changed + shadowVeto)
        state.tainted.entries.removeIf { nowS > it.value }
        val scored = MoveScoring.loglikScores(state.game, z, config.zThr)
        val soft = config.zThr * HALF
        val viable =
            scored.filter { (mv, _) ->
                MoveScoring.moveTouchedSquares(state.game, mv).all { z.getValue(it) >= soft }
            }
        val (obs, best) = viable.firstOrNull() ?: (null to NEG_INF)
        val second = if (viable.size > 1) viable[1].second else NEG_INF
        state.bestScore = if (obs != null) best else (scored.firstOrNull()?.second ?: 0.0)
        state.secondScore = second
        state.candidateUci = obs?.let { uciOf(it) }
        return Evidence(z, scored, viable, changed, TopScore(obs, best, second))
    }

    /** Step 3 — cast-shadow veto: removes squares from `changed`, KEEPS their z (vacate evidence). */
    private fun applyShadowVeto(
        cur: GrayImage,
        curBgr: BgrImage,
        changed: MutableSet<String>,
    ): Set<String> {
        val refBgr = state.refBgr
        if (refBgr == null || changed.isEmpty()) return emptySet()
        val codes = state.refCensus ?: Census.transform(state.refGray!!).also { state.refCensus = it }
        val census = Census.perSquareChange(state.refGray!!, cur, geom, refCodes = codes)
        val shadows = ShadowVeto.shadowSquares(refBgr, curBgr, geom, changed)
        val veto = changed.filterTo(mutableSetOf()) { it in shadows && census.getValue(it) < config.censusThr }
        changed -= veto
        state.shadowVetoed = veto.sorted()
        return veto
    }

    /** Step 5 — quiet board: re-anchor or wait (ports tracker.py:2007-2035). Returns true when handled. */
    private fun quietHandled(
        ev: Evidence,
        cur: GrayImage,
        curBgr: BgrImage,
    ): Boolean {
        val obs = ev.top.obsMove
        val touched = obs?.let { MoveScoring.moveTouchedSquares(state.game, it).size } ?: 2
        val scaledFloor = config.reanchorLlFloor * (touched / 2.0)
        return when {
            obs == null || ev.best < scaledFloor -> {
                if (state.tainted.isNotEmpty()) {
                    // Occlusion latch active: re-anchoring would bake the hand into the reference.
                    state.markStuck("occluded")
                    state.note = "waiting for occluded squares to clear…"
                } else {
                    confirmer.reset()
                    state.clearStuck()
                    patcher.reset()
                    state.setRef(cur, curBgr)
                }
                true
            }
            ev.best < 0.0 -> {
                // Weak but move-consistent evidence: KEEP reference, keep collecting.
                state.note = "weak move evidence (${state.game.san(obs!!)}?) — waiting"
                true
            }
            else -> false
        }
    }

    private fun onStuck(
        outcome: HypothesisOutcome.Stuck,
        ev: Evidence,
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
    ) {
        confirmer.reset()
        state.markStuck(outcome.reason)
        val frames = AnomalyPatcher.Frames(state.refGray!!, state.refBgr, cur, curBgr)
        val patched =
            patcher.maybePatch(ev.changed, ev.best, frames, nowS) { sq ->
                state.game.pieceCharAt(sq) != null
            }
        if (patched.isNotEmpty()) {
            state.refCensus = null // ref mutated in place -> recode
            state.note = "Reference pulled forward (${patched.joinToString(", ")}) — no move"
            if (patched.size == ev.changed.size) {
                state.clearStuck()
                confirmer.reset()
            }
        } else if (state.stuckReason != null) {
            state.note = outcome.note
        }
    }

    private fun onPromotion(
        outcome: HypothesisOutcome.Promotion,
        cur: GrayImage,
        curBgr: BgrImage,
        events: MutableList<TrackerEvent>,
    ) {
        state.promoPending = PromoPending(outcome.fromSquare, outcome.toSquare, cur, curBgr, state.game.fen())
        state.note = "Promotion detected — please choose piece (Q/R/B/N)"
        events.add(TrackerEvent.PromotionPending(outcome.fromSquare, outcome.toSquare))
    }

    /** Steps 7+8+9 — motion prerequisite, confirmer voting, dispatch (ports tracker.py:2047-2073). */
    private fun onCandidate(
        cand: HypothesisOutcome.Candidate,
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
        events: MutableList<TrackerEvent>,
    ) {
        cand.scores?.let { (b, s) ->
            state.bestScore = b
            state.secondScore = s
        }
        val sans = state.game.sanSequence(cand.moves)
        val age = nowS - state.lastMotionTs
        val gateBlocked =
            config.requireMotionForMove &&
                (!state.motionSinceRef || age > config.motionRecencyS)
        val key = cand.moves.joinToString(" ") { uciOf(it) }
        state.candidateUci = key
        when {
            gateBlocked -> {
                confirmer.reset()
                val why = if (!state.motionSinceRef) "no motion since last move" else "last motion ${age.toInt()}s ago"
                state.note = "${sans.joinToString(" + ")}? ignored — $why (drift/light, not a real move)"
            }
            cand.vote && !confirmer.feed(key) ->
                state.note = "detecting ${sans.joinToString(" + ")}… (${confirmer.count}/${config.confirmFrames})"
            else -> {
                patcher.reset()
                dispatch(cand, cur, curBgr, events)
            }
        }
    }

    /** Step 9 — the ONE commit gate: safeguard-pending or direct commit (ports tracker.py:2262). */
    private fun dispatch(
        cand: HypothesisOutcome.Candidate,
        cur: GrayImage,
        curBgr: BgrImage,
        events: MutableList<TrackerEvent>,
    ) {
        val guard = safeguard()
        if (guard != null) {
            val ucis = cand.moves.map { uciOf(it) }
            state.pending = PendingVerify(ucis, state.game.fen(), cur, curBgr, cand.priorUsed)
            val g = state.game.copy()
            val touched = mutableSetOf<String>()
            for (mv in cand.moves) {
                touched += MoveScoring.moveTouchedSquares(g, mv)
                g.push(mv)
            }
            val sans = state.game.sanSequence(cand.moves).joinToString(" + ")
            state.note = cand.note ?: "checking $sans via safeguard…"
            guard.requestVerify(MoveCandidate(ucis, state.game.fen(), cand.priorUsed), touched.toList())
            return
        }
        val decider = if (cand.moves.size == 1) "diff" else "diff_pair"
        state.commit(cand.moves, cur to curBgr, decider to cand.priorUsed, events)
    }

    private companion object {
        const val HALF = 0.5
        const val TOP_CHANGED = 8
        const val NEG_INF = -1e9
    }
}
