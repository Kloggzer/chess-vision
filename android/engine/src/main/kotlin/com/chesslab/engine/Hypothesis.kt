package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.github.bhlangonijr.chesslib.move.Move

/** Best/second-best viable hypothesis of one frame. */
internal data class TopScore(
    val obsMove: Move?,
    val best: Double,
    val second: Double,
)

/** Score evidence of one stable frame, shared between hypothesis generation and dispatch. */
internal class Evidence(
    val z: Map<String, Double>,
    val scored: List<Pair<Move, Double>>,
    val viable: List<Pair<Move, Double>>,
    val changed: Set<String>,
    val top: TopScore,
    val shadowVeto: Set<String> = emptySet(),
) {
    val obsMove: Move? get() = top.obsMove
    val best: Double get() = top.best
    val second: Double get() = top.second
}

/** Result of turning evidence into exactly one candidate — or a handled non-candidate frame. */
internal sealed interface HypothesisOutcome {
    /** A candidate move (or pair); `vote=false` skips confirmer voting (endpoint candidate). */
    data class Candidate(
        val moves: List<Move>,
        val priorUsed: Boolean,
        val vote: Boolean,
        val note: String? = null,
        val scores: Pair<Double, Double>? = null,
    ) : HypothesisOutcome

    /** No candidate; reason is "too_many_changed" or "no_legal_move" (recovery triggers). */
    data class Stuck(
        val reason: String,
        val note: String,
    ) : HypothesisOutcome

    /** Genuine ambiguity the prior could not break. */
    data class Ambiguous(
        val note: String,
    ) : HypothesisOutcome

    /** Promotion detected without a safeguard: the user must choose the piece. */
    data class Promotion(
        val fromSquare: String,
        val toSquare: String,
    ) : HypothesisOutcome
}

/**
 * Step 6 of the pipeline: exactly ONE place that turns evidence into a candidate or a
 * stuck/ambiguous state (ports tracker.py:2149-2301 `_generate_hypothesis`,
 * `_pair_candidate`, `_single_endpoint_candidate`).
 */
internal class HypothesisGenerator(
    private var config: TrackerConfig,
    private val safeguardActive: () -> Boolean,
) {
    private val slack = 2

    fun updateConfig(newConfig: TrackerConfig) {
        config = newConfig
    }

    fun generate(
        game: Game,
        ev: Evidence,
        blockedN: Int,
    ): HypothesisOutcome {
        val tooMany = ev.changed.size + blockedN > config.maxChanged
        return when {
            tooMany -> tooManyChanged(game, ev, blockedN)
            else -> normalHypothesis(game, ev)
        }
    }

    private fun tooManyChanged(
        game: Game,
        ev: Evidence,
        blockedN: Int,
    ): HypothesisOutcome {
        if (config.pairLookAhead && blockedN == 0 && ev.changed.size <= config.maxChanged + slack) {
            pairCandidate(game, ev.z, ev.best, ev.shadowVeto)?.let { return it }
        }
        return HypothesisOutcome.Stuck(
            "too_many_changed",
            "Much change (${ev.changed.size} squares + $blockedN occluded) — " +
                "occluded/unstable, no move committed (base truth unchanged)",
        )
    }

    private fun normalHypothesis(
        game: Game,
        ev: Evidence,
    ): HypothesisOutcome {
        // Pair check BEFORE the single commit only with a safeguard: it goes pending and must
        // match the post-pair position. Without one, a garbage pair covering residue squares
        // outscores the true single — keep the conservative order there.
        val earlyPair =
            if (config.pairLookAhead && safeguardActive()) pairCandidate(game, ev.z, ev.best, ev.shadowVeto) else null
        val obs = ev.top.obsMove
        return when {
            earlyPair != null -> earlyPair
            obs == null || ev.best < 0.0 -> noSingleMove(game, ev)
            ev.best - ev.second < config.ambiguityMarginLl -> resolveAmbiguity(game, ev)
            else -> HypothesisOutcome.Candidate(listOf(obs), priorUsed = false, vote = true)
        }
    }

    private fun noSingleMove(
        game: Game,
        ev: Evidence,
    ): HypothesisOutcome {
        val pair =
            if (config.pairLookAhead && !safeguardActive()) pairCandidate(game, ev.z, ev.best, ev.shadowVeto) else null
        val endpoint = if (safeguardActive()) singleEndpointCandidate(ev.z, ev.scored, ev.shadowVeto) else null
        return when {
            pair != null -> pair
            endpoint != null ->
                HypothesisOutcome.Candidate(
                    listOf(endpoint),
                    priorUsed = false,
                    vote = false,
                    note = "low-contrast move ${game.san(endpoint)}? verifying via safeguard…",
                )
            else ->
                HypothesisOutcome.Stuck(
                    "no_legal_move",
                    "Change on ${ev.changed.size} squares, but no legal move fits — " +
                        "possible wrong move, base truth unchanged (resync needed?)",
                )
        }
    }

    private fun resolveAmbiguity(
        game: Game,
        ev: Evidence,
    ): HypothesisOutcome {
        val near = ev.viable.filter { (_, s) -> ev.best - s < config.ambiguityMarginLl }
        val allPromoSameCell =
            near.isNotEmpty() &&
                near.all { MoveScoring.isPromotion(it.first) } &&
                near.map { it.first.from to it.first.to }.toSet().size == 1
        return when {
            allPromoSameCell ->
                HypothesisOutcome.Promotion(
                    near
                        .first()
                        .first.from
                        .value()
                        .lowercase(),
                    near
                        .first()
                        .first.to
                        .value()
                        .lowercase(),
                )
            config.usePrior -> priorTieBreak(game, near)
            else -> HypothesisOutcome.Ambiguous("ambiguous change — please move cleanly / wait briefly")
        }
    }

    private fun priorTieBreak(
        game: Game,
        near: List<Pair<Move, Double>>,
    ): HypothesisOutcome {
        val rescored =
            near
                .map { (mv, s) -> mv to s + MoveScoring.movePrior(game, mv) }
                .sortedByDescending { it.second }
        return if (rescored.size > 1 && rescored[0].second - rescored[1].second >= config.ambiguityMarginLl) {
            HypothesisOutcome.Candidate(listOf(rescored[0].first), priorUsed = true, vote = true)
        } else {
            val shown =
                near.take(NEAR_SHOWN).joinToString(" / ") { (mv, s) ->
                    "${game.san(mv)} (${String.format(java.util.Locale.ROOT, "%+.1f", s)})"
                }
            HypothesisOutcome.Ambiguous("ambiguous: $shown — please move cleanly / wait briefly")
        }
    }

    /**
     * Fast play: 2 half-moves in one settle window. Candidate only when the best pair clearly
     * beats the best single AND the second-best pair (ports tracker.py:2239 `_pair_candidate`).
     */
    fun pairCandidate(
        game: Game,
        z: Map<String, Double>,
        bestSingle: Double,
        shadowVeto: Set<String> = emptySet(),
    ): HypothesisOutcome.Candidate? {
        // Shadow-destination rule: no pair whose destination squares (move 2 evaluated on
        // the board AFTER move 1) are shadow-vetoed (ports tracker.py 242ea94).
        val pairs =
            MoveScoring.loglikPairScores(game, z, config.zThr).filter { (seq, _) ->
                shadowVeto.isEmpty() ||
                    run {
                        val g1 = game.copy()
                        val dests = moveDestinationSquares(game, seq[0]).toMutableSet()
                        g1.push(seq[0])
                        dests += moveDestinationSquares(g1, seq[1])
                        dests.none { it in shadowVeto }
                    }
            }
        if (pairs.isEmpty()) return null
        val (seq, best) = pairs.first()
        val second = if (pairs.size > 1) pairs[1].second else NEG_INF
        val margin = best - maxOf(second, bestSingle)
        return if (best < 0.0 || margin < config.ambiguityMarginLl) {
            null
        } else {
            HypothesisOutcome.Candidate(
                seq,
                priorUsed = false,
                vote = true,
                scores = best to maxOf(second, bestSingle),
            )
        }
    }

    /**
     * Best legal move strongly evidenced at its DESTINATION only (origin below the viability
     * gate — low-contrast vacated square); safeguard-verified candidates only
     * (ports tracker.py:2283 `_single_endpoint_candidate`).
     */
    fun singleEndpointCandidate(
        z: Map<String, Double>,
        scored: List<Pair<Move, Double>>,
        shadowVeto: Set<String> = emptySet(),
    ): Move? {
        val strong = Squares.all.filter { (z[it] ?: 0.0) >= config.zThr }
        if (strong.size != 1) return null
        val cands =
            scored.filter { (mv, sc) ->
                val to = mv.to.value().lowercase()
                to == strong.single() && sc > 0.0 && to !in shadowVeto
            }
        val bestMv = cands.firstOrNull()
        val ambiguous =
            bestMv != null &&
                cands.drop(1).any { (mv, sc) ->
                    mv.to != bestMv.first.to && bestMv.second - sc < config.ambiguityMarginLl
                }
        return if (bestMv == null || ambiguous) null else bestMv.first
    }

    private companion object {
        const val NEG_INF = -1e9
        const val NEAR_SHOWN = 3
    }
}

/**
 * Nudge/drift self-healing of the reference without a safeguard (ports tracker.py:2303
 * `_maybe_patch_anomaly`): squares persistently "changed" although no viable move explains
 * them are individually pulled forward in the reference (cell patch).
 */
internal class AnomalyPatcher(
    private var config: TrackerConfig,
) {
    private val since = mutableMapOf<String, Double>()
    private val slack = 2

    class Frames(
        val refGray: GrayImage,
        val refBgr: BgrImage?,
        val curGray: GrayImage,
        val curBgr: BgrImage?,
    )

    fun reset() = since.clear()

    fun updateConfig(newConfig: TrackerConfig) {
        config = newConfig
        reset()
    }

    /** Returns the patched squares (mutates the reference images in place). */
    fun maybePatch(
        changed: Set<String>,
        bestLl: Double,
        frames: Frames,
        nowS: Double,
        isOccupied: (String) -> Boolean,
    ): List<String> {
        // Maintain timers: start new squares, drop disappeared ones.
        val kept = changed.associateWith { since[it] ?: nowS }
        since.clear()
        since.putAll(kept)
        if (changed.isEmpty() || bestLl >= 0.0 || changed.size > config.maxChanged + slack) return emptyList()
        val patched = mutableListOf<String>()
        val geom = BoardGeometry(frames.curGray.width, whitePov = true, extendUp = config.overhang)
        for (sq in changed.sorted()) {
            val needed = if (isOccupied(sq)) config.nudgeTimeoutS else config.driftWindowS
            if (nowS - since.getValue(sq) < needed) continue
            patchCell(sq, frames, geom)
            patched.add(sq)
            since.remove(sq)
        }
        return patched
    }

    /** Patch the SAME pixels the diff looks at (inset 0, incl. overhang). */
    private fun patchCell(
        sq: String,
        frames: Frames,
        geom: BoardGeometry,
    ) {
        val box = Squares.region(sq, geom, inset = 0.0)
        val w = frames.curGray.width
        for (y in box.y0 until box.y1) {
            for (x in box.x0 until box.x1) copyPixel(frames, y * w + x)
        }
    }

    private fun copyPixel(
        frames: Frames,
        idx: Int,
    ) {
        frames.refGray.data[idx] = frames.curGray.data[idx]
        if (frames.refBgr != null && frames.curBgr != null) {
            val i = idx * CHANNELS
            for (c in 0 until CHANNELS) frames.refBgr.data[i + c] = frames.curBgr.data[i + c]
        }
    }
}
