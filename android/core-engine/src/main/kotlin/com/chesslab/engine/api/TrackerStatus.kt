package com.chesslab.engine.api

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
    // 8 floats [a8, h8, h1, a1] in SOURCE-image px (invariant 11), or null before the first
    // calibration. The engine never sets this — the app fills in the corners it warped with.
    val corners: FloatArray? = null,
    // null unless debugEnabled — see 07b
    val debug: DebugPayload? = null,
)
