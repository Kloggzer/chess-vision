package com.chesslab.tracker.record

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side

/** `config.DEFAULT_INVENTORY` — what one physical set actually contains, per colour. */
val DEFAULT_INVENTORY: Map<Char, Int> = mapOf('P' to 8, 'N' to 2, 'B' to 2, 'R' to 2, 'Q' to 1, 'K' to 1)

/**
 * Port of `state.py::physical_inventory_violations`.
 *
 * Legal chess can create a second queen by promotion, but the real board has one — the player uses
 * an upside-down rook or a chip. Auto-labeling that square as a queen poisons the dataset, so a
 * position that needs more pieces than exist is not recorded at all.
 */
fun physicalInventoryViolations(
    fen: String,
    inventory: Map<Char, Int> = DEFAULT_INVENTORY,
): List<String> {
    val board = Board().apply { loadFromFen(fen) }
    val counts = mutableMapOf<String, Int>()
    inventory.keys.forEach { type ->
        counts["w$type"] = 0
        counts["b$type"] = 0
    }
    board.boardToArray().forEach { piece ->
        if (piece == null || piece == Piece.NONE) return@forEach
        // `fenSymbol` and not `pieceType.name`: KNIGHT and KING share their first letter.
        val colour = if (piece.pieceSide == Side.WHITE) "w" else "b"
        val label = "$colour${piece.fenSymbol.uppercase()}"
        counts[label] = (counts[label] ?: 0) + 1
    }
    return counts.toSortedMap().mapNotNull { (label, count) ->
        val limit = inventory[label[1]] ?: 0
        if (count > limit) "$label $count/$limit" else null
    }
}

/**
 * The two gates that make a recorded session trustworthy. Both increment [skipped] and leave a
 * visible [reason]; neither ever stops the recorder.
 */
class RecordingGates(
    var inventoryFilter: Boolean = true,
) {
    var skipped: Int = 0
        private set

    var reason: String? = null
        private set

    /**
     * `_skip_recording_for_geometry` — true while the calibration profile does not match the live
     * frame size. Capture is **suspended, not stopped**: the recorder and everything already
     * written stay intact and capture resumes by itself once the size is resolved.
     *
     * This is not optional. Recording keeps the RAW frame plus the profile's board corners, and
     * `chesslab slice` later cuts crops from exactly that pair. With an unresolved size mismatch
     * the corners belong to another resolution, so every crop would be labeled correctly and cut
     * from the wrong pixels — poisoned training data that is indistinguishable from good data
     * afterwards.
     */
    fun geometrySuspends(note: String?): Boolean {
        if (note == null) return false
        skipped++
        // Name the remedy, not just the fault. This string is the ONLY diagnostic the user gets,
        // and "board geometry unresolved (profile 1920x1080, camera delivers 2560x1440)" left a
        // phone recording nothing for seven hours across nine games because nothing said that
        // recalibrating is what clears it.
        reason = "Recording paused — $note. Recalibrate to resume; moves are still tracked."
        return true
    }

    /** `_skip_recording_for_inventory`, controlled by [inventoryFilter] (`record_inventory_filter`). */
    fun inventorySkips(fen: String): Boolean {
        if (!inventoryFilter) return false
        val violations = physicalInventoryViolations(fen)
        if (violations.isEmpty()) return false
        skipped++
        reason = "Frame not recorded — more pieces on the board than a real set has " +
            "(${violations.joinToString(", ")}). The position is wrong, not the camera."
        return true
    }

    /**
     * Both gates, in Python's order. Re-run at flush time, not only when a capture is queued.
     *
     * [reason] is cleared first: it used to survive the condition that set it, so one transient
     * geometry blip left "board geometry unresolved" standing on the only diagnostic the user
     * sees, forever, while recording was in fact running again.
     */
    fun blocks(
        fen: String,
        geometryNote: String?,
    ): Boolean {
        reason = null
        return geometrySuspends(geometryNote) || inventorySkips(fen)
    }
}

/**
 * The geometry note itself: the profile's calibration size against the size the camera really
 * delivers. Same comparison `pipeline.FrameSizeGuard` makes for the tracker; recording needs it as
 * a value, and the guard's result only reaches the UI as prose.
 */
fun geometryNote(
    profileWidth: Int,
    profileHeight: Int,
    frameWidth: Int,
    frameHeight: Int,
): String? =
    if (profileWidth == frameWidth && profileHeight == frameHeight) {
        null
    } else {
        "the calibration is for ${profileWidth}x$profileHeight but the camera delivers " +
            "${frameWidth}x$frameHeight, so the stored corners point at the wrong pixels"
    }
