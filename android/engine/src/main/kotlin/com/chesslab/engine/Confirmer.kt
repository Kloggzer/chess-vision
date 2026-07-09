package com.chesslab.engine

/**
 * Multi-frame candidate voting (ports tracker.py:518 `Confirmer`): the same key fed
 * `confirmFrames` times in a row confirms; a different key restarts the count.
 */
class Confirmer(private val confirmFrames: Int) {
    private var cand: Pair<String, Int>? = null

    /** True = confirmed (commit!). `feed(null)` clears the candidate and returns false. */
    fun feed(key: String?): Boolean {
        val k = key ?: run {
            cand = null
            return false
        }
        val cnt = cand?.let { (u, c) -> if (u == k) c + 1 else 1 } ?: 1
        cand = k to cnt
        return cnt >= confirmFrames
    }

    fun reset() {
        cand = null
    }

    /** Current counter (0 when no candidate). */
    val count: Int get() = cand?.second ?: 0
}
