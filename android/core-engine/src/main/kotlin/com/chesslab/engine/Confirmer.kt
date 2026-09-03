package com.chesslab.engine

/**
 * The `confirm_frames` streak voter: the same key fed [confirmFrames] times in a row confirms, a
 * DIFFERENT key restarts the streak at 1 (not 0), and `feed(null)` clears the candidate so [count]
 * drops to 0. The key is opaque — the confirmer knows nothing about moves.
 */
internal class Confirmer(
    private val confirmFrames: Int,
) {
    private var candidate: String? = null
    private var streak: Int = 0

    /** True = confirmed (commit!). `null` clears the current candidate; the streak restarts. */
    fun feed(key: String?): Boolean {
        if (key == null) {
            candidate = null
            streak = 0
            return false
        }
        streak = if (candidate == key) streak + 1 else 1
        candidate = key
        return streak >= confirmFrames
    }

    fun reset() {
        candidate = null
        streak = 0
    }

    /** The current candidate key, or `null` when there is none. */
    val key: String? get() = candidate

    /** The current counter; 0 when there is no candidate. */
    val count: Int get() = if (candidate == null) 0 else streak
}
