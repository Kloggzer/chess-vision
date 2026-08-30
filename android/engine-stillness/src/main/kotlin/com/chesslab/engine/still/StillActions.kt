package com.chesslab.engine.still

import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.board.fenOf

/**
 * Every command the outside world can send, answered.
 *
 * None of them may throw: an action arrives from the UI and runs on the analyzer thread, so an
 * exception here kills the frame loop rather than the button that caused it. The ones this engine
 * has no notion of are answered with a note, which is a truthful "nothing happened" — not a
 * silent one.
 */
internal class StillActions(
    private val engine: StillnessEngine,
) {
    fun apply(action: EngineAction): List<TrackerEvent> =
        when (action) {
            is EngineAction.Undo -> engine.undoLast()
            is EngineAction.ResetToStart -> engine.mutate { it.loadFromFen(STARTPOS) }
            is EngineAction.SetFen -> engine.mutate { it.loadFromFen(action.fen) }
            // The board is declared understood as it stands: exactly what settling means here.
            is EngineAction.CaptureBaseline -> engine.mutate { }
            is EngineAction.ResyncToBoard -> adopt()
            is EngineAction.AcceptCnnPosition -> adopt()
            // The search picks the promotion piece itself — identity at weight 0.4 still separates
            // a queen from a rook — so there is never a pending choice to answer.
            is EngineAction.ChoosePromotion -> listOf(TrackerEvent.Note("promotion is decided by the reading"))
            is EngineAction.SetDebugEnabled -> emptyList()
            is EngineAction.UpdateConfig -> {
                engine.retune(action.config)
                emptyList()
            }
        }

    /**
     * Adopt what the board shows. The reading that is held is the one this engine could not
     * explain, so its argmax is the best available account of the position.
     */
    private fun adopt(): List<TrackerEvent> {
        val snap = engine.lastReading() ?: return listOf(TrackerEvent.Note("no reading to adopt yet"))
        val fen = fenOf(snap) ?: return listOf(TrackerEvent.Note("the held reading cannot name a position"))
        return engine.mutate { it.loadFromFen(fen) } + TrackerEvent.ReAnchored
    }
}
