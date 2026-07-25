package com.chesslab.engine

import kotlin.math.abs

/** The note a corner jump leaves behind. */
internal const val NOTE_GEOMETRY_SHIFTED =
    "Board geometry shifted (marker/camera) — re-capturing reference"

/**
 * Step 1 of `_try_detect` — the abort conditions, before any evidence is computed.
 * Python `_detect_guards`. `true` = go on and compute evidence.
 *
 * Each of the three gates returns `false`, and two of them **clear the base truth**. That is the
 * point: base truth is an `(image, FEN)` PAIR. A reference image whose FEN no longer matches the
 * board, or one taken through a different homography, produces phantom diffs on half the board —
 * dropping it forces a clean re-capture on the next quiet frame instead of chasing ghosts.
 */
internal fun EngineState.detectGuards(): Boolean {
    // Single exit: detekt's ReturnCount caps a function at two `return`s (STATUS D03a-7).
    var proceed = true
    if (pending != null || promoPending != null) {
        // Pending verification / promotion running: do not generate a new candidate.
        proceed = false
    } else if (refGray == null || refFen != board.fen()) {
        // Invariant: base truth is (image, FEN).
        clearRef()
        proceed = false
    } else if (cornersJumped()) {
        // Geometry invalidation. The move evidence is not lost — the move stays on
        // the board and is detected against the NEW reference on the next move.
        clearRef()
        confirmer.reset()
        clearStuck()
        note = NOTE_GEOMETRY_SHIFTED
        proceed = false
    }
    return proceed
}

/** Drops the `(image, FEN)` pair as one unit — never clear only half of it. */
internal fun EngineState.clearRef() {
    refGray = null
    refBgr = null
    refFen = null
}

/**
 * Python `_corners_jumped`: true when a warp corner moved by more than
 * `cornerJumpPx` (6.0) since the reference capture.
 *
 * The comparison is **axis-wise**, not Euclidean — a 6 px shift in x alone already invalidates the
 * reference. Python's `zip(..., strict=False)` stops at the shorter list, so a truncated corner
 * array compares only the pairs both sides have.
 */
internal fun EngineState.cornersJumped(): Boolean {
    val ref = refCorners
    val cur = lastCorners
    var jumped = false
    if (ref != null && cur != null) {
        val thr = config.cornerJumpPx
        val pairs = minOf(ref.size, cur.size) / 2
        var i = 0
        while (i < pairs && !jumped) {
            val dx = abs(cur[2 * i].toDouble() - ref[2 * i].toDouble())
            val dy = abs(cur[2 * i + 1].toDouble() - ref[2 * i + 1].toDouble())
            jumped = dx > thr || dy > thr
            i++
        }
    }
    return jumped
}

/** Python `_clear_stuck` — also resets the recovery confirmer. */
internal fun EngineState.clearStuck() {
    stuckReason = null
    stuckCount = 0
    recoveryConfirmer.reset()
}

/** Python `_mark_stuck` — the streak counts REPEATS of the same reason. */
internal fun EngineState.markStuck(reason: String) {
    stuckCount = if (stuckReason == reason) stuckCount + 1 else 1
    stuckReason = reason
}
