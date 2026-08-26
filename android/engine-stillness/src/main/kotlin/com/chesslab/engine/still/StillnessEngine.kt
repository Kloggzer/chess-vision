package com.chesslab.engine.still

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DebugDecision
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
    /**
     * Why a reading was refused, one line per reading. Not gated on a debug switch and not per
     * frame — it fires only where the engine actually decides, and the session that needs it is
     * always the one nobody armed a flag for.
     */
    private val onTrace: (String) -> Unit = {},
    private val onDecision: (StillDecision) -> Unit = {},
) : EngineOps {
    private val position = Board().apply { loadFromFen(startFen) }
    private val phase = StillPhase()
    private var explainer: MoveExplainer? = null
    private var pending: CnnSnapshot? = null
    private var plies = 0
    private val notes = StillNotes { onTrace("note: $it") }
    private var stuck: String? = null
    private val alarms = StillAlarm()
    private val blind = BlindSquares()
    private var covered: List<String> = emptyList()

    /** The same de-bounce as [notes], for the gate: a frame that ends there writes nothing else. */
    private val gateLine = StillNotes { onTrace("gate: $it") }
    private val rate = FrameRate()

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        rate.saw(input.timestampMs)
        // The board straight from the frame where the host offers it: `bgrDet` is already a
        // resample, and the thresholds below are grey levels that a second one flattens.
        val gray = grayBoard(input.board?.invoke(BOARD_PX) ?: input.bgrDet) ?: return notes.say("no board yet")
        val moving = phase.observe(gray, input)
        val snap = pending
        // Each of these ends the frame in silence, and from outside a stall looked the same
        // whichever one it was — so they are named, and the name is what reaches the log.
        // Two of them the pull design did not need: a reading taken while the hand was over the
        // board explains nothing, and one taken against a position we have left would land its
        // move a second time.
        val blocked =
            when {
                moving -> "moving"
                snap == null -> "no reading has arrived"
                snap.seq <= phase.lastMotionSeq -> "the reading is older than the last motion"
                snap.fen != position.fen -> "the reading was taken of another position"
                !phase.due(input.timestampMs, gray) -> "nothing new to read"
                else -> null
            }
        gateLine.set("${blocked ?: "open"} · ${phase.debug()}")
        if (blocked != null || snap == null) return if (moving) notes.say("moving") else emptyList()
        pending = null
        return explain(snap, gray, input)
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
        val model = explainer ?: MoveExplainer(reading.classes, onTrace).also { explainer = it }
        val gate = config.pOccludedThr
        // A square this camera never reads right carries no evidence, or the search keeps trying to
        // explain it as a move. It is NOT covered, though — see `Reading.blind`.
        reading.hide(blind.known())
        covered = reading.coveredSquares(gate)
        val verdict = model.explain(position, reading, gate)
        phase.read(input.timestampMs)
        onTrace("verdict=${verdict.javaClass.simpleName} blind=${blind.known().sorted()} covered=$covered")
        return when (verdict) {
            Verdict.Unchanged -> {
                phase.settle(gray)
                stuck = null
                blind.sawExplained(model.conflicts(position, reading, gate))
                alarms.clear() + listOf(TrackerEvent.ReAnchored)
            }
            Verdict.Unclear -> {
                phase.smudge()
                unclear(snap, model, reading)
            }
            is Verdict.Moves -> commit(verdict, gray, input, model, reading)
        }
    }

    private fun commit(
        verdict: Verdict.Moves,
        gray: ByteArray,
        input: FrameInput,
        model: MoveExplainer,
        reading: Reading,
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
        // Against the position we just moved INTO: what still disagrees there explained nothing.
        blind.sawExplained(model.conflicts(position, reading, config.pOccludedThr))
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
        // Blind squares are not evidence of a wrong board, they are evidence of a bad view.
        val conflicts = model.conflicts(position, reading, config.pOccludedThr)
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
        blind.forget()
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
