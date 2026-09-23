package com.chesslab.engine.api

/** Single-thread ownership: `:core-engine` has no locks (hard rule 2). */
sealed interface EngineAction {
    data object Undo : EngineAction

    data class SetFen(
        val fen: String,
    ) : EngineAction

    data object CaptureBaseline : EngineAction

    /** Der Warp steht anders als bei der Referenzaufnahme — `docs/tracker-flow.md`. */
    data object RectificationChanged : EngineAction

    data class ChoosePromotion(
        val piece: Char,
    ) : EngineAction

    data object AcceptCnnPosition : EngineAction

    data object ResyncToBoard : EngineAction

    data class UpdateConfig(
        val config: TrackerConfig,
    ) : EngineAction

    /** An action, so the UI cannot race status publication on the engine thread. */
    data class SetDebugEnabled(
        val on: Boolean,
    ) : EngineAction

    /** Der Evaluator haengt vor dem Modell; ohne diese Rueckmeldung blieb `cnnRun` nach gescheitertem Attach an. */
    data class CnnAvailability(
        val on: Boolean,
    ) : EngineAction
}
