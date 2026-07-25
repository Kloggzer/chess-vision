package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugPayload

/**
 * One square as the model read it, next to what the game state believes.
 *
 * [conflict] is decided on OCCUPANCY, not on identity — the same axis `resync_check` uses, and for
 * the same reason: "b4 confidently EMPTY while a bishop is believed there" is a desync, a misread
 * piece TYPE is the model's known weak axis and not evidence of anything.
 */
data class CnnReadRow(
    val square: String,
    val label: String,
    val conf: Double,
    val pOccluded: Double,
    val occupied: Boolean,
    val confident: Boolean,
    val believed: String,
    val conflict: Boolean,
)

/**
 * Conflicts pinned to their own section, everything else sorted by confidence.
 *
 * [nConfident] against `minConfidentBoard` / `minConfidentRecovery` is on the panel because those
 * two gates are why a glance gets silently ignored — the observation is fine, the count is short,
 * and nothing anywhere says so.
 */
data class CnnReadsView(
    val conflicts: List<CnnReadRow>,
    val rest: List<CnnReadRow>,
    val nConfident: Int,
    val minConfidentBoard: Int,
    val minConfidentRecovery: Int,
)

fun cnnReadRows(
    payload: DebugPayload,
    ascending: Boolean = false,
): CnnReadsView {
    val rows = payload.cnnReads.map { it.toRow() }
    val sorted = if (ascending) rows.sortedBy { it.conf } else rows.sortedByDescending { it.conf }
    return CnnReadsView(
        conflicts = sorted.filter { it.conflict },
        rest = sorted.filterNot { it.conflict },
        nConfident = rows.count { it.confident },
        minConfidentBoard = payload.minConfidentBoard,
        minConfidentRecovery = payload.minConfidentRecovery,
    )
}

private fun DebugCnnRead.toRow(): CnnReadRow =
    CnnReadRow(
        square = square,
        label = label ?: "-",
        conf = conf,
        pOccluded = pOccluded,
        occupied = occupied,
        confident = confident,
        believed = believed?.toString() ?: "empty",
        conflict = confident && occupied != (believed != null),
    )
