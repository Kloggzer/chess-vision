package com.chesslab.engine

import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import kotlin.system.measureNanoTime

class SequenceScoringTest {
    @Test
    fun sequenceScoresPreserveExhaustiveResultsAndTheCallersPosition() {
        for (fen in POSITIONS) {
            val game = Game(fen)
            val originalFen = game.fen()
            val originalMoves = game.legalMoves()
            val z = DoubleArray(Squares.COUNT) { 2.0 + it % 11 }
            for (depth in 2..3) {
                val expected = referenceScores(game, z, depth).associate { key(it.first) to it.second }
                val actual = loglikSequenceScores(game, z, maxPlies = depth).associate { key(it.first) to it.second }
                assertEquals(expected.keys, actual.keys, "$fen depth=$depth: candidate coverage")
                for ((moves, score) in expected) assertEquals(score, actual.getValue(moves), 1e-10, moves)
                assertEquals(originalFen, game.fen(), "search must restore the position")
                assertSame(originalMoves, game.legalMoves(), "search must restore the legal-move cache")
            }
        }
    }

    @Test
    @EnabledIfSystemProperty(named = "chesslab.profile", matches = "true")
    fun profileSequenceSearchAgainstThePreviousAlgorithm() {
        val game = Game()
        val z = DoubleArray(Squares.COUNT) { 10.0 }
        repeat(100) {
            referenceScores(game, z, 2)
            loglikSequenceScores(game, z)
        }
        repeat(5) { round ->
            val old = measureNanoTime { repeat(200) { referenceScores(game, z, 2) } }
            val new = measureNanoTime { repeat(200) { loglikSequenceScores(game, z) } }
            println("sequence round=$round previousNs=$old optimizedNs=$new ratio=${old.toDouble() / new}")
        }
    }

    /** Allocation-heavy reference: enumerate, union touched sets, push even leaf positions. */
    private fun referenceScores(
        game: Game,
        z: DoubleArray,
        depth: Int,
    ): List<Pair<List<Move>, Double>> {
        val scores = ArrayList<Pair<List<Move>, Double>>()
        val values = logits(z, Z_THR_DEFAULT, LL_K)
        val buffer = IntArray(TOUCHED_MAX)
        var nodes = 0

        fun walk(
            path: MutableList<Move>,
            claimed: Set<Int>,
        ) {
            if (path.size >= depth || nodes > 4000) return
            val same = if (path.size >= PAIR_PLIES) path.last().to else null
            val legal =
                game.legalMoves().filter {
                    z[it.from.ordinal] >= 1.5 && z[it.to.ordinal] >= 1.5 && (same == null || it.to == same)
                }
            for (move in legal) {
                nodes++
                val count = moveTouchedIndices(game, move, buffer)
                val union = claimed + (0 until count).map { buffer[it] }
                path.add(move)
                if (path.size >= PAIR_PLIES) scores.add(path.toList() to union.sumOf { values[it] })
                game.push(move)
                walk(path, union)
                game.pop()
                path.removeAt(path.lastIndex)
            }
        }
        walk(ArrayList(), emptySet())
        sortByValueDescending(scores)
        return scores
    }

    private fun key(moves: List<Move>) = moves.joinToString("+") { uciOf(it) }

    private companion object {
        val POSITIONS =
            listOf(
                STARTPOS,
                "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
                "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
                "4k3/2n5/8/3p4/4PP2/8/8/4K3 w - - 0 1",
                "4k3/P7/8/8/8/8/7p/4K3 w - - 0 1",
            )
    }
}
