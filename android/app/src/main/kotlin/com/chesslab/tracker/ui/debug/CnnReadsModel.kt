package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugPayload

/** [conflict] is decided on OCCUPANCY, as `resync_check` does: piece TYPE is the model's known weak axis. */
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

/** [nConfident] is on the panel because a glance short of `minConfidentBoard`/`minConfidentRecovery` is
 *  ignored in silence. */
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
