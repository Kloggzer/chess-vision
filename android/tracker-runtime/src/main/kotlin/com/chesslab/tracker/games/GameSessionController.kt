package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.record.SessionCaptureController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * How long a rolled-back position must stand before the record accepts it as a take-back.
 *
 * Several times `STATUS_SAMPLE_MS` (100 ms): long enough that a status delivered late is overtaken
 * by the current one first, short enough that a real take-back is honoured before the player has
 * finished putting the piece down.
 */
private const val UNDO_CONFIRM_MS = 500L

data class GameSessionState(
    val moveCount: Int = 0,
    /**
     * The running game, as the ONE review surface reads it — the tracking screen's move list, the
     * review screen and the LAN spectator all take their score sheet from here.
     *
     * Before this existed each of those three accumulated its own list off the event stream, and
     * only this one handled an undo (`LiveGame.onFen`): the tracking screen kept showing a move the
     * engine had taken back, and the spectator never dropped one at all.
     */
    val game: GameView = GameView.NONE,
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

    /** The rolled-back position waiting to prove it is a take-back, and since when — [onStatus]. */
    private var undoFen: String? = null
    private var undoSince: Long = 0L

    val state: StateFlow<GameSessionState> = mutable

    /** The position the tracker is on before the first move — a game may be seeded with any FEN. */
    fun onIdle(
        fen: String,
        profileName: String,
    ) {
        if (live == null) {
            startFen = fen
            profile = profileName
            // No `capture.start()` here any more: the session directory opens with the first
            // committed ply (`SessionCaptureController.queue`), never with the first frame — a
            // run that only aims, tapes markers or calibrates must leave nothing on disk.
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
            // photo here, but ONLY with an empty occlusion set (`tracker.py`). A re-anchor is
            // emitted unconditionally (`TrackerEngine.kt:414`), so the check belongs here: without
            // it the photo is taken with a hand still over the board.
            is TrackerEvent.ReAnchored -> if (isClean(status)) capture.flush()
            else -> Unit
        }
        publish()
    }

    /**
     * An undo is only visible as a position that went backwards ([LiveGame.wouldUndo]) — and it has
     * to STAY there before the record believes it.
     *
     * A commit event and a status update are two collectors on two flows, and the status is sampled
     * (`STATUS_SAMPLE_MS`). A status captured a moment before a commit and delivered a moment after
     * it carries exactly the position the record has just moved on from — indistinguishable from a
     * take-back, and the record deleted the ply it had just written. Measured on the game of
     * 2026-08-10: the engine committed and announced 69 plies, the record kept 39. Every one of its
     * eleven seams is a ply deleted this way and the commit after it no longer fitting the line.
     *
     * A real take-back stays: the pieces are back on the board and every following status says so.
     * A late sample is a single blip, overtaken by the current position within one interval. So the
     * rolled-back position must survive [UNDO_CONFIRM_MS] before it counts, which costs a genuine
     * undo a fraction of a second of latency and costs the record nothing.
     */
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

    /**
     * Ends the running game and stores it. Returns `null` for an empty game — starting and
     * stopping the tracker must not fill the library with zero-move rows.
     */
    fun endAndSave(
        white: String = UNKNOWN,
        black: String = UNKNOWN,
        /** Null = read it off the board. The service's own auto-save never states one. */
        result: GameResult? = null,
    ): GameSummary? {
        val session = capture.stop()
        val game = live
        if (game == null) {
            mutable.value = GameSessionState(recordingReason = capture.reason)
            return null
        }
        live = null
        val saved = store.save(game.finish(idFor(now()), now(), session?.sessionId, white, black, result))
        mutable.value = GameSessionState(lastSavedId = saved?.id, recordingReason = capture.reason)
        return saved
    }

    /**
     * Drops the running game without storing it — the "Discard" half of the end-game dialog.
     *
     * That half had no counterpart here at all: discarding reset the ENGINE and left this record
     * standing, so the next committed ply was illegal from it and opened a SEAM inside a game the
     * user had already thrown away. Invisible while nothing else read the record; the moment the
     * live game became the one score sheet on screen it was a discarded game still being shown.
     */
    fun discard() {
        capture.stop()
        live = null
        mutable.value = GameSessionState(recordingReason = capture.reason)
    }

    private fun onCommitted(
        ucis: List<String>,
        sans: List<String>,
        fenAfter: String,
        status: TrackerStatus?,
        decider: String,
        priorUsed: Boolean,
    ) {
        // A line the engine already left is not a game — see `LiveGame.continues`. It opens a new
        // SEGMENT, anchored at the position the engine actually reached, so every line the record
        // holds stays legal from its own start.
        //
        // It does NOT close the record. Closing it was the first fix and it cost the user the game:
        // one played game came off the device as three files three minutes apart, and "eine Naht in
        // der Game-Historie ist für mich als Nutzer unverständlich". One played game, one record.
        //
        // The jumping plies land in no move list: they are illegal from the previous line's last
        // position (that is what a seam IS) and they precede the new segment's start. That was
        // silent, and it hid real losses — Qxd4, Qe5+ and Be7 are in none of the three files from
        // 2026-07-28. They are recorded on the segment they opened instead.
        //
        // Still NO `capture.queue` here, and deliberately: a seam is the moment the engine's own
        // FEN is least trustworthy, so a frame labelled with it is the poisoned-data case the
        // recording gates exist to prevent. A gap in the training set beats a wrong label in it.
        //
        // A gap the plies THEMSELVES explain is not a seam at all — `closeGapBefore` appends the one
        // legal sequence that reaches the position the engine committed from, and the commit below
        // then continues the line normally. Only a gap nothing explains opens a segment.
        live?.takeUnless { it.continues(ucis) || it.closeGapBefore(ucis, fenAfter, now(), decider) }?.let { game ->
            game.openSegment(
                fenAfter,
                SeamOrigin(fenBefore = game.currentFen, sans = sans, ucis = ucis, decider = decider),
            )
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
        if (resultFromFen(fenAfter) != GameResult.UNFINISHED) endAndSave()
    }

    /**
     * Python's "clean board" — no occlusion vetoes and no tainted squares. `tainted` rides on the
     * debug payload only (D03d-9), so with debug off the occlusion set is what we have.
     *
     * The alarm is part of it, and deliberately so. While the latch is up the app's board and the
     * physical board disagree, so a frame taken now would be stored against a FEN that does not
     * describe it — poisoned training data that is indistinguishable from good data afterwards,
     * exactly the failure the geometry gate exists to prevent.
     *
     * Python reaches the same end without a gate of its own: while alarmed it blocks every commit
     * AND every re-anchor (`tracker.py`), and those two are the only things that drive the
     * recorder. `TrackerEngine.kt:406` blocks re-anchor identically. But that leaves this consumer
     * depending on an engine internal it cannot see; naming the condition here makes the guarantee
     * local, and it costs nothing while the engine keeps its half of the bargain.
     */
    private fun isClean(status: TrackerStatus?): Boolean {
        // Ohne Status ist nichts ausgeschlossen. Mit `status?.x == null` sagten alle drei Terme ja,
        // also las "wir wissen nichts" als "sauber" — und der Fluss startet auf `null`.
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
