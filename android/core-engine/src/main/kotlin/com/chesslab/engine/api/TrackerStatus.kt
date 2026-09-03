package com.chesslab.engine.api

// The debug screen is a pure function of this snapshot; entry.md forbids a UI side channel.
data class TrackerStatus(
    val state: String,
    val fen: String,
    val z: Map<String, Double>,
    val diffs: Map<String, Double>,
    val census: Map<String, Double>,
    val changed: Set<String>,
    val shadowVetoed: Set<String>,
    val occlusionVetoed: Set<String>,
    /** Fresh, confident occupancy conflicts; piece-type disagreement alone is not a desync. */
    val cnnConflicts: Set<String> = emptySet(),
    /** Fresh coverage flags filtered to hand-plausible squares; empty without a coverage output. */
    val cnnOccluded: Set<String> = emptySet(),
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
    val stageTimingsMs: Map<String, Double>,
    val fps: Double,
    // Camera-delivered FPS distinguishes a dead camera from frames rejected before reaching the engine.
    val cameraFps: Double = 0.0,
    val note: String?,
    // Source-image pixels in [a8, h8, h1, a1] order (entry.md invariant 11); null before calibration.
    val corners: FloatArray? = null,
    val debug: DebugPayload? = null,
)
