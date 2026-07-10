package com.chesslab.tracker.games

import kotlinx.serialization.Serializable

/**
 * Lightweight index entry for one persisted game, listed newest-first by
 * [GameStore.list] without parsing every PGN (mirrors the repo's
 * manifest-cache principle: read the small index, not every artifact).
 */
@Serializable
data class GameSummary(
    // e.g. "2026-07-10_1822"
    val id: String,
    val savedAtEpochMs: Long,
    // Best-effort ECO/opening name; left null until a later phase fills it in.
    val opening: String?,
    val moveCount: Int,
    // "1-0" | "0-1" | "1/2-1/2" | "*"
    val result: String,
)

/**
 * One played move's decision provenance, persisted alongside the PGN so the
 * analysis screen (phase 06) can merge engine accuracy with the tracker's own
 * reasoning. Mirrors [com.chesslab.tracker.ui.MoveEntry.decision]
 * ([com.chesslab.engine.api.Decision]) minus the `occluded` field, which is
 * not needed for provenance display.
 */
@Serializable
data class MoveProvenance(
    val ply: Int,
    val san: String,
    val decider: String?,
    val reason: String?,
    val margin: Double,
    val best: Double,
    val second: Double,
    val changed: List<String>,
    val shadowVeto: List<String>,
    val priorUsed: Boolean,
)
