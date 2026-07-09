package com.chesslab.engine.api

/**
 * Debug-card snapshot of the tracker (ports the engine-relevant subset of
 * tracker.py:2433-2517 `MoveTracker.status`). Consumed by phases 04-06.
 */
data class TrackerStatus(
    val fen: String,
    val state: TrackerState,
    val lastMove: String?,
    val history: List<String>,
    val note: String,
    val inCheck: Boolean,
    val gameOver: Boolean,
    val refFen: String?,
    val motion: Double,
    val stableCount: Int,
    val motionSinceRef: Boolean,
    val changed: List<String>,
    val changedVals: List<Pair<String, Double>>,
    val structVals: List<Pair<String, Double>> = emptyList(),
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val tainted: List<String>,
    val bestScore: Double,
    val secondScore: Double,
    val candidate: String?,
    val confirmCount: Int,
    val stuckReason: String?,
    val stuckCount: Int,
    val pendingMove: String?,
    val promotionPending: Pair<String, String>?,
    val priorLast: Boolean,
    val noiseMean: Map<String, Double>,
    val noiseStd: Map<String, Double>,
) {
    val margin: Double get() = bestScore - secondScore
}
