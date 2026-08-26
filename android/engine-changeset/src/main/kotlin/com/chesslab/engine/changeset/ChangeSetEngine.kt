package com.chesslab.engine.changeset

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.engine.board.BOARD_PX
import com.chesslab.engine.board.FrameRate
import com.chesslab.engine.board.Reading
import com.chesslab.engine.board.StillPhase
import com.chesslab.engine.board.grayBoard
import com.chesslab.engine.board.sansOf
import com.chesslab.engine.board.uci
import com.github.bhlangonijr.chesslib.Board

/**
 * The third engine, and the one built from what the first two got wrong.
 *
 * It waits for the board to come to rest like the second, but decides like the first: the squares
 * whose PIXELS changed against the last understood picture are the evidence, and the model is only
 * ever asked empty / white / black, never which piece. Three things measured on 2026-08-26 put it
 * here, all in `docs/engine-changeset.md`:
 *
 * - identity is the weakest output the model has (ten of thirty pieces wrong in every reading on
 *   the live camera, stably), so an engine that decides on it cannot work where the first one does;
 * - one confidently wrong square could veto a whole multi-ply explanation, so evidence per square
 *   is bounded ([ChangeEvidence] clips);
 * - every gate that ends a frame says so ([ChangeNotes.gate]), because a stall that writes nothing cannot
 *   be told apart from a stall that writes nothing for a different reason.
 */
class ChangeSetEngine(
    private var config: TrackerConfig,
    startFen: String,
    private val onConfigApplied: (TrackerConfig) -> Unit = {},
    private val onTrace: (String) -> Unit = {},
    private val onDecision: (ChangeDecision) -> Unit = {},
) : EngineOps {
    internal val position = Board().apply { loadFromFen(startFen) }
    internal val phase = StillPhase()
    private val search = ChangeSearch(onTrace)
    internal val alarms = ChangeAlarm()
    private val rate = FrameRate()
    private var pending: CnnSnapshot? = null
    private var plies = 0
    internal val notes = ChangeNotes(onTrace)
    internal var stuck: String? = null
    internal var covered: Set<Int> = emptySet()

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        rate.saw(input.timestampMs)
        val gray = grayBoard(input.board?.invoke(BOARD_PX) ?: input.bgrDet) ?: return notes.say("no board yet")
        val moving = phase.observe(gray, input)
        val snap = pending
        val blocked =
            when {
                moving -> "moving"
                snap == null -> "no reading has arrived"
                snap.seq <= phase.lastMotionSeq -> "the reading is older than the last motion"
                snap.fen != position.fen -> "the reading was taken of another position"
                !phase.due(input.timestampMs, gray) -> "nothing new to read"
                else -> null
            }
        notes.gate("${blocked ?: "open"} · ${phase.state()} · plies=$plies")
        if (blocked != null || snap == null) return if (moving) notes.say("moving") else emptyList()
        pending = null
        return explain(snap, gray, input)
    }

    /** Decides nothing: the newest reading wins, and [onFrame] says whether it is worth anything. */
    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        pending = snap
        return emptyList()
    }

    override fun apply(action: EngineAction): List<TrackerEvent> = ChangeActions(this).apply(action)

    override fun status(): TrackerStatus = ChangeStatus.of(this, rate.fps, plies)

    override fun fen(): String = position.fen

    override fun wantsCnnRead(): Boolean = phase.wantsRead()

    private fun explain(
        snap: CnnSnapshot,
        gray: ByteArray,
        input: FrameInput,
    ): List<TrackerEvent> {
        val before = phase.reference ?: return notes.say("no understood picture yet")
        val reading = Reading.of(snap)
        val check = reading?.let { ColourCheck(it, config.pOccludedThr) }
        covered = check?.covered().orEmpty()
        // A hand over the board explains any amount of change, so nothing here is evidence of
        // anything. Waiting costs one reading; treating it as unexplained burns a retry and walks
        // the alarm ladder towards a latch nobody should see.
        if (covered.size > HAND_LIMIT) return notes.say("a hand is over the board")
        val evidence = ChangeEvidence.of(before, gray)
        // The model chooses among hypotheses rather than vetoing the winner — see `ChangeSearch`.
        val verdict =
            search.explain(position, evidence, covered) { after, touched ->
                check == null || check.objections(after, touched).isEmpty()
            }
        phase.read(input.timestampMs)
        onTrace("verdict=${verdict.javaClass.simpleName} covered=${covered.map(ChangeEvidence::nameOf)}")
        return when (verdict) {
            Change.None -> {
                phase.settle(gray)
                stuck = null
                notes.set("board unchanged")
                alarms.clear() + listOf(TrackerEvent.ReAnchored)
            }
            Change.Unexplained -> unexplained(snap, evidence)
            Change.Disputed -> {
                phase.smudge()
                stuck = STUCK_UNEXPLAINED
                notes.say("the picture and the model disagree — waiting")
            }
            is Change.Moves -> commit(verdict, gray, input)
        }
    }

    private fun commit(
        verdict: Change.Moves,
        gray: ByteArray,
        input: FrameInput,
    ): List<TrackerEvent> {
        if (alarms.current != null) return notes.say("alarm latched — not committing")
        val ucis = verdict.moves.map(::uci)
        val sans = sansOf(position, verdict.moves)
        val before = position.fen
        verdict.moves.forEach { position.doMove(it) }
        plies += verdict.moves.size
        onDecision(ChangeDecision(input.timestampMs, plies, ucis, sans, before, position.fen, coveredNames()))
        val events = mutableListOf<TrackerEvent>()
        events += alarms.clear()
        events +=
            if (ucis.size == 1) {
                TrackerEvent.MoveCommitted(ucis.first(), sans.first(), position.fen, DECIDER, priorUsed = false)
            } else {
                TrackerEvent.SequenceCommitted(ucis, sans, position.fen, DECIDER)
            }
        if (verdict.complete) {
            phase.settle(gray)
            events += TrackerEvent.ReAnchored
        } else {
            phase.smudge()
        }
        stuck = null
        notes.set("committed ${sans.joinToString(" ")}")
        return events
    }

    private fun unexplained(
        snap: CnnSnapshot?,
        evidence: ChangeEvidence,
    ): List<TrackerEvent> {
        phase.smudge()
        stuck = STUCK_UNEXPLAINED
        notes.set("the board changed in a way no legal move explains")
        val changed = evidence.changed().map(ChangeEvidence::nameOf)
        val raised = alarms.onUnexplained(snap?.seq ?: -1L, changed, covered.size, config.desyncObsN)
        if (raised.isNotEmpty()) {
            stuck = STUCK_NO_LEGAL_MOVE
            notes.set(alarms.describe())
        }
        return raised
    }

    internal fun coveredNames(): List<String> = covered.map(ChangeEvidence::nameOf).sorted()

    internal fun mutate(block: (Board) -> Unit): List<TrackerEvent> {
        block(position)
        pending = null
        phase.reset()
        stuck = null
        return alarms.clear()
    }

    internal fun retune(next: TrackerConfig) {
        config = next
        onConfigApplied(next)
    }

    internal fun lastReading(): CnnSnapshot? = pending

    internal fun undoLast(): List<TrackerEvent> =
        if (plies <= 0) {
            notes.say("nothing to take back")
        } else {
            plies -= 1
            mutate { it.undoMove() }
        }

    private companion object {
        const val DECIDER = "change_diff"
        const val STUCK_UNEXPLAINED = "unexplained_change"

        /** Above this many covered squares the picture is of a hand, not of a position. */
        const val HAND_LIMIT = 6
        const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
    }
}
