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
    /**
     * Squares where a FRESH, CONFIDENT CNN observation contradicts the believed position —
     * the evidence behind `stuckReason = "cnn_desync"`, which otherwise only says "somewhere".
     *
     * Occupancy only: "e4 confidently empty while a bishop is believed there" is a desync, a
     * misread piece TYPE is not. Empty when the last observation is stale or agrees.
     */
    val cnnConflicts: Set<String> = emptySet(),
    /**
     * Fresh squares the observation reads as covered — the `occluded` class on a 14-class run, the
     * coverage output beside the classes on an occlusion run — filtered to hand-plausible flags
     * (`modelHandSquares`). Empty for a 13c model that declares no coverage output.
     */
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
    // warp, gray, motion, evidence, veto, score, total
    val stageTimingsMs: Map<String, Double>,
    val fps: Double,
    // Frames CameraX DELIVERED per second, as opposed to [fps], which counts frames that reached
    // the engine. The engine never sets this — it is under a wall-clock ban, and a frame the app
    // discarded (uncalibrated, too dark) is one it never saw; `:app`'s StatusPublisher fills it in,
    // the same seam as [corners]. One number cannot tell a dead camera from a live one whose frames
    // are all being thrown away, and those two need opposite actions from the user.
    val cameraFps: Double = 0.0,
    val note: String?,
    // 8 floats [a8, h8, h1, a1] in SOURCE-image px (invariant 11), or null before the first
    // calibration. The engine never sets this — the app fills in the corners it warped with.
    val corners: FloatArray? = null,
    // null unless debugEnabled — see 07b
    val debug: DebugPayload? = null,
)
