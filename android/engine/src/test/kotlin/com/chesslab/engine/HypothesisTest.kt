package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class HypothesisTest {
    private val config = TrackerConfig()

    private fun gen(safeguard: Boolean = false) = HypothesisGenerator(config) { safeguard }

    private fun zMap(vararg hot: Pair<String, Double>): Map<String, Double> {
        val z = Squares.all.associateWith { 0.0 }.toMutableMap()
        for ((sq, v) in hot) z[sq] = v
        return z
    }

    private fun evidence(game: Game, z: Map<String, Double>): Evidence {
        val scored = MoveScoring.loglikScores(game, z, config.zThr)
        val soft = config.zThr / 2
        val viable = scored.filter { (mv, _) ->
            MoveScoring.moveTouchedSquares(game, mv).all { (z[it] ?: 0.0) >= soft }
        }
        val changed = z.filterValues { it >= config.zThr }.keys
        val (obs, best) = viable.firstOrNull() ?: (null to -1e9)
        val second = if (viable.size > 1) viable[1].second else -1e9
        return Evidence(z, scored, viable, changed, obs, best, second)
    }

    @Test
    fun `clean single move becomes a voting candidate`() {
        val game = Game()
        val out = gen().generate(game, evidence(game, zMap("e2" to 8.0, "e4" to 7.0)), 0)
        val cand = out as HypothesisOutcome.Candidate
        assertEquals(listOf("e2e4"), cand.moves.map { uciOf(it) })
        assertTrue(cand.vote)
        assertEquals(false, cand.priorUsed)
    }

    @Test
    fun `hand squares always count toward maxChanged (invariant)`() {
        val game = Game()
        // Only 2 changed squares, but 5 occluded/blocked squares push past maxChanged=6.
        val out = gen().generate(game, evidence(game, zMap("e2" to 8.0, "e4" to 7.0)), 5)
        val stuck = out as HypothesisOutcome.Stuck
        assertEquals("too_many_changed", stuck.reason)
    }

    @Test
    fun `no legal move marks stuck`() {
        val game = Game()
        val out = gen().generate(game, evidence(game, zMap("a4" to 9.0, "h5" to 9.0)), 0)
        assertEquals("no_legal_move", (out as HypothesisOutcome.Stuck).reason)
    }

    @Test
    fun `with safeguard the pair beats the single move that would swallow the reply`() {
        val game = Game()
        val z = zMap("e2" to 8.0, "e4" to 7.0, "e7" to 7.5, "e5" to 6.5)
        val out = gen(safeguard = true).generate(game, evidence(game, z), 0)
        val cand = out as HypothesisOutcome.Candidate
        assertEquals(listOf("e2e4", "e7e5"), cand.moves.map { uciOf(it) })
        // Without a safeguard the conservative order keeps the (viable, positive) single move.
        val single = gen().generate(game, evidence(game, z), 0) as HypothesisOutcome.Candidate
        assertEquals(listOf("e2e4"), single.moves.map { uciOf(it) })
    }

    @Test
    fun `promotion ambiguity without safeguard asks the user`() {
        val game = Game("8/4P3/8/8/8/2k5/8/K7 w - - 0 1")
        val out = gen().generate(game, evidence(game, zMap("e7" to 8.0, "e8" to 7.0)), 0)
        val promo = out as HypothesisOutcome.Promotion
        assertEquals("e7", promo.fromSquare)
        assertEquals("e8", promo.toSquare)
    }

    @Test
    fun `prior breaks a genuine near-tie toward the capture`() {
        // Two knights can reach e5; one captures a pawn there. Evidence on both origins is equal.
        val game = Game("4k3/8/8/4p3/8/3N1N2/8/4K3 w - - 0 1")
        val z = zMap("d3" to 6.0, "f3" to 6.0, "e5" to 8.0)
        val out = gen().generate(game, evidence(game, z), 0)
        val ambiguous = out is HypothesisOutcome.Ambiguous
        // d3e5 and f3e5 tie in image evidence; both capture -> prior cannot separate them.
        assertTrue(ambiguous)
    }

    @Test
    fun `anomaly patcher pulls persistent occupied squares forward after nudge timeout`() {
        val patcher = AnomalyPatcher(config)
        val ref = TestImages.grayA()
        val cur = TestImages.grayB()
        val frames = AnomalyPatcher.Frames(ref, null, cur, null)
        val changed = setOf("e4")
        assertEquals(emptyList<String>(), patcher.maybePatch(changed, -5.0, frames, 0.0) { true })
        // After nudge_timeout_s the occupied square is patched; ref pixels now equal cur.
        val patched = patcher.maybePatch(changed, -5.0, frames, config.nudgeTimeoutS + 0.1) { true }
        assertEquals(listOf("e4"), patched)
        val geom = BoardGeometry(TestImages.BS, whitePov = true, extendUp = config.overhang)
        assertEquals(0.0, SquareDiff.perSquareDiff(ref, cur, geom).getValue("e4"), 1e-9)
    }

    @Test
    fun `anomaly patcher never patches empty squares before the drift window`() {
        val patcher = AnomalyPatcher(config)
        val frames = AnomalyPatcher.Frames(TestImages.grayA(), null, TestImages.grayB(), null)
        val t = config.nudgeTimeoutS + 1.0 // past nudge, before drift
        patcher.maybePatch(setOf("e4"), -5.0, frames, 0.0) { false }
        assertEquals(emptyList<String>(), patcher.maybePatch(setOf("e4"), -5.0, frames, t) { false })
        assertEquals(
            listOf("e4"),
            patcher.maybePatch(setOf("e4"), -5.0, frames, config.driftWindowS + 0.1) { false },
        )
    }
}
