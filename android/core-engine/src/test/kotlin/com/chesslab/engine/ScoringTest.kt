package com.chesslab.engine

import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.parityClose
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `loglik_scores` and `loglik_pair_scores` against the phase-00b
 * golden fixtures (`tierA.loglikScores` / `tierA.loglikPairScores`, the top 12 in Python's own
 * order over `tierA.zFused`, with `zThr` from `meta.effectiveConfig` and the `LL_K` constant).
 *
 * **Ties are not order-comparable**: chesslib and python-chess enumerate legal moves in
 * different orders and neither implementation has a tie-break. The score SEQUENCE is
 * order-independent and is compared element by element; the move identity is only asserted
 * where the fixture's score is strictly separated from its neighbour.
 */
class ScoringTest {
    @Test
    fun loglikScoresMatchPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                val game = Game(requireNotNull(frame.fen))
                val actual = loglikScores(game, tierA.zFused.toZArray(), cfg.zThr, LL_K)
                val expected = tierA.loglikTop()
                val where = "$name/${frame.frame}"
                assertSortedDescending(actual.map { it.second }, where)
                assertEquals(game.legalMoves().size, actual.size, "$where: scored move count")
                assertScoreSequence(expected, actual.map { uciOf(it.first) to it.second }, where)
                checked++
            }
        }
        assertConsumed(checked, "loglikScores frames")
    }

    @Test
    fun loglikPairScoresMatchPython() {
        var checked = 0
        var nonEmpty = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                val game = Game(requireNotNull(frame.fen))
                val actual = loglikPairScores(game, tierA.zFused.toZArray(), cfg.zThr, LL_K)
                val expected = tierA.loglikPairTop()
                val where = "$name/${frame.frame}"
                assertSortedDescending(actual.map { it.second }, where)
                assertScoreSequence(
                    expected.map { it.first.joinToString("+") to it.second },
                    actual.map { row -> row.first.joinToString("+") { uciOf(it) } to row.second },
                    "$where pairs",
                )
                if (expected.isNotEmpty()) nonEmpty++
                checked++
            }
        }
        assertConsumed(checked, "loglikPairScores frames")
        assertConsumed(nonEmpty, "frames with a non-empty pair fixture")
    }

    // ---------------------------------------------------------------------------------------

    @Test
    fun anAllZeroZMapScoresEveryMoveByItsTouchedCount() {
        val game = Game()
        val z = flat(0.0)
        val scored = loglikScores(game, z, Z_THR, K)
        assertTrue(scored.isNotEmpty(), "startpos has legal moves")
        for ((mv, score) in scored) {
            val expected = moveTouchedMask(game, mv).countOneBits() * -Z_THR
            assertClose(expected, score, "loglikScores[${uciOf(mv)}]")
        }
        assertSortedDescending(scored.map { it.second }, "all-zero z")
    }

    @Test
    fun anExtremeZClipsTheSquareContributionAtTwelve() {
        val game = Game()
        val z = flat(0.0)
        z[Squares.index("e4")] = 100.0
        val scored = loglikScores(game, z, Z_THR, K)
        val e2e4 = scored.first { uciOf(it.first) == "e2e4" }
        // +12.0 (clipped from +97) on e4, -3.0 on the untouched-but-cold e2.
        assertClose(LOGIT_CLIP - Z_THR, e2e4.second, "clipped e2e4 score")
        assertEquals("e2e4", uciOf(scored.first().first), "the clipped move still ranks first")
    }

    @Test
    fun thePairEndpointGateIsInclusiveAtSoft() {
        val soft = Z_THR * PAIR_SOFT_FACTOR
        val below = pairScoresWith(soft - GATE_EPS)
        assertTrue(below.isEmpty(), "z[e5] just below soft must drop the pair: $below")
        val exactly = pairScoresWith(soft)
        assertEquals(listOf("e2e4+e7e5"), exactly.map { row -> row.first.joinToString("+") { uciOf(it) } })
    }

    @Test
    fun aSharedSquareCountsOnceInAPairScore() {
        val game = Game(RECAPTURE_FEN)
        val z = flat(0.0)
        for (square in listOf("e4", "d5", "c7")) z[Squares.index(square)] = HOT_Z
        val scored = loglikPairScores(game, z, Z_THR, K)
        assertEquals(1, scored.size, "exactly one pair passes the endpoint gate: $scored")
        val (moves, score) = scored.first()
        assertEquals(listOf("e4d5", "c7d5"), moves.map { uciOf(it) })
        // Union {e4, d5, c7} = 3 squares; double-counting d5 would give 4 * (HOT_Z - Z_THR).
        assertClose(3 * (HOT_Z - Z_THR), score, "union pair score")
    }

    @Test
    fun aPositionWithoutLegalMovesScoresNothing() {
        val game = Game(STALEMATE_FEN)
        assertTrue(game.legalMoves().isEmpty(), "the fixture position must be stalemate")
        assertTrue(loglikScores(game, flat(HOT_Z), Z_THR, K).isEmpty())
        assertTrue(loglikPairScores(game, flat(HOT_Z), Z_THR, K).isEmpty())
    }

    // ---------------------------------------------------------------------------------------

    private fun pairScoresWith(zE5: Double): List<Pair<List<com.github.bhlangonijr.chesslib.move.Move>, Double>> {
        val z = flat(0.0)
        z[Squares.index("e2")] = HOT_Z
        z[Squares.index("e4")] = HOT_Z
        z[Squares.index("e7")] = HOT_Z
        z[Squares.index("e5")] = zE5
        return loglikPairScores(Game(), z, Z_THR, K)
    }

    private fun flat(value: Double) = DoubleArray(Squares.COUNT) { value }

    private fun assertSortedDescending(
        scores: List<Double>,
        what: String,
    ) {
        for (i in 1 until scores.size) {
            assertTrue(scores[i - 1] >= scores[i], "$what: not sorted at $i (${scores[i - 1]} < ${scores[i]})")
        }
    }

    /**
     * The fixture holds Python's top 12. The score sequence is compared element by element (it
     * is independent of how ties were ordered), every fixture key must exist in the port's
     * result with the same score, and the top key is only pinned when its score is strictly
     * separated from the runner-up.
     */
    private fun assertScoreSequence(
        expected: List<Pair<String, Double>>,
        actual: List<Pair<String, Double>>,
        what: String,
    ) {
        assertTrue(expected.size <= actual.size, "$what: fixture has more rows (${expected.size}) than the port")
        val byKey = actual.toMap()
        for ((key, score) in expected) {
            val mine = requireNotNull(byKey[key]) { "$what: the port never produced $key" }
            assertClose(score, mine, "$what: score of $key")
        }
        for (i in expected.indices) {
            assertClose(expected[i].second, actual[i].second, "$what: score rank $i")
        }
        if (expected.size > 1 && !parityClose(expected[0].second, expected[1].second)) {
            assertEquals(expected[0].first, actual[0].first, "$what: uniquely scored top entry")
        }
    }

    private fun assertConsumed(
        count: Int,
        what: String,
    ) = assertTrue(count > 0, "$what must not be empty — the fixture was never consumed")

    private companion object {
        const val Z_THR = Z_THR_DEFAULT
        const val K = LL_K
        const val HOT_Z = 10.0
        const val GATE_EPS = 0.001
        const val RECAPTURE_FEN = "4k3/2n5/8/3p4/4P3/8/8/4K3 w - - 0 1"
        const val STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"
    }
}
