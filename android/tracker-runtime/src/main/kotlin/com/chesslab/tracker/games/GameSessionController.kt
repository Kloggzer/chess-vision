package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.record.SessionCaptureController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Long enough that a late status is overtaken, short enough that a real take-back is honoured quickly. */
private const val UNDO_CONFIRM_MS = 500L

data class GameSessionState(
    val moveCount: Int = 0,
    /** The ONE score sheet: tracking screen, review and LAN spectator. Separate lists kept showing a taken-back move. */
    val game: GameView = GameView.NONE,
    val lastSavedId: String? = null,
    val recordingSessionId: String? = null,
    /** A session id alone made a recorder that wrote nothing for ten minutes look like one that worked. */
    val recordedFrames: Int = 0,
    val recordingReason: String? = null,
)

/** Listens rather than asks: the engine owns its state, so a game is reconstructed from what it publishes. */
class GameSessionController(
    private val store: GameStore,
    private val capture: SessionCaptureController,
    private val now: () -> Long,
    private val idFor: (Long) -> String,
    /** Null means tips were not watched for, and the stored game says exactly that. */
    private val hints: HintLedger? = null,
    /** Haengt an DIESER Grenze, weil ein Matt die Partie ohne jeden Schirm beendet. */
    private val alsoEnds: List<GameBoundary> = emptyList(),
) {
    private val mutable = MutableStateFlow(GameSessionState())
    private var live: LiveGame? = null
    private var startFen: String = STARTPOS
    private var profile: String = "default"

    private var undoFen: String? = null
    private var undoSince: Long = 0L

    private var pendingSession: String? = null

    val state: StateFlow<GameSessionState> = mutable

    fun onIdle(
        fen: String,
        profileName: String,
    ) {
        if (live == null) {
            startFen = fen
            profile = profileName
            // The session directory opens with the first committed ply, never the first frame: a run that only
            // aims or calibrates must leave nothing on disk.
        }
    }

    fun onEvent(
        event: TrackerEvent,
        status: TrackerStatus?,
    ) {
        when (event) {
            is TrackerEvent.MoveCommitted ->
                onCommitted(listOf(event.uci), listOf(event.san), event.fenAfter, status, event.decider, event.priorUsed)
            // Fast play and CNN recovery commit real plies through THIS event; dropping it lost them from the game.
            is TrackerEvent.SequenceCommitted ->
                onCommitted(event.ucis, event.sans, event.fenAfter, status, event.decider, priorUsed = false)
            // Python flushes the deferred photo only with an empty occlusion set; a re-anchor is emitted
            // unconditionally, so without the check the photo shows a hand.
            is TrackerEvent.ReAnchored -> if (isClean(status)) capture.flush()
            else -> Unit
        }
        publish()
    }

    /** A status sampled before a commit and delivered after it looks exactly like a take-back: the record kept 39
     *  of 69 plies once. A real take-back STAYS, so it must survive [UNDO_CONFIRM_MS]. */
    fun onStatus(status: TrackerStatus) {
        val recordingChanged = capture.syncEnabled()
        if (recordingChanged || mutable.value.recordingReason != capture.reason) publish()
        if (live?.wouldUndo(status.fen) != true) {
            undoFen = null
            return
        }
        if (status.fen != undoFen) {
            undoFen = status.fen
            undoSince = now()
            return
        }
        if (now() - undoSince < UNDO_CONFIRM_MS) return
        undoFen = null
        if (live?.onFen(status.fen) == true) {
            capture.undo()
            publish()
        }
    }

    /** Null for an empty game: starting and stopping must not fill the library with zero-move rows. */
    fun endAndSave(
        white: String = UNKNOWN,
        black: String = UNKNOWN,
        /** Null = read it off the board. */
        result: GameResult? = null,
    ): GameSummary? {
        // Ein zweiter Anlauf findet den Recorder schon gestoppt.
        val session = capture.stop()?.sessionId ?: pendingSession
        pendingSession = session
        val game = live
        if (game == null) {
            // Ein Tipp, den kein Zug mehr abholt, darf nicht auf die NAECHSTE Partie fallen.
            closeGame()
            mutable.value = GameSessionState(recordingReason = capture.reason)
            return null
        }
        // Die Bestaetigung VOR der Aufgabe: `GameStore.save` ist als Ganzes nicht atomar, und `live` ist dann die
        // einzige verbliebene Kopie.
        val saved = store.save(game.finish(idFor(now()), now(), session, white, black, result, hints?.log()))
        live = null
        pendingSession = null
        // Read and cleared HERE, the record boundary — not dependent on which screen call comes first.
        closeGame()
        mutable.value = GameSessionState(lastSavedId = saved?.id, recordingReason = capture.reason)
        return saved
    }

    /** Without it the next ply was illegal from the discarded record and opened a SEAM in a thrown-away game. */
    fun discard() {
        capture.stop()
        live = null
        pendingSession = null
        closeGame()
        mutable.value = GameSessionState(recordingReason = capture.reason)
    }

    /** Die eine Partiegrenze: das automatische Ende nach einem Matt laeuft durch [onCommitted] und ruft keinen Schirm. */
    private fun closeGame() {
        hints?.endGame()
        alsoEnds.forEach { it.endGame() }
    }

    private fun onCommitted(
        ucis: List<String>,
        sans: List<String>,
        fenAfter: String,
        status: TrackerStatus?,
        decider: String,
        priorUsed: Boolean,
    ) {
        // A line the engine left opens a new SEGMENT, never a new record (one game once came off the device as
        // three files). The jumping plies are recorded on the segment; still NO `capture.queue`: a seam is where
        // the FEN is least trustworthy. A gap the plies THEMSELVES explain is closed by `closeGapBefore`.
        live?.takeUnless { it.continues(ucis) || it.closeGapBefore(ucis, fenAfter, now(), decider) }?.let { game ->
            game.openSegment(
                fenAfter,
                SeamOrigin(fenBefore = game.currentFen, sans = sans, ucis = ucis, decider = decider),
            )
            return
        }
        val game = live ?: LiveGame(startFen, now(), profile, hints != null).also { live = it }
        // Read BEFORE the commit: the tip was bound to the position this ply is played out of.
        val hint = ucis.firstOrNull()?.let { hints?.markFor(game.currentFen, it) }
        // The decider comes from the event: read from the debug payload, all 77 recorded plies stored null.
        val decision =
            status
                ?.debug
                ?.decisions
                ?.lastOrNull { it.accepted && it.uci == ucis.last() }
                ?.toProvenance()
                ?: MoveProvenance(decider = decider, reason = decider, priorUsed = priorUsed)
        game.onCommitted(ucis, sans, fenAfter, now(), decision, hint)
        capture.queue(game.moveCount, fenAfter, sans.last(), isClean(status))
        if (resultFromFen(fenAfter) != GameResult.UNFINISHED) endAndSave()
    }

    /** No occlusion vetoes, no tainted squares, and no alarm: while the latch is up a frame would be stored
     *  against a FEN that does not describe it. Local on purpose, not trusting the engine's own re-anchor block. */
    private fun isClean(status: TrackerStatus?): Boolean {
        // Ohne Status ist nichts ausgeschlossen: `status?.x == null` las "wir wissen nichts" als "sauber".
        val known = status ?: return false
        return known.alarm == null && known.occlusionVetoed.isNullOrEmpty() && known.debug?.tainted.isNullOrEmpty()
    }

    private fun publish() {
        mutable.value =
            mutable.value.copy(
                moveCount = live?.moveCount ?: 0,
                game = live?.view() ?: GameView.NONE,
                recordingSessionId = capture.recorder?.sessionId,
                recordedFrames = capture.recorder?.count ?: 0,
                recordingReason = capture.reason,
            )
    }
}
