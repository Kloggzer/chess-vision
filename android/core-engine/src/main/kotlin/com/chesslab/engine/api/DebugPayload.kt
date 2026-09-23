package com.chesslab.engine.api

/** In [TrackerStatus] because `entry.md` forbids a UI side channel; omitted unless enabled. */
data class DebugPayload(
    val decisions: List<DebugDecision>,
    val cnnReads: List<DebugCnnRead>,
    // Exposes invariant 2: taint zeroes z while the shadow veto preserves it.
    val tainted: Set<String>,
    // -1 when no observation has landed.
    val cnnSeq: Long,
    val cnnAgeMs: Long,
    val cnnInferMs: Double,
    val gridCoverage: Double,
    val motion: Double,
    val maxChanged: Int,
    val zThr: Double,
    val cnnConfThr: Double,
    val minConfidentBoard: Int,
    val minConfidentRecovery: Int,
    val frameGate: String? = null,
    val engineSeq: Long = -1L,
    val stableFrames: Int = 0,
    val requiredStableFrames: Int = 0,
    val bufferedFrames: Int = 0,
    val holdRemainingMs: Double = 0.0,
)

/** Text-only: no warped BGR frames retained on the phone. */
data class DebugDecision(
    val tsS: Double,
    val ply: Int,
    val uci: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    val decider: String,
    val reason: String,
    val priorUsed: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val margin: Double,
    val changed: List<String>,
    val changedVals: List<Pair<String, Double>>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val gridCoverage: Double,
    val zThr: Double,
    val motion: Double,
    // Distinguishes zero agreement from a CNN never attached.
    val cnnRun: Boolean,
    val cnnAgreement: Double,
    val cnnReadsTaken: Long = 0L,
    val cnnReadsStale: Long = 0L,
    val cnnSnaps: Long = 0L,
    val cnnSnapsToVerify: Long = 0L,
    val cnnSnapsNoEvaluator: Long = 0L,
    val cnnSnapsNotDue: Long = 0L,
    val cnnBestMove: String?,
    val stuckReason: String?,
    // Multi-glance vote outcome (invariant 13).
    val verifyOutcome: String?,
    val accepted: Boolean,
    /** Its reference is re-captured later, and the labeler must know. */
    val refProvisional: Boolean = false,
)

data class DebugCnnRead(
    val square: String,
    val label: String?,
    val conf: Double,
    val pOccluded: Double,
    val occupied: Boolean,
    val confident: Boolean,
    val believed: Char?,
)
