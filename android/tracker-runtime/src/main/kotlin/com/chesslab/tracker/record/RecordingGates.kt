package com.chesslab.tracker.record

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.Side

/** Per colour. */
val DEFAULT_INVENTORY: Map<Char, Int> = mapOf('P' to 8, 'N' to 2, 'B' to 2, 'R' to 2, 'Q' to 1, 'K' to 1)

/** A second queen is an upside-down rook on the real board: labeling it a queen poisons the dataset. */
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
        // `fenSymbol`, not `pieceType.name`: KNIGHT and KING share their first letter.
        val colour = if (piece.pieceSide == Side.WHITE) "w" else "b"
        val label = "$colour${piece.fenSymbol.uppercase()}"
        counts[label] = (counts[label] ?: 0) + 1
    }
    return counts.toSortedMap().mapNotNull { (label, count) ->
        val limit = inventory[label[1]] ?: 0
        if (count > limit) "$label $count/$limit" else null
    }
}

/** Both leave a visible [reason]; neither ever stops the recorder. */
class RecordingGates(
    var inventoryFilter: Boolean = true,
) {
    var skipped: Int = 0
        private set

    var reason: String? = null
        private set

    /** **Suspended, not stopped**: with a size mismatch the corners belong to another resolution, so every crop
     *  would be labeled correctly and cut from the wrong pixels. */
    fun geometrySuspends(note: String?): Boolean {
        if (note == null) return false
        skipped++
        // Name the remedy: without it a phone recorded nothing for seven hours across nine games.
        reason = "Recording paused — $note. Recalibrate to resume; moves are still tracked."
        return true
    }

    fun inventorySkips(fen: String): Boolean {
        if (!inventoryFilter) return false
        val violations = physicalInventoryViolations(fen)
        if (violations.isEmpty()) return false
        skipped++
        reason = "Frame not recorded — more pieces on the board than a real set has " +
            "(${violations.joinToString(", ")}). The position is wrong, not the camera."
        return true
    }

    /** Re-run at flush time. [reason] is cleared first: it once outlived its condition forever. */
    fun blocks(
        fen: String,
        geometryNote: String?,
    ): Boolean {
        reason = null
        return geometrySuspends(geometryNote) || inventorySkips(fen)
    }
}

/** The guard's result only reaches the UI as prose; recording needs it as a value. */
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
