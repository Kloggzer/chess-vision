package com.chesslab.engine.changeset

import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.board.fenOf

/**
 * Every command the outside world can send, answered.
 *
 * None may throw: an action arrives from the UI and runs on the analyzer thread, so an exception
 * here kills the frame loop rather than the button that caused it.
 */
class ChangeActions(
    private val engine: ChangeSetEngine,
) {
    fun apply(action: EngineAction): List<TrackerEvent> =
        when (action) {
            is EngineAction.Undo -> engine.undoLast()
            is EngineAction.ResetToStart -> engine.mutate { it.loadFromFen(STARTPOS) }
            is EngineAction.SetFen -> engine.mutate { it.loadFromFen(action.fen) }
            // The picture is declared understood as it stands, the position kept: for an engine
            // that measures CHANGE, that is exactly what a new baseline means.
            is EngineAction.CaptureBaseline -> engine.mutate { }
            // Kein Pixel-Vergleich gegen eine Referenz, also nichts zu verwerfen.
            is EngineAction.RectificationChanged -> emptyList()
            is EngineAction.ResyncToBoard -> adopt()
            is EngineAction.AcceptCnnPosition -> adopt()
            // A promotion is the one question where WHICH piece is the question, so it is the one
            // place this engine consults identity — see [adopt] for why that is a caveat.
            is EngineAction.ChoosePromotion -> listOf(TrackerEvent.Note("promotion follows the reading"))
            is EngineAction.SetDebugEnabled -> emptyList()
            is EngineAction.UpdateConfig -> {
                engine.retune(action.config)
                emptyList()
            }
        }

    /**
     * Adopt what the model reads. This is the ONE path that depends on identity, and it is the
     * weakest thing the model produces — measured 2026-08-26, ten pieces of thirty came back
     * misnamed on a correct board. A human asking for it has seen the board and asked anyway,
     * which is the only reason it is offered at all.
     */
    private fun adopt(): List<TrackerEvent> {
        val snap = engine.lastReading() ?: return listOf(TrackerEvent.Note("no reading to adopt yet"))
        val fen = fenOf(snap) ?: return listOf(TrackerEvent.Note("the held reading cannot name a position"))
        return engine.mutate { it.loadFromFen(fen) } + TrackerEvent.ReAnchored
    }
}
