package com.chesslab.engine

/**
 * The single canonical square order and square/pixel index mapping of the engine.
 *
 * Python reference: `_FILES`/`_ALL` and `calibration.py::_square_to_col_row`.
 *
 * Engine internals pass per-square scalars as `DoubleArray(64)` indexed by [ALL] and per-square
 * SETS as `Long` bitboards (`Bitboard.kt`); square NAMES are produced once, at the `api` seam.
 */
internal object Squares {
    const val FILES = "abcdefgh"

    /** Board edge length in squares. */
    const val N = 8

    /** Number of squares on the board. */
    const val COUNT = 64

    /** 64 names, rank-major from rank 1: a1,b1,…,h1,a2,…,h8. Python `_ALL`. */
    val ALL: List<String> =
        buildList(COUNT) {
            for (rank in 1..N) {
                for (file in FILES) {
                    add("$file$rank")
                }
            }
        }

    private val INDEX: Map<String, Int> = ALL.withIndex().associate { (i, s) -> s to i }

    /** Position of [square] in [ALL], or -1 if it is not a known square name. */
    fun index(square: String): Int = INDEX[square] ?: -1

    /**
     * Packed `(col shl 3) or row` — calibration.py `_square_to_col_row`. No Pair, no boxing.
     *
     * Throws [IllegalArgumentException] on a malformed square or a rank outside 1..8, matching
     * Python's `ValueError`.
     */
    fun colRow(
        square: String,
        whitePov: Boolean,
    ): Int {
        val sq = square.trim().lowercase()
        require(sq.length == 2 && sq[0] in FILES && sq[1] in '0'..'9') { "invalid square: '$square'" }
        val rank = sq[1] - '0'
        require(rank in 1..N) { "invalid rank: '$square'" }
        return colRow(index("${sq[0]}$rank"), whitePov)
    }

    /** `col = file`, `row = 8 - rank`; rotated 180° when [whitePov] is false. */
    fun colRow(
        index: Int,
        whitePov: Boolean,
    ): Int {
        var col = index % N
        var row = N - 1 - index / N
        if (!whitePov) {
            col = N - 1 - col
            row = N - 1 - row
        }
        return (col shl COL_SHIFT) or row
    }

    fun colOf(packed: Int): Int = packed shr COL_SHIFT

    fun rowOf(packed: Int): Int = packed and ROW_MASK

    private const val COL_SHIFT = 3
    private const val ROW_MASK = 7
}
