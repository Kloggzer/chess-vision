package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.record.SessionCaptureController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class GameSessionState(
    val moveCount: Int = 0,
    val lastSavedId: String? = null,
    val recordingSessionId: String? = null,
    val recordingReason: String? = null,
)

/**
 * Turns the tracker's event stream into a saved game and, when recording is on, into labeled
 * frames — the two things phase 08a exists for, driven by the same three signals.
 *
 * It listens rather than asks: the engine is single-threaded and owns its state, so a game is
 * reconstructed from what it publishes (`MoveCommitted`, `ReAnchored`, the FEN) and never by
 * reaching into it.
 */
class GameSessionController(
    private val store: GameStore,
    private val capture: SessionCaptureController,
    private val now: () -> Long,
    private val idFor: (Long) -> String,
) {
    private val mutable = MutableStateFlow(GameSessionState())
    private var live: LiveGame? = null
    private var startFen: String = STARTPOS
    private var profile: String = "default"

    val state: StateFlow<GameSessionState> = mutable

    /** The position the tracker is on before the first move — a game may be seeded with any FEN. */
    fun onIdle(
        fen: String,
        profileName: String,
    ) {
        if (live == null) {
            startFen = fen
            profile = profileName
        }
    }

    fun onEvent(
        event: TrackerEvent,
        status: TrackerStatus?,
    ) {
        when (event) {
            is TrackerEvent.MoveCommitted -> onCommitted(event, status)
            // The tracker's own proof that nothing is moving — Python flushes the deferred session
            // photo exactly here (`tracker.py:405`, the quiet re-anchor branch).
            is TrackerEvent.ReAnchored -> capture.flush()
            else -> Unit
        }
        publish()
    }

    /** An undo is only visible as a position that went backwards; see [LiveGame.onFen]. */
    fun onStatus(status: TrackerStatus) {
        if (live?.onFen(status.fen) == true) {
            capture.undo()
            publish()
        }
    }

    /**
     * Ends the running game and stores it. Returns `null` for an empty game — starting and
     * stopping the tracker must not fill the library with zero-move rows.
     */
    fun endAndSave(): GameSummary? {
        val game = live ?: return null
        val session = capture.stop()
        live = null
        val saved = store.save(game.finish(idFor(now()), now(), session?.sessionId))
        mutable.value = GameSessionState(lastSavedId = saved?.id, recordingReason = capture.reason)
        return saved
    }

    private fun onCommitted(
        event: TrackerEvent.MoveCommitted,
        status: TrackerStatus?,
    ) {
        val game = live ?: LiveGame(startFen, now(), profile).also { live = it }
        val decision = status?.debug?.decisions?.lastOrNull { it.accepted && it.uci == event.uci }
        game.onCommitted(event, now(), decision)
        // Python's "clean board" = no occlusion vetoes and no tainted squares. `tainted` rides on
        // the debug payload only (D03d-9), so with debug off the occlusion set is what we have.
        val clean = status?.occlusionVetoed.isNullOrEmpty() && status?.debug?.tainted.isNullOrEmpty()
        capture.queue(game.moveCount, event.fenAfter, event.san, clean)
        if (resultFromFen(event.fenAfter) != "*") endAndSave()
    }

    private fun publish() {
        mutable.value =
            mutable.value.copy(
                moveCount = live?.moveCount ?: 0,
                recordingSessionId = capture.recorder?.sessionId,
                recordingReason = capture.reason,
            )
    }
}
