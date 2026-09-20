package com.chesslab.engine.api

/** Actions preserve single-thread ownership because `:core-engine` has no locks (hard rule 2). */
sealed interface EngineAction {
    data object Undo : EngineAction

    data object ResetToStart : EngineAction

    data class SetFen(
        val fen: String,
    ) : EngineAction

    data object CaptureBaseline : EngineAction

    /** Der Warp steht anders als bei der Referenzaufnahme — `docs/verifier-stall.md`. */
    data object RectificationChanged : EngineAction

    data class ChoosePromotion(
        val piece: Char,
    ) : EngineAction

    data object AcceptCnnPosition : EngineAction

    /** Adopt the observed position while preserving history and recording the gap. */
    data object ResyncToBoard : EngineAction

    data class UpdateConfig(
        val config: TrackerConfig,
    ) : EngineAction

    /** An action prevents the UI from racing status publication on the engine thread. */
    data class SetDebugEnabled(
        val on: Boolean,
    ) : EngineAction

    /** Der Evaluator haengt vor dem Modell; ohne diese Rueckmeldung blieb `cnnRun` nach einem
     *  gescheiterten Attach an und Kandidaten warteten auf einen Verifizierer, den es nicht gab. */
    data class CnnAvailability(
        val on: Boolean,
    ) : EngineAction
}
