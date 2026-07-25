package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig

/**
 * Everything the outside world can ask the engine to do.
 *
 * The UI never calls the engine directly: `:core-engine` has no locks by design (hard rule 2)
 * and a second thread would corrupt it silently rather than deadlock. An action is a value handed
 * to [EngineHost], applied on the owning thread, between two frames.
 */
sealed interface EngineAction {
    data object Undo : EngineAction

    data object ResetToStart : EngineAction

    data class SetFen(
        val fen: String,
    ) : EngineAction

    data object CaptureBaseline : EngineAction

    data class ChoosePromotion(
        val piece: Char,
    ) : EngineAction

    data object AcceptCnnPosition : EngineAction

    data class UpdateConfig(
        val config: TrackerConfig,
    ) : EngineAction
}
