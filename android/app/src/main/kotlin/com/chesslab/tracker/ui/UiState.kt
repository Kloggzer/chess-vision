package com.chesslab.tracker.ui

import com.chesslab.engine.STARTPOS
import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.TrackerState

/** One played move plus its decision provenance (for the History detail sheet). */
data class MoveEntry(
    val san: String,
    val decision: Decision?,
)

/** A promotion awaiting the user's piece choice (no CNN safeguard active). */
data class PromotionRequest(
    val from: String,
    val to: String,
)

/**
 * A move announcement for the accessibility LiveRegion ("White plays knight f3").
 * [id] increments per commit so the UI can announce each new move exactly once.
 */
data class MoveAnnouncement(
    val text: String,
    val id: Long,
)

/** Referee alarm banner content: the suspected-move / conflict-square detail text. */
data class AlarmUi(
    val detail: String,
)

/** Debug-card snapshot (mirrors the Python debug card, `index.html:341-379`). */
data class DebugSnapshot(
    val fps: Double = 0.0,
    val motion: Double = 0.0,
    val motionThr: Double = 0.0,
    val changed: List<String> = emptyList(),
    val changedVals: List<Pair<String, Double>> = emptyList(),
    val shadowVetoed: List<String> = emptyList(),
    val occludedVetoed: List<String> = emptyList(),
    val bestScore: Double = 0.0,
    val secondScore: Double = 0.0,
    val margin: Double = 0.0,
    val candidate: String? = null,
    val decider: String? = null,
    val stuckReason: String? = null,
    val confirmCount: Int = 0,
    /** Pre-CLAHE board mean brightness of the latest frame (dark-frame gate input). */
    val meanLuma: Double = 0.0,
)

/**
 * Immutable UI projection of the tracker, reduced from [com.chesslab.engine.api.TrackerStatus]
 * plus [com.chesslab.engine.api.TrackerEvent]s by the [com.chesslab.tracker.service.TrackerCoordinator].
 */
data class UiState(
    val fen: String = STARTPOS,
    val trackerState: TrackerState = TrackerState.WAITING_BOARD,
    val moves: List<MoveEntry> = emptyList(),
    val lastMoveSan: String? = null,
    val note: String = "",
    val inCheck: Boolean = false,
    val gameOver: Boolean = false,
    val promotion: PromotionRequest? = null,
    val announcement: MoveAnnouncement? = null,
    val alarm: AlarmUi? = null,
    /** Dark-frame gate tripped: scene too dark to trust the diff, detection is paused. */
    val sceneDark: Boolean = false,
    val debug: DebugSnapshot = DebugSnapshot(),
) {
    /** SAN history without provenance (for the compact move list). */
    val san: List<String> get() = moves.map { it.san }
}
