package com.chesslab.engine

/** Bit i is `Squares.ALL[i]` and chesslib `Square.ordinal` (engine invariant 11). */

internal fun bit(index: Int): Long = 1L shl index

internal fun Long.has(index: Int): Boolean = (this ushr index) and 1L != 0L

internal fun Long.with(index: Int): Long = this or bit(index)

internal fun Long.without(other: Long): Long = this and other.inv()

internal inline fun Long.forEachSquare(action: (Int) -> Unit) {
    var rest = this
    while (rest != 0L) {
        action(java.lang.Long.numberOfTrailingZeros(rest))
        rest = rest and (rest - 1)
    }
}

internal fun Long.squareNames(): List<String> {
    val out = ArrayList<String>(countOneBits())
    forEachSquare { out.add(Squares.ALL[it]) }
    return out
}

/** Provenance fields want lexicographic a1,a2,… order; file-major iteration avoids sorting. */
internal inline fun Long.forEachSquareSorted(action: (Int) -> Unit) {
    for (file in 0 until Squares.N) {
        for (rank in 0 until Squares.N) {
            val i = rank * Squares.N + file
            if (has(i)) action(i)
        }
    }
}

internal fun Long.sortedSquareNames(): List<String> {
    val out = ArrayList<String>(countOneBits())
    forEachSquareSorted { out.add(Squares.ALL[it]) }
    return out
}

internal fun ofSquares(names: Collection<String>): Long {
    var mask = 0L
    for (name in names) {
        val i = Squares.index(name)
        if (i >= 0) mask = mask.with(i)
    }
    return mask
}

internal fun ofSquares(vararg names: String): Long = ofSquares(names.asList())
