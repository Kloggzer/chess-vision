package com.chesslab.engine.still

/**
 * Squares this camera and this model get wrong every time — as opposed to squares where something
 * happened.
 *
 * The proof comes free: when a reading IS fully explained (the board is unchanged, or a legal move
 * accounts for it) and a square still disagrees, that square cannot be what changed. One such
 * reading is noise; the same square over several DIFFERENT readings is a blind spot.
 *
 * Measured live on 2026-08-26: with the board correct after `d4 d5`, the model read `b1`, `f1` and
 * `e2` as empty and `e1`, `g1`, `h2` as covered — six of the eight squares on White's first rank.
 * The alarm fired on the first three, which is the difference between "your board is wrong" and
 * "I cannot see there".
 */
internal class BlindSquares {
    private val streak = HashMap<String, Int>()

    /** A reading that made sense. Whatever still disagreed is evidence AGAINST that square. */
    fun sawExplained(conflicts: List<String>) {
        val now = conflicts.toSet()
        // A square that agreed this time is not blind — the counter starts over rather than decays,
        // because one clean reading proves the square CAN be read.
        streak.keys.retainAll(now)
        for (square in now) streak[square] = (streak[square] ?: 0) + 1
    }

    /** Squares to treat as unreadable: out of the evidence, out of the alarm's conflict set. */
    fun known(): Set<String> = streak.filterValues { it >= NEEDED }.keys

    /** A new position, a new baseline, a resync — the reason to distrust a square is gone. */
    fun forget() = streak.clear()

    private companion object {
        /**
         * Two explained readings in a row. One is noise — a piece in flight, a shadow at the edge
         * of a settle window — and waiting for more costs a move at exactly the moment the board
         * is hardest to read.
         */
        const val NEEDED = 2
    }
}
