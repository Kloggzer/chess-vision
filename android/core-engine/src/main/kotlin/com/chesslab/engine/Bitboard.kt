package com.chesslab.engine

/**
 * Square SETS inside the engine are `Long` bitboards: bit `i` is `Squares.ALL[i]`, which is also
 * chesslib's `Square.ordinal` (engine invariant 11). Union is `or`, intersection `and`, difference
 * [without], size `countOneBits()`. Square NAMES exist only at the `api` seam.
 */

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

/** Square names in [Squares.ALL] order (a1,b1,…,h1,a2,…). */
internal fun Long.squareNames(): List<String> {
    val out = ArrayList<String>(countOneBits())
    forEachSquare { out.add(Squares.ALL[it]) }
    return out
}

/**
 * Square indices in LEXICOGRAPHIC name order (a1,a2,…,a8,b1,…) — what Python's
 * `sorted(set_of_squares)` produces, and what every provenance/status field carries. Iterating
 * file-major yields it directly, with no string sort.
 */
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

/** Unknown names are ignored, like Python's set intersection with `_ALL`. */
internal fun ofSquares(names: Collection<String>): Long {
    var mask = 0L
    for (name in names) {
        val i = Squares.index(name)
        if (i >= 0) mask = mask.with(i)
    }
    return mask
}

internal fun ofSquares(vararg names: String): Long = ofSquares(names.asList())
