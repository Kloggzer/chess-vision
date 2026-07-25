package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.DebugPayload
import com.chesslab.engine.api.TrackerStatus

private const val FILES = "abcdefgh"
private const val RANKS = 8

/**
 * Why a cell looks the way it does. The three sets carry OPPOSITE meanings for z (entry.md
 * invariant 2) and must never collapse into one visual channel, so this is an enum and not a
 * severity number: a shadow veto PRESERVES z as vacate evidence, an occlusion veto ZEROES it.
 */
enum class EvidenceRole {
    PLAIN,
    CHANGED,
    SHADOW,
    OCCLUSION,
}

data class EvidenceCell(
    val square: String,
    val value: Double,
    val role: EvidenceRole,
    val tainted: Boolean,
)

/** The seam carries all three channels; dark-on-dark moves are visible only in census. */
enum class EvidenceChannel {
    FUSED_Z,
    GRAY,
    CENSUS,
}

/**
 * The 8x8 grid, **a8 top-left** — corner order `[a8, h8, h1, a1]` (invariant 11). The 64-crop grid
 * uses `all_squares()` instead; rendering either one in the other's order is that invariant's
 * failure mode, so the two orders live in two functions that never meet.
 */
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
            // The occlusion veto zeroed z in the engine; rendering the raw channel here would put
            // the number back and hide exactly the invariant this panel exists to check.
            value = if (role == EvidenceRole.OCCLUSION) 0.0 else values[square] ?: 0.0,
            role = role,
            tainted = square in payload.tainted,
        )
    }
}

/** Occlusion outranks shadow outranks changed — a square that survived every veto is `changed`. */
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
