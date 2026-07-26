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
    /**
     * Frames the RUNNING session has written. A session id alone made a recorder that had written
     * nothing for ten minutes look exactly like one that was working.
     */
    val recordedFrames: Int = 0,
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
            is TrackerEvent.MoveCommitted ->
                onCommitted(listOf(event.uci), listOf(event.san), event.fenAfter, status, event.decider, event.priorUsed)
            // Fast play (`Commit.kt:165`) and CNN recovery (`CnnTick.kt:252`) commit real plies
            // through THIS event, and the engine queues a session photo for it exactly as it does
            // for a single move. Dropping it lost those moves from the game and their frames from
            // the recording, while the move list and the notification counted them.
            is TrackerEvent.SequenceCommitted ->
                onCommitted(event.ucis, event.sans, event.fenAfter, status, event.decider, priorUsed = false)
            // The tracker's own proof that nothing is moving — Python flushes the deferred session
            // photo here, but ONLY with an empty occlusion set (`tracker.py:3085`). A re-anchor is
            // emitted unconditionally (`TrackerEngine.kt:414`), so the check belongs here: without
            // it the photo is taken with a hand still over the board.
            is TrackerEvent.ReAnchored -> if (isClean(status)) capture.flush()
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
        ucis: List<String>,
        sans: List<String>,
        fenAfter: String,
        status: TrackerStatus?,
        decider: String,
        priorUsed: Boolean,
    ) {
        // A record whose line the engine already left is not a game — see `LiveGame.continues`.
        // Closing it here keeps every stored file legal from its own `startFen`, and starts the
        // next one AT the seam, so the position after the jump is the new record's ground truth.
        live?.takeUnless { it.continues(ucis) }?.let {
            endAndSave()
            live = LiveGame(fenAfter, now(), profile)
            return
        }
        val game = live ?: LiveGame(startFen, now(), profile).also { live = it }
        // The engine states the decider ON the event, so it is always known. The debug payload adds
        // the evidence behind it and is off by default — reading the decider from THERE meant every
        // game stored `provenance: null`, including the ones recorded with debug on, because its
        // rows are matched by `accepted && uci` and that second source can simply fail to line up.
        // Measured: null on all 77 recorded plies across five sessions.
        val decision =
            status
                ?.debug
                ?.decisions
                ?.lastOrNull { it.accepted && it.uci == ucis.last() }
                ?.toProvenance()
                ?: MoveProvenance(decider = decider, reason = decider, priorUsed = priorUsed)
        game.onCommitted(ucis, sans, fenAfter, now(), decision)
        capture.queue(game.moveCount, fenAfter, sans.last(), isClean(status))
        if (resultFromFen(fenAfter) != "*") endAndSave()
    }

    /**
     * Python's "clean board" — no occlusion vetoes and no tainted squares. `tainted` rides on the
     * debug payload only (D03d-9), so with debug off the occlusion set is what we have.
     */
    private fun isClean(status: TrackerStatus?): Boolean = status?.occlusionVetoed.isNullOrEmpty() && status?.debug?.tainted.isNullOrEmpty()

    private fun publish() {
        mutable.value =
            mutable.value.copy(
                moveCount = live?.moveCount ?: 0,
                recordingSessionId = capture.recorder?.sessionId,
                recordedFrames = capture.recorder?.count ?: 0,
                recordingReason = capture.reason,
            )
    }
}
