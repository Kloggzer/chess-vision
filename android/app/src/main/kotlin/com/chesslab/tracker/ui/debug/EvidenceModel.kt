package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.DebugPayload
import com.chesslab.engine.api.TrackerStatus

private const val FILES = "abcdefgh"
private const val RANKS = 8

/** The sets mean OPPOSITE things for z (entry.md invariant 2), so an enum, not a severity: a shadow veto
 *  PRESERVES z as vacate evidence, an occlusion veto ZEROES it. */
enum class EvidenceRole {
    PLAIN,
    CHANGED,
    SHADOW,
    OCCLUSION,
}

data class EvidenceCell(
    val square: String,
    val value: Double?,
    val role: EvidenceRole,
    val tainted: Boolean,
)

/** Dark-on-dark moves are visible only in census. */
enum class EvidenceChannel {
    FUSED_Z,
    GRAY,
    CENSUS,
}

/** **a8 top-left** (invariant 11); the crop grid uses `all_squares()` — the two orders never meet. Null where
 *  the channel carries nothing: an empty census map rendered as 0.0 would report a disturbance as calm. */
fun evidenceCells(
    status: TrackerStatus,
    payload: DebugPayload,
    channel: EvidenceChannel,
): List<EvidenceCell> {
    val values =
        when (channel) {
            EvidenceChannel.FUSED_Z -> status.z
            EvidenceChannel.GRAY -> status.diffs
            EvidenceChannel.CENSUS -> status.census
        }
    return List(RANKS * RANKS) { index ->
        val square = "${FILES[index % RANKS]}${RANKS - index / RANKS}"
        val role = roleOf(square, status)
        EvidenceCell(
            square = square,
            // The engine zeroed z here; the raw number would hide exactly the invariant this panel checks.
            value = if (role == EvidenceRole.OCCLUSION) 0.0 else values[square],
            role = role,
            tainted = square in payload.tainted,
        )
    }
}

/** Occlusion outranks shadow outranks changed. */
private fun roleOf(
    square: String,
    status: TrackerStatus,
): EvidenceRole =
    when (square) {
        in status.occlusionVetoed -> EvidenceRole.OCCLUSION
        in status.shadowVetoed -> EvidenceRole.SHADOW
        in status.changed -> EvidenceRole.CHANGED
        else -> EvidenceRole.PLAIN
    }
