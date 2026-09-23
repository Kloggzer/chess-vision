package com.chesslab.engine

/** Names cross only the `api` seam. */
internal object Squares {
    const val FILES = "abcdefgh"

    const val N = 8

    const val COUNT = 64

    val ALL: List<String> =
        buildList(COUNT) {
            for (rank in 1..N) {
                for (file in FILES) {
                    add("$file$rank")
                }
            }
        }

    private val INDEX: Map<String, Int> = ALL.withIndex().associate { (i, s) -> s to i }

    fun index(square: String): Int = INDEX[square] ?: -1

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

    /** Rotated 180° when [whitePov] is false. */
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
