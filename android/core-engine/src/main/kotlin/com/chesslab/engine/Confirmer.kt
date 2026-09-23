package com.chesslab.engine

/** A DIFFERENT key restarts the streak at 1 (not 0); `feed(null)` clears the candidate. The key is opaque. */
internal class Confirmer(
    private val confirmFrames: Int,
) {
    private var candidate: String? = null
    private var streak: Int = 0

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

    val key: String? get() = candidate

    val count: Int get() = if (candidate == null) 0 else streak
}
