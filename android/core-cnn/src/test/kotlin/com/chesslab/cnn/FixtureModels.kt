package com.chesslab.cnn

import com.github.bhlangonijr.chesslib.Board
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import kotlin.math.abs
import kotlin.math.max

/** The tolerance contract of `parity/README.md`: 1e-4 relative with a 1e-4 absolute floor. */
internal const val PARITY_REL_TOL = 1e-4

internal fun FixtureRow.classes(): List<String> = strings("classes")

internal fun FixtureRow.board(): Board = boardOf(str("fen"))

internal fun FixtureRow.observation(): OccupancyObservation {
    val probs = (this["probs"] as Map<*, *>).entries.associate { (k, v) -> k as String to doubles(v) }
    return observationFromProbs(probs, classes())
}

internal fun doubles(value: Any?): DoubleArray {
    val list = value as List<*>
    return DoubleArray(list.size) { (list[it] as Number).toDouble() }
}

internal fun recoveryFor(
    row: FixtureRow,
    plyCost: Int = 0,
): CnnRecovery = CnnRecovery(CnnConfig(confThr = row.num("confThr"), plyCostSquares = plyCost))

internal fun assertClose(
    expected: Double,
    actual: Double,
    what: String,
) {
    val tolerance = PARITY_REL_TOL * max(1.0, abs(expected))
    assertTrue(abs(expected - actual) <= tolerance, "$what: expected $expected, got $actual")
}

/** Two orders of the same plies are ONE `deriveMovesDeep` hypothesis, tie-broken by move-enumeration
 *  order, which differs between chesslib and python-chess: differing sequences must match in length
 *  AND resulting placement. */
internal fun assertSequenceEquivalent(
    expected: List<String>,
    actual: List<String>,
    board: Board,
    what: String,
) {
    if (expected == actual) return
    assertEquals(expected.size, actual.size, "$what: sequence length")
    assertEquals(placementAfter(board, expected), placementAfter(board, actual), "$what: resulting placement")
}

private fun placementAfter(
    board: Board,
    ucis: List<String>,
): String {
    val replay = board.clone()
    for (uci in ucis) replay.doMove(parseMove(replay, uci))
    return replay.getFen(false).substringBefore(' ')
}

internal fun assertCloseMap(
    expected: Map<String, Double>,
    actual: Map<String, Double>,
    what: String,
) {
    assertEquals(expected.keys, actual.keys, "$what: key set")
    for ((key, value) in expected) assertClose(value, actual.getValue(key), "$what[$key]")
}
