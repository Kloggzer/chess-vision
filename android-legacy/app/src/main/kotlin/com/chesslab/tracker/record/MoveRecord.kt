package com.chesslab.tracker.record

import com.chesslab.engine.api.Decision
import com.chesslab.tracker.geometry.BoardCorners

/**
 * One committed move recorded in the session log. [feedback] is "good" for
 * normal commits and flips to "bad" on undo (hard-negative feedback, porting
 * tracker.py:2673).
 *
 * Consumed by phase 07.
 */
data class MoveRecord(
    val ply: Int,
    val san: String,
    val fen: String,
    val corners: BoardCorners?,
    val decision: Decision?,
    val feedback: String = FEEDBACK_GOOD,
    val ts: Long,
    val frameFile: String = "",
) {
    fun isCaptured(): Boolean = frameFile.isNotEmpty()

    companion object {
        const val FEEDBACK_GOOD = "good"
        const val FEEDBACK_BAD = "bad"
    }
}
