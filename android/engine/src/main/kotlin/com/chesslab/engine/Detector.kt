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
    private var config: TrackerConfig,
    private val state: EngineState,
    private val safeguard: () -> OccupancySafeguard?,
) {
    val hypothesis = HypothesisGenerator(config) { safeguard() != null }
    val patcher = AnomalyPatcher(config)
    var confirmer = Confirmer(config.confirmFrames)
    private val slack = 2

    private val geom get() = BoardGeometry(state.refGray?.width ?: 0, whitePov = true, extendUp = config.overhang)

    fun updateConfig(
        newConfig: TrackerConfig,
        safeguardActive: Boolean,
    ) {
        config = newConfig
        hypothesis.updateConfig(newConfig)
        patcher.updateConfig(newConfig)
        confirmer = Confirmer(if (safeguardActive) 1 else newConfig.confirmFrames)
    }

    fun tryDetect(
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
        events: MutableList<TrackerEvent>,
    ) {
        if (!guards()) return
        val ev = computeEvidence(cur, curBgr, nowS)
        if (ev.changed.isEmpty() && quietHandled(ev, cur, curBgr)) return
        // Invariant: occlusion-latched squares ALWAYS count toward maxChanged — a hand whose
        // squares were z-zeroed must not leave 4-6 "clean" squares that read like a legal move.
        when (val outcome = hypothesis.generate(state.game, ev, blockedN = state.tainted.size)) {
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

    /** Steps 2+3+4 — fused diff/census z-scores, occlusion taint, shadow veto, noise learning. */
    private fun computeEvidence(
        cur: GrayImage,
        curBgr: BgrImage,
        nowS: Double,
    ): Evidence {
        val diffs =
            SquareDiff.normalizeDiffs(
                SquareDiff.perSquareDiff(state.refGray!!, cur, geom, config.diffJitterPx, config.diffIllumCancel),
            )
        val z = state.noise.z(diffs).toMutableMap()
        val cens = fuseCensusChannel(cur, z)
        applyTaintLatch(z, nowS)
        state.occlusionExpiry.entries.removeIf { nowS >= it.value }
        state.occlCoreExpiry.entries.removeIf { nowS >= it.value }
        val changed = z.filterValues { it >= config.zThr }.keys.toMutableSet()
        state.changedVals = topScores(z)
        val shadowVeto = applyShadowVeto(cur, curBgr, changed, cens)
        state.changed = changed.sorted()
        // Noise learns on EVERY stable frame the non-candidate squares (tracker.py:1984);
        // the census channel learns excluded squares on a SLOW LANE (8c30888).
        state.noise.update(diffs, exclude = changed + shadowVeto)
        cens?.let { state.censusNoise.update(it, exclude = changed + shadowVeto, excludeAlphaScale = CENSUS_SLOW_LANE) }
        // (Taint release happens in applyTaintLatch — motion-or-baseline gated, not timer-only.)
        return scoreCandidates(z, changed, shadowVeto)
    }

    /**
     * Structural channel: census change vs base truth, z-scored by its own noise model
     * and fused into `z` as max(zGray, w * zCensus). Census is illumination-invariant
     * (sees dark-on-dark moves) but NOT translation-invariant: median-normalize, and drop
     * the channel on a global disturbance (ports tracker.py b3d3825 + c3c2315).
     * Returns the normalized census map, or null when off/dropped this frame.
     */
    private fun fuseCensusChannel(
        cur: GrayImage,
        z: MutableMap<String, Double>,
    ): Map<String, Double>? {
        state.structVals = emptyList()
        if (config.censusZWeight <= 0) return null
        val cens =
            SquareDiff.normalizeDiffs(
                Census.perSquareChange(state.refGray!!, cur, geom, refCodes = state.refCensusCodes()),
            )
        val zs = state.censusNoise.z(cens)
        val w = config.censusZWeight
        val hot = zs.values.count { w * it >= config.zThr }
        return if (hot > config.maxChanged + slack) {
            // Channel-local guard: no legal move explains this many structurally-hot squares
            // → global disturbance (wobble, warp shift). Drop the census channel THIS frame
            // and learn the disturbance into its noise model. With the light veto armed, learn
            // SLOWLY: a full-alpha learn of the whole hot map inflates census σ board-wide, and
            // the z-quiet veto condition would then kill the next real dark-on-dark arrival
            // (the O-O/Rg8 failure class through the back door; review finding 2026-07-11).
            if (config.diffLightVeto) {
                state.censusNoise.update(cens, exclude = Squares.all.toSet(), excludeAlphaScale = CENSUS_SLOW_LANE)
            } else {
                state.censusNoise.update(cens)
            }
            null
        } else {
            state.structVals =
                zs
                    .filterValues { w * it >= config.zThr * HALF }
                    .toList()
                    .sortedByDescending { it.second }
                    .take(TOP_CHANGED)
            for ((sq, zc) in zs) z[sq] = maxOf(z.getValue(sq), w * zc)
            cens
        }
    }

    /**
     * Baseline-absdiff occlusion taint + latch invariant (211744f): an occluder cannot
     * vanish WITHOUT motion — a hand only leaves the board by moving. A tainted square is
     * released only when its hold expired AND (motion occurred since the last taint refresh
     * OR its evidence returned to baseline). Until released, latched squares carry NO
     * evidence (z zeroed EVERY frame) and display as occluded.
     */
    private fun applyTaintLatch(
        z: MutableMap<String, Double>,
        nowS: Double,
    ) {
        // Without a CNN arbiter, >2 flagged squares are treated as a hand (tracker.py:1964).
        if (state.motionOccluded.size > 2) {
            for (sq in state.motionOccluded) {
                z[sq] = 0.0
                state.tainted[sq] = nowS + config.motionHoldS
            }
        }
        // Resting-hand veto (cf31c81): occluded-dominant squares of a FRESH safeguard
        // observation taint exactly like baseline occlusion — a stale observation
        // predates the hand and is ignored.
        if (nowS - state.cnnOccludedTsS <= OBS_MAX_AGE_S) {
            for (sq in state.cnnOccluded) {
                z[sq] = 0.0
                state.tainted[sq] = nowS + config.motionHoldS
            }
        }
        val taintIter = state.tainted.entries.iterator()
        while (taintIter.hasNext()) {
            val entry = taintIter.next()
            val expired = nowS > entry.value
            val motionSinceRefresh = state.lastMotionTs >= entry.value - config.motionHoldS
            if (expired && (motionSinceRefresh || (z[entry.key] ?: 0.0) < config.zThr)) {
                taintIter.remove()
            } else {
                z[entry.key] = 0.0
            }
        }
        state.occludedVetoed = (state.motionOccluded + state.tainted.keys).sorted()
        state.motionOccluded = emptySet()
    }

    /**
     * Step 5 scoring — viability (both endpoints carry weak evidence) plus the
     * shadow-destination rule (242ea94): a shadow-vetoed square cannot GAIN a piece;
     * from-square shadow evidence stays usable (vacated squares darken legitimately).
     */
    private fun scoreCandidates(
        z: Map<String, Double>,
        changed: Set<String>,
        shadowVeto: Set<String>,
    ): Evidence {
        val scored = MoveScoring.loglikScores(state.game, z, config.zThr)
        val soft = config.zThr * HALF
        val viableRaw =
            scored.filter { (mv, _) ->
                MoveScoring.moveTouchedSquares(state.game, mv).all { z.getValue(it) >= soft }
            }
        val viable =
            viableRaw.filter { (mv, _) ->
                moveDestinationSquares(state.game, mv).none { it in shadowVeto }
            }
        val kept = viable.mapTo(mutableSetOf()) { it.first }
        state.shadowBlocked = viableRaw.filter { it.first !in kept }.map { uciOf(it.first) }
        val (obs, best) = viable.firstOrNull() ?: (null to NEG_INF)
        val second = if (viable.size > 1) viable[1].second else NEG_INF
        state.bestScore = if (obs != null) best else (scored.firstOrNull()?.second ?: 0.0)
        state.secondScore = second
        state.candidateUci = obs?.let { uciOf(it) }
        if (viableRaw.isNotEmpty() && (viable.isEmpty() || viable.first().first != viableRaw.first().first)) {
            // The filter changed the OUTCOME (best raw candidate was shadow-blocked).
            state.note = "${state.game.san(viableRaw.first().first)}? destination shadow-vetoed — not a move"
        }
        return Evidence(z, scored, viable, changed, TopScore(obs, best, second), shadowVeto)
    }

    private fun topScores(z: Map<String, Double>): List<Pair<String, Double>> =
        z
            .filterValues { it >= config.zThr * HALF }
            .toList()
            .sortedByDescending { it.second }
            .take(TOP_CHANGED)

    /**
     * Step 3 — cast-shadow veto: removes squares from `changed`, KEEPS their z (vacate evidence).
     * With [com.chesslab.engine.api.TrackerConfig.diffLightVeto] a structure-quiet square vetoes
     * WITHOUT the chroma shadow classification: a lighting change scales a piece's edges in place —
     * gray fires, but edge POSITIONS (census) don't move. Structure-quiet is judged by the census
     * z-score (noise-relative), NOT the absolute [TrackerConfig.censusThr] scale: light/cream pieces
     * produce weak absolute census on arrival (the census_thr=40 clip lesson), but a real move is
     * still a large census z, while lighting stays inside the census noise.
     */
    private fun applyShadowVeto(
        cur: GrayImage,
        curBgr: BgrImage,
        changed: MutableSet<String>,
        cens: Map<String, Double>? = null,
    ): Set<String> {
        val refBgr = state.refBgr
        if (refBgr == null || changed.isEmpty()) return emptySet()
        // Fusion active: reuse the (median-normalized) census channel; otherwise raw census.
        val census = cens ?: Census.perSquareChange(state.refGray!!, cur, geom, refCodes = state.refCensusCodes())
        val shadows = ShadowVeto.shadowSquares(refBgr, curBgr, geom, changed)
        // Light veto needs the live fused census channel; when it was dropped this frame
        // (global disturbance) there is no trustworthy structure signal — chroma-only then.
        val zc = if (config.diffLightVeto && cens != null) state.censusNoise.z(cens) else null
        val veto =
            changed.filterTo(mutableSetOf()) { sq ->
                (sq in shadows && census.getValue(sq) < config.censusThr) ||
                    (zc != null && config.censusZWeight * zc.getValue(sq) < config.zThr * HALF) ||
                    (config.diffLightVeto && znccLighting(sq, cur))
            }
        changed -= veto
        state.shadowVetoed = veto.sorted()
        return veto
    }

    /**
     * ZNCC shadow test (literature-standard, e.g. Sanin et al. survey): a gray-hot square whose
     * pixels still correlate ≥ [ZNCC_SHADOW_MIN] with the reference changed only by a LINEAR
     * lighting factor — a shadow/light sweep over an existing piece, not a move. NCC is the
     * continuous complement to the census bits (which flip under sensor noise / soft penumbra).
     * `squareZncc` returns null on structureless reference squares (flat empty cell), so real
     * ARRIVALS there can never be vetoed (the dark-rook-on-f8 castle lesson).
     */
    private fun znccLighting(
        sq: String,
        cur: GrayImage,
    ): Boolean {
        val n = SquareDiff.squareZncc(state.refGray!!, cur, Squares.region(sq, geom)) ?: return false
        return n >= ZNCC_SHADOW_MIN
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
                } else if (state.alarm != null) {
                    // Alarm active: the illegal position must not become base truth.
                    state.markStuck("no_legal_move")
                    state.note = "ILLEGAL MOVE? board cannot be anchored to game state"
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
            if (config.autoPatchReference && !state.motionSinceRef && safeguard() == null) {
                patcher.maybePatch(ev.changed, ev.best, frames, nowS) { sq ->
                    state.game.pieceCharAt(sq) != null
                }
            } else {
                emptyList()
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
        // Absolute evidence floor: a sole-viable candidate has an infinite margin, so a weak
        // phantom (f6h5 @ 0.44 swallowed a castle) sails through margin checks. Endpoint
        // candidates (vote=false) stay exempt — they are safeguard-verified by design.
        val best = cand.scores?.first ?: state.bestScore
        val belowFloor = cand.vote && config.commitLlFloor > 0 && best < config.commitLlFloor
        when {
            belowFloor -> {
                confirmer.reset()
                state.note =
                    "${sans.joinToString(" + ")}? evidence too weak (" +
                    String.format(java.util.Locale.ROOT, "%.2f < %.1f", best, config.commitLlFloor) +
                    ") — not committing"
            }
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
        if (state.alarm != null) {
            // Desync alarm: the game state provably mismatches the physical board — every
            // diff-vs-reference interpretation is fiction (d4b3 incident, 6368b88).
            confirmer.reset()
            state.note = "board desynced (ILLEGAL MOVE alarm) — no moves committed until take-back or resync"
            return
        }
        val guard = safeguard()
        if (guard != null) {
            val ucis = cand.moves.map { uciOf(it) }
            state.pending = PendingVerify(ucis, state.game.fen(), cur, curBgr, cand.priorUsed, state.frameSeq)
            val g = state.game.copy()
            val touched = mutableSetOf<String>()
            for (mv in cand.moves) {
                touched += MoveScoring.moveTouchedSquares(g, mv)
                g.push(mv)
            }
            val sans = state.game.sanSequence(cand.moves).joinToString(" + ")
            state.note = cand.note ?: "checking $sans via safeguard…"
            guard.requestVerify(
                MoveCandidate(ucis, state.game.fen(), cand.priorUsed, state.frameSeq),
                touched.toList(),
            )
            return
        }
        val decider = if (cand.moves.size == 1) "diff" else "diff_pair"
        state.commit(cand.moves, cur to curBgr, decider to cand.priorUsed, events)
    }

    private companion object {
        const val HALF = 0.5
        const val TOP_CHANGED = 8
        const val NEG_INF = -1e9
        const val CENSUS_SLOW_LANE = 0.125
        const val OBS_MAX_AGE_S = 3.0

        /** ZNCC at/above this = same structure up to linear lighting (0.9: literature-typical). */
        const val ZNCC_SHADOW_MIN = 0.9
    }
}
