package com.chesslab.engine.api

/**
 * The extra state the on-device debug screen needs.
 *
 * It rides on [TrackerStatus] because `entry.md` forbids a side channel to the UI: the debug screen
 * is a pure function of the published snapshot. It is `null` unless
 * `TrackerEngine.setDebugEnabled(true)` — assembling it walks 64 squares twice and copies the
 * decision ring, which the 15 fps budget has no room for on a frame nobody is looking at.
 *
 * Pixels are NOT here. `:core-engine` holds no frame history and does no imaging; the 64-crop grid
 * is assembled in `:app` from the crops the observer actually handed the model.
 */
data class DebugPayload(
    // newest last, ring-capped; rejections included (Python logs only commits)
    val decisions: List<DebugDecision>,
    // the last CNN glance, one row per square; empty when no observation has landed
    val cnnReads: List<DebugCnnRead>,
    // occlusion-tainted squares. TrackerStatus has no such set (STATUS D03d-9) and invariant 2 is
    // invisible without it: taint ZEROES z, the shadow veto PRESERVES it.
    val tainted: Set<String>,
    // frame seq of the observation `cnnReads` came from; -1 when there is none
    val cnnSeq: Long,
    val cnnAgeMs: Long,
    // preprocess + inference of that glance (STATUS D05c-4)
    val cnnInferMs: Double,
    val gridCoverage: Double,
    val motion: Double,
    // the gates the panels have to show a value against
    val maxChanged: Int,
    val zThr: Double,
    val cnnConfThr: Double,
    val minConfidentBoard: Int,
    val minConfidentRecovery: Int,
)

/**
 * One row of the decision log — `tracker.py::_record_decision` plus the rejections.
 *
 * Python's `_recent_decisions` also carries warped BGR copies for the feedback dataset; on the
 * phone that is memory the tracker cannot afford, so this is text only and `DecisionLogTest`
 * asserts it stays that way.
 */
data class DebugDecision(
    val tsS: Double,
    val ply: Int,
    val uci: String?,
    val san: String?,
    val fenBefore: String?,
    val fenAfter: String,
    // diff | diff_pair | diff_after_verify | cnn_overrule | cnn_pair | cnn_recovery | ...
    val decider: String,
    // the `_DECIDER_REASON` prose, plus " + prior tie-break" when the prior decided it
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
    val cnnAgreement: Double,
    val cnnBestMove: String?,
    val stuckReason: String?,
    // the multi-glance vote outcome that led here (entry.md invariant 13)
    val verifyOutcome: String?,
    // false = the candidate was REJECTED and never committed
    val accepted: Boolean,
)

/**
 * One square as the last CNN glance read it.
 *
 * The seam ([CnnObservation]) exposes no separate `p_occ` / `p_empty` — [occupied] is its
 * `pOcc > pEmpty` verdict and [conf] the winning class probability. [believed] is the piece the
 * game state has there, so a conflict is decidable without a second lookup.
 */
data class DebugCnnRead(
    val square: String,
    val label: String?,
    val conf: Double,
    val pOccluded: Double,
    val occupied: Boolean,
    val confident: Boolean,
    // FEN piece char of the believed position; null = believed empty
    val believed: Char?,
)
