package com.chesslab.engine

import kotlin.math.abs

/** The note a corner jump leaves behind. */
internal const val NOTE_GEOMETRY_SHIFTED =
    "Board geometry shifted (marker/camera) — re-capturing reference"

/**
 * Step 1 — the abort conditions, before any evidence is computed; `true` = go on. Two of the three
 * gates **clear the base truth**, because it is an `(image, FEN)` PAIR: a reference whose FEN no longer
 * matches, or one through a different homography, produces phantom diffs on half the board.
 */
internal fun EngineState.detectGuards(): Boolean {
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
    // Die vierte Tuer, die die Referenz fallen laesst. Ohne diese Zeile fand der uebernaechste
    // ruhige Frame den Merker vor und ueberschrieb die frisch gefasste Referenz ueber
    // `setRef(fromCommit = true)` -- ohne `markGamutStale` (Invariante 6).
    refProvisionalUntil = 0.0
}

/**
 * True when a warp corner moved by more than `cornerJumpPx` since the reference capture. The comparison
 * is **axis-wise**, not Euclidean — a 6 px shift in x alone already invalidates the reference — and a
 * truncated corner array compares only the pairs both sides have.
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

/** Also resets the recovery confirmer. */
internal fun EngineState.clearStuck() {
    stuckReason = null
    stuckCount = 0
    refusedKey = null
    refusedStreak = 0
    recoveryConfirmer.reset()
}

/** The streak counts REPEATS of the same reason. */
internal fun EngineState.markStuck(reason: String) {
    val entered = stuckReason != reason
    stuckCount = if (entered) 1 else stuckCount + 1
    stuckReason = reason
    // Only on the TRANSITION: this fires on every stable frame, and one row per event is what keeps
    // "blocked before a candidate could form" distinguishable from "nothing happened" (2026-08-01: a
    // 16.5 s gap between two commits held no row at all).
    if (entered) recordRejection("", "STUCK $reason")
}
