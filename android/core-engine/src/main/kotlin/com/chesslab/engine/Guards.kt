package com.chesslab.engine

import kotlin.math.abs

internal const val NOTE_GEOMETRY_SHIFTED =
    "Board geometry shifted (marker/camera) — re-capturing reference"

/** Two of the three gates **clear the base truth**, an `(image, FEN)` PAIR: a mismatched FEN or a different
 *  homography produces phantom diffs on half the board. */
internal fun EngineState.detectGuards(): Boolean {
    var proceed = true
    if (pending != null || promoPending != null) {
        proceed = false
    } else if (refGray == null || refFen != board.fen()) {
        clearRef()
        proceed = false
    } else if (cornersJumped()) {
        // The move is not lost: it stays on the board and is detected against the NEW reference.
        clearRef()
        confirmer.reset()
        clearStuck()
        note = NOTE_GEOMETRY_SHIFTED
        proceed = false
    }
    return proceed
}

/** One unit — never clear only half of it. */
internal fun EngineState.clearRef() {
    refGray = null
    refBgr = null
    refFen = null
    // Die vierte Tuer, die die Referenz fallen laesst: sonst ueberschrieb der uebernaechste ruhige Frame die
    // frische Referenz ueber `setRef(fromCommit = true)` ohne `markGamutStale` (Invariante 6).
    refProvisionalUntil = 0.0
}

/** **Axis-wise**, not Euclidean: a 6 px shift in x alone already invalidates the reference. */
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

internal fun EngineState.clearStuck() {
    stuckReason = null
    stuckCount = 0
    refusedKey = null
    refusedStreak = 0
    recoveryConfirmer.reset()
}

internal fun EngineState.markStuck(reason: String) {
    val entered = stuckReason != reason
    stuckCount = if (entered) 1 else stuckCount + 1
    stuckReason = reason
    // Only on the TRANSITION, one row per event: a 16.5 s gap between two commits once held no row at all.
    if (entered) recordRejection("", "STUCK $reason")
}
