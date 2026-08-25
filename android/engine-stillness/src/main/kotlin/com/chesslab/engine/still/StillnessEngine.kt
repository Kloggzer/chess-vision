package com.chesslab.engine.still

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.github.bhlangonijr.chesslib.Board

/**
 * The second engine: it reads the board when the board has stopped moving.
 *
 * Every frame it watches the rectified board for motion, which costs no model read. A hand is
 * motion; a settled board that differs from the last understood still image is the only thing
 * worth a reading, and [MoveExplainer] turns that reading into legal moves from the tracked
 * position. One reading per ply is the steady state — a hover or a straightened piece costs
 * nothing.
 *
 * Readings arrive PUSHED (the observer decides when to look), so what was a trigger here is a
 * filter: [StillPhase] says whether the snapshot that just arrived is worth explaining.
 */
class StillnessEngine(
    private var config: TrackerConfig,
    startFen: String,
    private val onConfigApplied: (TrackerConfig) -> Unit = {},
    private val onDecision: (StillDecision) -> Unit = {},
) : EngineOps {
    private val position = Board().apply { loadFromFen(startFen) }
    private val phase = StillPhase()
    private var explainer: MoveExplainer? = null
    private var pending: CnnSnapshot? = null
    private var plies = 0
    private val notes = StillNotes()
    private var stuck: String? = null
    private val alarms = StillAlarm()
    private var covered: List<String> = emptyList()
    private val rate = FrameRate()

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        rate.saw(input.timestampMs)
        val gray = grayBoard(input.bgrDet)
        // Two gates the pull design did not need: the reading must lie inside the CURRENT rest
        // phase — one taken while the hand was over the board explains nothing — and it must have
        // been taken against the position we are still on, or a committed move lands a second time.
        val snap =
            gray?.let {
                if (phase.observe(it, input)) {
                    null
                } else {
                    pending?.takeIf { s -> s.seq > phase.lastMotionSeq && s.fen == position.fen }
                }
            }
        return when {
            gray == null -> notes.say("no board yet")
            snap == null -> if (phase.moving) notes.say("moving") else emptyList()
            !phase.due(input.timestampMs, gray) -> emptyList()
            else -> {
                pending = null
                explain(snap, gray, input)
            }
        }
    }

    /** Decides nothing: the newest reading wins, and [onFrame] says whether it is worth anything. */
    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        pending = snap
        return emptyList()
    }

    override fun apply(action: EngineAction): List<TrackerEvent> = StillActions(this).apply(action)

    override fun status(): TrackerStatus = StillStatus.of(this)

    override fun fen(): String = position.fen

    /**
     * The pull half of the method, and the reason it costs a few hundred readings instead of a few
     * thousand: a reading is only worth its inference when the board is at rest AND differs from
     * the last understood still image AND a hand has crossed since then. While a hand is over the
     * board, or while nothing has changed, the answer is no and the observer skips the work.
     */
    override fun wantsCnnRead(): Boolean = phase.wantsRead()

    private fun explain(
        snap: CnnSnapshot,
        gray: ByteArray,
        input: FrameInput,
    ): List<TrackerEvent> {
        val reading = Reading.of(snap) ?: return notes.say("the reading carries no probabilities")
        val model = explainer ?: MoveExplainer(reading.classes).also { explainer = it }
        val gate = config.pOccludedThr
        covered = reading.coveredSquares(gate)
        val verdict = model.explain(position, reading.rows, reading.coverage, gate)
        phase.read(input.timestampMs)
        return when (verdict) {
            Verdict.Unchanged -> {
                phase.settle(gray)
                stuck = null
                alarms.clear() + listOf(TrackerEvent.ReAnchored)
            }
            Verdict.Unclear -> {
                phase.smudge()
                unclear(snap, model, reading)
            }
            is Verdict.Moves -> commit(verdict, gray, input)
        }
    }

    private fun commit(
        verdict: Verdict.Moves,
        gray: ByteArray,
        input: FrameInput,
    ): List<TrackerEvent> {
        if (alarms.current != null) return notes.say("alarm latched — not committing")
        val ucis = verdict.moves.map(::uci)
        val sans = sansOf(position, verdict.moves)
        val before = position.fen
        verdict.moves.forEach { position.doMove(it) }
        plies += verdict.moves.size
        onDecision(StillDecision(input.timestampMs, plies, ucis, sans, before, position.fen, covered))
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

    private fun unclear(
        snap: CnnSnapshot,
        model: MoveExplainer,
        reading: Reading,
    ): List<TrackerEvent> {
        stuck = STUCK_UNCLEAR
        notes.set("reading does not explain the board")
        val conflicts = model.conflicts(position, reading.rows, reading.coverage, config.pOccludedThr)
        val raised = alarms.onUnclear(snap.seq, conflicts, covered.size, plies, config.desyncObsN)
        if (raised.isNotEmpty()) {
            // The invariant `StatusUiModel` relies on: a latched alarm always names a stuck reason.
            stuck = STUCK_NO_LEGAL_MOVE
            notes.set(alarms.describe())
        }
        return raised
    }

    internal fun snapshotState(): StillState =
        StillState(position.fen, notes.current, stuck, alarms.current, covered, rate.fps, phase.state())

    internal fun mutate(block: (Board) -> Unit): List<TrackerEvent> {
        block(position)
        explainer = null
        pending = null
        phase.reset()
        stuck = null
        return alarms.clear()
    }

    internal fun retune(next: TrackerConfig) {
        config = next
        // The pipeline's half of live tuning: same action, same thread, so no frame can see half
        // of a config change.
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
        const val DECIDER = "still_search"
        const val STUCK_UNCLEAR = "unclear_reading"
        const val STUCK_NO_LEGAL_MOVE = "no_legal_move"
    }
}

/**
 * What a commit tells the outside world.
 *
 * It becomes one [com.chesslab.engine.api.DebugDecision] per half-move, because that is what a
 * replay's scorer reads — not the event stream. A commit of three plies is three rows, numbered
 * in order, or the score sees one move where three were played.
 */
data class StillDecision(
    val timestampMs: Long,
    val plyAfter: Int,
    val ucis: List<String>,
    val sans: List<String>,
    val fenBefore: String,
    val fenAfter: String,
    val covered: List<String>,
) {
    fun rows(): List<DebugDecision> =
        ucis.indices.map { i ->
            DebugDecision(
                tsS = timestampMs / MS_PER_SECOND,
                ply = plyAfter - ucis.size + i + 1,
                uci = ucis[i],
                san = sans.getOrNull(i),
                fenBefore = if (i == 0) fenBefore else null,
                fenAfter = fenAfter,
                decider = "still_search",
                reason = "the board settled and only this continuation explains the reading",
                priorUsed = false,
                bestScore = 0.0,
                secondScore = 0.0,
                margin = 0.0,
                changed = emptyList(),
                changedVals = emptyList(),
                shadowVetoed = emptyList(),
                occludedVetoed = covered,
                gridCoverage = 0.0,
                zThr = 0.0,
                motion = 0.0,
                cnnRun = true,
                cnnAgreement = 0.0,
                cnnBestMove = null,
                stuckReason = null,
                verifyOutcome = null,
                accepted = true,
            )
        }

    private companion object {
        const val MS_PER_SECOND = 1000.0
    }
}

internal class StillState(
    val fen: String,
    val note: String,
    val stuck: String?,
    val alarm: TrackerEvent.Alarm?,
    val covered: List<String>,
    val fps: Double,
    val phase: String,
)
