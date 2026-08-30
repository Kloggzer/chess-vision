package com.chesslab.engine.changeset

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.FrameReads
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

    /** Consecutive readings whose picture was too crowded to be a position — see [crowded]. */
    private var crowdedRuns = 0

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

    /** Neither number is read here: this engine measures the board itself, on its own 160 warp. */
    override val reads = FrameReads(gridCoverage = false, roiMotion = false)

    private fun explain(
        snap: CnnSnapshot,
        gray: ByteArray,
        input: FrameInput,
    ): List<TrackerEvent> {
        val reading = Reading.of(snap)
        val check = reading?.let { ColourCheck(it, config.pOccludedThr) }
        covered = check?.covered().orEmpty()
        val evidence = phase.reference?.let { ChangeEvidence.of(it, gray) }
        evidence?.let { onTrace("busy=${ChangeEvidence.round1(it.busy)}") }
        val held = held(evidence, gray)
        if (held != null || evidence == null) return held.orEmpty()
        crowdedRuns = 0
        // The model chooses among hypotheses rather than vetoing the winner — see `ChangeSearch`.
        val verdict =
            search.explain(
                position,
                evidence,
                covered,
                objections = { after, touched -> check?.objections(after, touched)?.size ?: 0 },
                captures = { was, now, quiet -> check?.captures(was, now, quiet)?.size ?: 0 },
            )
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
        // A latched alarm stops every commit, deadlock and all. Letting an UNAMBIGUOUS one through
        // was tried and measured: it found far more (`11-59-12` 31 -> 53 plies, `13-52-38` 9 -> 21)
        // and put phantoms where there had been none (2, 2 and 3 across three recordings). Misses
        // are recoverable, fabrications are the veto, so the strict form stays. What the deadlock
        // really wants is a way OUT of the latch that is not a commit.
        if (alarms.current != null) return notes.say("alarm latched — not committing")
        val ucis = verdict.moves.map(::uci)
        val sans = sansOf(position, verdict.moves)
        val before = position.fen
        verdict.moves.forEach { position.doMove(it) }
        plies += verdict.moves.size
        onDecision(ChangeDecision(input.timestampMs, plies, ucis, sans, before, position.fen, coveredNames))
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

    /**
     * Three reasons to say nothing yet, and the run-length that turns one of them into a verdict
     * about the REFERENCE.
     *
     * A hand over the board explains any amount of change, so nothing under it is evidence —
     * waiting costs one reading, where treating it as unexplained burns a retry and walks the
     * alarm ladder. `busy` is the pixels' own hand detector and the one that works: the model
     * missed a hand across the queenside entirely (`covered=[]`) while a quarter of the board was
     * moving.
     *
     * And the reference only advances on a board this engine UNDERSTOOD, so a start it cannot
     * explain locks it out for good — nothing commits, the reference stays on the first frame, and
     * every played move widens the gap. Measured on `VID_20260726_233432`: unrest at a median of
     * 18.6 grey levels against a bar of 5, and 0 of 21 plies. One crowded reading is a hand and
     * worth waiting out; a run of them is a reference that has to be given up. **0/21/0 -> 19/2/0.**
     */
    private fun held(
        evidence: ChangeEvidence?,
        gray: ByteArray,
    ): List<TrackerEvent>? {
        if (evidence == null) return notes.say("no understood picture yet")
        // Before the counter, not after: a reading skipped because of a HAND says nothing about
        // the reference, and counting it towards "stale" was measured to cost three plies.
        if (covered.size > HAND_LIMIT) return notes.say("a hand is over the board")
        val crowded = evidence.busy > ChangeEvidence.CROWDED
        crowdedRuns = if (crowded) crowdedRuns + 1 else 0
        val stale = crowdedRuns >= CROWDED_PATIENCE
        if (stale) {
            crowdedRuns = 0
            phase.settle(gray)
        }
        return when {
            stale -> notes.say("the reference was stale — measuring from the board as it stands")
            crowded -> notes.say("too much of the board is moving")
            else -> null
        }
    }

    internal val coveredNames: List<String> get() = covered.map(ChangeEvidence::nameOf).sorted()

    internal fun mutate(block: (Board) -> Unit): List<TrackerEvent> {
        block(position)
        crowdedRuns = 0
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

        /** Crowded readings in a row before the reference, not the board, is the suspect. */
        const val CROWDED_PATIENCE = 5
        const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
    }
}
