package com.chesslab.engine.api

/**
 * Empty marker for the on-device debug surface. Phase 07b owns this type and fills in its
 * fields (timings, evidence heatmap, 64-crop grid, CNN reads, decision log); phase 00a only
 * declares it so [TrackerStatus] can carry it from day one.
 */
data class DebugPayload(
    val placeholder: Unit = Unit,
)

// TrackerStatus.kt — an immutable snapshot for the UI. The debug screen is a pure
// function of this; no phase may add a side channel to the UI.
data class TrackerStatus(
    // waiting | moving | occluded | move
    val state: String,
    val fen: String,
    // fused per-square z (evidence heatmap)
    val z: Map<String, Double>,
    // normalized gray channel
    val diffs: Map<String, Double>,
    // normalized census channel
    val census: Map<String, Double>,
    val changed: Set<String>,
    val shadowVetoed: Set<String>,
    val occlusionVetoed: Set<String>,
    val bestLl: Double,
    val secondLl: Double,
    val bestUci: String?,
    val stuckReason: String?,
    val alarm: TrackerEvent.Alarm?,
    val confirmerKey: String?,
    val confirmerCount: Int,
    val verifyState: String?,
    val pendingUci: String?,
    val pendingFrames: Int,
    // warp, gray, motion, evidence, veto, score, total
    val stageTimingsMs: Map<String, Double>,
    val fps: Double,
    val note: String?,
    // null unless debugEnabled — see 07b
    val debug: DebugPayload? = null,
)
