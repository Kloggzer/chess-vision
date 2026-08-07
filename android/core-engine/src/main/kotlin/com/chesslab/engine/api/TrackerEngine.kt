package com.chesslab.engine.api

import com.chesslab.engine.ALARM_BOARD_RESTORED
import com.chesslab.engine.Candidate
import com.chesslab.engine.DECIDER_USER
import com.chesslab.engine.DecisionRecord
import com.chesslab.engine.EngineState
import com.chesslab.engine.FrameLoop
import com.chesslab.engine.FrameOutcome
import com.chesslab.engine.Game
import com.chesslab.engine.STATE_WAITING
import com.chesslab.engine.STUCK_NO_LEGAL_MOVE
import com.chesslab.engine.Squares
import com.chesslab.engine.VerifySingle
import com.chesslab.engine.ViableMoves
import com.chesslab.engine.applyTaints
import com.chesslab.engine.applyVetoes
import com.chesslab.engine.clearDesyncStreak
import com.chesslab.engine.clearStuck
import com.chesslab.engine.cnnTick
import com.chesslab.engine.commitMove
import com.chesslab.engine.computeEvidence
import com.chesslab.engine.debugPayload
import com.chesslab.engine.desyncEvidence
import com.chesslab.engine.detectGuards
import com.chesslab.engine.dispatch
import com.chesslab.engine.flushSessionCapture
import com.chesslab.engine.generateHypothesis
import com.chesslab.engine.learnNoise
import com.chesslab.engine.legalMoveFor
import com.chesslab.engine.markStuck
import com.chesslab.engine.moveTouchedMask
import com.chesslab.engine.pyFixed
import com.chesslab.engine.recordRejection
import com.chesslab.engine.san
import com.chesslab.engine.scoreViableMoves
import com.chesslab.engine.setRef
import com.chesslab.engine.sortedSquareNames
import com.chesslab.engine.squareNames
import com.chesslab.engine.takeBack
import com.chesslab.engine.topChangedVals
import com.chesslab.engine.uciOf
import com.chesslab.engine.with

/** Standard chess starting position (FEN). */
const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** `_mark_stuck("occluded")` — the occlusion latch blocks the quiet re-anchor. */
private const val STUCK_OCCLUDED = "occluded"

/**
 * `_mark_stuck("cnn_desync")` — the Bxc3 guard.
 *
 * `private` again: it was widened to `internal` for one `assertNotEquals` in `AnomalyPatcherTest`
 * that could not fail, and the single production reference is [tryDetect] in this file.
 */
private const val STUCK_CNN_DESYNC = "cnn_desync"

private const val NOTE_WAITING_OCCLUDED = "waiting for occluded squares to clear…"

private const val NOTE_CANNOT_ANCHOR = "ILLEGAL MOVE? board cannot be anchored to game state"

/** `n_touched` of a move with no observed candidate. */
private const val TOUCHED_FALLBACK = 2

/** The re-anchor floor is scaled by `n_touched / 2`. */
private const val TOUCHED_BASE = 2.0

/** `(time.time() - snap.ts) < 5.0` — the cnn_desync veto's freshness window. */
private const val DESYNC_MAX_AGE_S = 5.0

private const val MS_PER_S = 1000.0

/** `_clear_alarm` provenance reasons. */
private const val ALARM_ACCEPTED = "illegal_move_accepted"

private const val ALARM_UNDONE = "illegal_move_undone"

private val PROMO_PIECES = setOf('q', 'r', 'b', 'n')

private const val NOTE_NO_CNN_IDENTITY = "no CNN observation with piece identity — use Undo or a FEN resync"

private const val NOTE_CNN_KINGS = "CNN position has missing/extra kings — use Undo or a FEN resync"

/** The empty slot of the rebuilt placement — `' '` is not a FEN piece symbol. */
private const val EMPTY_SQUARE = ' '

/**
 * What the user is told an undo took back. "last move undone" after a four-ply recovery would be
 * the same understatement the button used to make, on the screen where it is easiest to miss.
 */
private fun undoneNote(plies: Int): String =
    if (plies == 1) {
        "last move undone (logged as bad example)"
    } else {
        "last $plies moves undone — they were committed as one (logged as bad examples)"
    }

private const val PIECE_TYPES = "PNBRQK"

/** FEN field indices of the two clocks (`placement side castling ep halfmove fullmove`). */
private const val FEN_HALFMOVE = 4

private const val FEN_FULLMOVE = 5

/**
 * The public entry point of `:core-engine` — the whole per-frame state machine.
 *
 * It is a pure state machine driven by exactly ONE thread: no `synchronized`, no `Atomic*`,
 * no `Mutex`, no `@Volatile` may ever appear in this module (see `ClasspathPurityTest`), and no
 * wall clock either — the engine's time is [FrameInput.timestampMs].
 *
 * The signatures are frozen by phase 00a; a change requires a discrepancy note in
 * `specs/17-android-rewrite/STATUS.md` first.
 */
class TrackerEngine(
    config: TrackerConfig,
    startFen: String = STARTPOS,
    /**
     * Every decision — committed OR rejected — the moment it is made.
     *
     * Default no-op, so tests and the clip harness stay silent. `:app` points it at logcat and at
     * the diagnostics file. The engine cannot import Android and cannot read a clock, so this is
     * the only way a decision leaves the module; the sink is called on the engine's own thread and
     * must not block.
     *
     * It carries the [DebugDecision], not a rendered line: a consumer that wants to count
     * rejections by reason, or pull every row of one ply, would otherwise have to re-parse a
     * sentence written to be read. `toLogLine` renders it at whichever edge wants prose.
     *
     * It exists because on 2026-08-01 a live board sat in a mismatch cycle on a legitimate `Qxd4`
     * and the question "did the deterministic path see d4 change at all?" could not be answered:
     * the app emitted three log tags, none of them the engine's, and the decision rows lived only
     * in a 64-entry in-memory ring behind an off-by-default debug switch.
     */
    private val decisionSink: (DebugDecision) -> Unit = {},
) {
    internal val state = EngineState(config, startFen, decisionSink = decisionSink)

    private val loop = FrameLoop(state) { cur, curBgr -> state.setRef(cur, curBgr) }

    /**
     * The whole per-frame loop plus `_try_detect`.
     *
     * `Stuck` and `Note` are emitted only on a CHANGE (Python rewrites both every frame; one event
     * per frame would be pure spam on a bus that phase 06 turns into UI).
     */
    fun onFrame(input: FrameInput): List<TrackerEvent> {
        val noteBefore = state.note
        val stuckBefore = state.stuckReason
        val events = mutableListOf<TrackerEvent>()
        // `avgFrames` and `confirmFrames` are CNN-conditional, and `cnnOn` has a third input the two
        // call sites below do not cover: `cnnFailed`. This used to say "which the verify path raises
        // mid-game" — nothing raises it (see `EngineState.cnnFailed`), so these two calls are
        // currently defensive rather than load-bearing. One integer comparison per frame is the
        // price of them staying correct if it ever is raised.
        state.syncAvgWindow()
        state.syncConfirmWindow()
        val outcome = loop.step(input)
        if (outcome is FrameOutcome.Detect) {
            events += state.tryDetect(outcome.cur, outcome.curBgr, outcome.seq, cnn)
        }
        val stuck = state.stuckReason
        if (stuck != null && stuck != stuckBefore) events += TrackerEvent.Stuck(stuck)
        val note = state.note
        if (note != null && note != noteBefore) events += TrackerEvent.Note(note)
        return events
    }

    private var cnn: CnnEvaluator? = null

    /**
     * Inject the evaluator behind the observation model. `:core-engine` may not depend on
     * `:core-cnn`, so `:app` (which owns the ONNX classifier) hands it in here.
     *
     * `null` is the CNN-unavailable case — the model is missing or broke — which the verify path
     * resolves by committing the pending candidate rather than stalling. Attaching also arms
     * `cnn_run`, i.e. it is what makes the detection pipeline queue candidates for verification
     * instead of committing them straight from the diff.
     */
    fun attachCnn(evaluator: CnnEvaluator?) {
        cnn = evaluator
        state.cnnRun = evaluator != null
        // Attaching flips `cnnOn`, and `avgFrames` is CNN-conditional (2 with, 3 without).
        state.syncAvgWindow()
        state.syncConfirmWindow()
    }

    /**
     * Observer results (`_cnn_worker`). Storing the snapshot is `_observe_snapshot`; the taint
     * filter reads it from there.
     *
     * A pending candidate has **priority** over the periodic check — that is what makes the
     * pre-commit ghost filter responsive. `VerifySingle` forks to the pair ladder internally.
     */
    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        state.cnnSnap = snap
        state.cnnSnapsSeen += 1
        return if (state.pending != null) {
            state.cnnSnapsToVerify += 1
            VerifySingle.tick(state, cnn, snap)
        } else {
            state.cnnTick(cnn, snap)
        }
    }

    private var debugEnabled = false

    /**
     * Arm the extra [TrackerStatus.debug] payload (07b's debug screen).
     *
     * Off by default and off again the moment the screen closes: assembling the payload walks 64
     * squares twice and copies the decision ring on every published frame, and the 15 fps budget
     * is not negotiable. The decision log itself is recorded either way — it is appended at most
     * once per move, not per frame.
     */
    fun setDebugEnabled(on: Boolean) {
        debugEnabled = on
    }

    /** Immutable UI snapshot; the debug screen is a pure function of it. */
    fun status(): TrackerStatus = state.toStatus(debugEnabled)

    /**
     * The game FEN alone — [status] without the 64-square maps.
     *
     * The CNN observer reads this per frame as its discard-on-change guard; the rest of the
     * snapshot is sampled at the UI's rate and must not be built at the analyzer's.
     */
    fun fen(): String = state.board.fen()

    /**
     * `undo` — the undone move was WRONG, so it is a user correction: the alarm latch is released
     * and the decision rows of the undone plies are dropped.
     *
     * It takes back the LAST COMMIT, whatever its size. A CNN recovery is committed as a unit — four
     * plies in one commit in the live game of 2026-08-02 — and used to come back one press at a
     * time, with nothing anywhere saying how many presses were left and each press clearing the
     * reference and the alarm again, so the state after one press was not the state before the
     * sequence. That asymmetry is the whole of the user's "no way back".
     *
     * The record is of the LAST commit only, and it is cleared here, so a second press unwinds one
     * ordinary move. That is right: anything older is a normal move, not a bridge.
     *
     * Everything that resets on an undo — the reference, the alarm, the decision-log trim — runs
     * ONCE, not once per popped ply. The trim needs nothing special for a multi-ply undo: it drops
     * every row whose `ply` exceeds the restored history size, which is exactly the per-move rows a
     * recovery writes.
     *
     * It also RECORDS the line it took back ([EngineState.takenBack]). Popping alone was not a way
     * back: on 2026-08-02 the CNN recovery re-derived and re-committed the identical three-move
     * bridge after every press, because an undo moves the app's position and the board it reads is
     * unchanged. The record is the only thing in the engine that remembers a human rejection.
     */
    fun undo(): List<TrackerEvent> {
        if (state.history.isNotEmpty()) {
            // Bounded by the history: a count left over from before a `setFen` must never pop past
            // the moves this board actually holds.
            val plies = state.lastCommitSize.coerceIn(1, state.history.size)
            state.takeBack(plies)
            state.lastCommitSize = 0
            state.lastMove = null
            state.clearReferenceState()
            state.recoveredLast = false
            state.priorLast = false
            while (state.decisionLog.isNotEmpty() && state.decisionLog.last().ply > state.history.size) {
                state.decisionLog.removeAt(state.decisionLog.size - 1)
            }
            state.pendingCapture = null
            state.note = undoneNote(plies)
        }
        // AFTER the trim, not before. The alarm's `decider = "user"` row is stamped with the
        // current `history.size`, and the trim drops every row above the restored size — so
        // written first, the one row that remembers a human rejection was deleted by the same
        // call that wrote it, every time. Stamped after, its ply and `fenAfter` describe the
        // position the user restored, which is what the row means.
        return state.clearAlarm(ALARM_UNDONE)
    }

    /** `reset_to_start()` — start position plus "I just set up this position". */
    fun resetToStart(): List<TrackerEvent> = setFen(STARTPOS)

    /** `reset_to_start(fen)`. */
    fun setFen(fen: String): List<TrackerEvent> {
        state.board = Game(fen)
        state.history.clear()
        state.lastMove = null
        state.clearReferenceState()
        state.pendingCapture = null
        state.recoveredLast = false
        state.priorLast = false
        state.cnnStatus = null
        state.cnnConflicts = emptyList()
        state.holdUntil = 0.0
        state.refGamut = null
        state.decisionLog.clear()
        state.motionSinceRef = false
        state.lastMotionTs = 0.0
        state.lastCnnTs = 0.0
        state.occlGridActive = false
        state.gridCoverage = 1.0
        // The position is redefined, so the line the take-back veto is pinned to no longer exists.
        state.takenBack = null
        state.note = "Reference set"
        // The user accepted reality by resyncing — release the illegal-move latch (invariant 9).
        return state.clearAlarm(ALARM_ACCEPTED)
    }

    /**
     * `capture_baseline` — "the physical board matches the shown FEN, refresh the visual
     * reference". The FEN is trusted; `holdUntil` is zeroed because this is a deliberate user
     * action, not a post-motion settle.
     */
    fun captureBaseline(): List<TrackerEvent> {
        state.clearReferenceState()
        state.holdUntil = 0.0
        // "The board matches the shown FEN" contradicts the premise of the take-back veto, and this
        // is the button the veto's own note points at when a legitimate bridge was undone by mistake.
        state.takenBack = null
        val events = state.clearAlarm(ALARM_ACCEPTED)
        state.note = "Baseline: re-capturing reference from the next clear frame…"
        return events
    }

    /** `choose_promotion` — the Q/R/B/N answer for a pending promotion. */
    fun choosePromotion(piece: Char): List<TrackerEvent> {
        val symbol = piece.lowercaseChar()
        val pending = state.promoPending
        val move =
            if (pending == null || symbol !in PROMO_PIECES) {
                null
            } else {
                state.legalMoveFor("${pending.from}${pending.to}$symbol")
            }
        return when {
            symbol !in PROMO_PIECES -> listOf(TrackerEvent.Note("invalid piece: '$piece' (q/r/b/n)"))
            pending == null -> listOf(TrackerEvent.Note("no promotion pending"))
            state.board.fen() != pending.fen -> {
                state.promoPending = null
                listOf(TrackerEvent.Note("Position has changed"))
            }
            move == null -> listOf(TrackerEvent.Note("${pending.from}${pending.to}$symbol is not legal"))
            else -> {
                state.promoPending = null
                listOf(state.commitMove(move, pending.cur, pending.curBgr))
            }
        }
    }

    /**
     * `accept_cnn_position` — the illegal-move alarm's "adopt what the CNN sees" correction.
     *
     * A **minimal edit**, not a blind FEN rebuild: only label-confident squares take the observed
     * piece, everything unsure or occluded keeps the game-state piece, because identity precision
     * is the model's weak axis. Side to move survives, castling rights are pruned to what the
     * rebuilt position still supports, and the history is dropped — an illegal move broke game
     * continuity by definition, so the ply numbering is fiction from here on.
     *
     * An observation without both kings is REJECTED rather than adopted: it is a misread, and a
     * kingless position would make every later legality check meaningless.
     */
    fun acceptCnnPosition(): List<TrackerEvent> {
        val obs = state.cnnSnap?.obs?.takeIf { o -> Squares.ALL.any { o.label(it) != null } }
        val fen = obs?.let { state.cnnAdoptedFen(it, cnn?.confThr ?: state.config.cnnConfThr) }
        if (fen == null) {
            val why = if (obs == null) NOTE_NO_CNN_IDENTITY else NOTE_CNN_KINGS
            state.note = why
            return listOf(TrackerEvent.Note(why))
        }
        // setFen clears the history and the latch (logging `illegal_move_accepted`);
        // captureBaseline re-captures the visual reference for the adopted position.
        val events = setFen(fen) + captureBaseline()
        state.note = "CNN position adopted — alarm cleared, re-capturing reference…"
        return events
    }

    /**
     * Live tuning. Mirrors `app.py`'s `_live_tuning_kwargs` side effects: the averaging buffers and
     * the confirmers are rebuilt when their length changed, and the cached square boxes follow
     * `detSize` / `overhang`. It must NOT touch the reference.
     */
    fun updateConfig(config: TrackerConfig) {
        val previous = state.config
        state.config = config
        // Against the window the buffers are ACTUALLY sized for, not against `previous.avgFrames`
        // with the new `cnnOn` substituted into both sides: that comparison cancelled out whenever
        // the config change was the one that flipped `cnnOn` (`cnnVerify`), so turning CNN verify
        // off left the buffers on the with-CNN window.
        state.syncAvgWindow()
        // Same correction, same reason: the old guard compared
        // `config.confirmFrames(cnnOn)` against `previous.confirmFrames(cnnOn)` with the NEW
        // `cnnOn` on both sides, so it was false exactly when the change was the one that moved
        // the window.
        state.syncConfirmWindow()
        if (config.detSize != previous.detSize || config.overhang != previous.overhang) {
            state.rebuildBoxes()
        }
    }
}

/**
 * `_try_detect` — the ordered detection pipeline. The order IS the contract; every candidate kind
 * (single, pair, endpoint) passes the same steps 6b -> 9.
 *
 * 1. guards, 2. evidence + taints, 3. vetoes, 4. noise learning, 5. scoring + quiet/re-anchor,
 * 6. hypothesis, 6b. absolute LL floor, 7. motion gate, 8. confirmer, 9. dispatch.
 */
internal fun EngineState.tryDetect(
    cur: GrayImage,
    curBgr: BgrImage?,
    seq: Long,
    cnn: CnnEvaluator? = null,
): List<TrackerEvent> {
    if (!detectGuards()) return emptyList()
    // 2. Evidence — every gate and the LL scoring operate on the SAME fused z (`lastZ`).
    computeEvidence(cur)
    applyTaints()
    var hot = 0L
    for (i in 0 until Squares.COUNT) {
        if (lastZ[i] >= config.zThr) hot = hot.with(i)
    }
    changedVals = topChangedVals(lastZ, config.zThr)
    // 3. Vetoes (shadow keeps z as vacate evidence; occlusion zeroed it in step 2).
    applyVetoes(cur, curBgr, hot)
    // 4. Noise learning on the post-veto sets, on EVERY stable frame — even while stuck.
    learnNoise()
    // 5. LL scoring + viability filter, then the quiet/re-anchor branch.
    val moves = scoreViableMoves(lastZ)
    val events = mutableListOf<TrackerEvent>()
    val promoBefore = promoPending
    if (!(changed == 0L && quietOutcome(moves, cur, curBgr, events, cnn))) {
        // 6. Hypothesis — the ONE place that turns evidence into a candidate.
        val cand = generateHypothesis(lastZ, moves, cur, curBgr)
        if (cand != null && commitGates(cand)) {
            anomalySince = 0L
            events += dispatch(cand.moves, cur, curBgr, cand.priorUsed, cand.note, seq)
        }
    }
    val promo = promoPending
    if (promo != null && promo !== promoBefore) events += TrackerEvent.PromotionPending(promo.from, promo.to)
    return events
}

/**
 * Step 5's quiet branch — nothing changed, so either pull the reference forward or refuse to.
 * Returns `true` when the frame is HANDLED (no hypothesis this frame).
 *
 * The re-anchor floor scales with the number of physically touched squares: castling (4) gets
 * `-8.0`, so weak-but-equal per-square evidence does not penalise it against a normal move (2).
 *
 * The three bail-outs are ORDERED and each one exists because of a specific incident:
 * 1. an occlusion latch would bake the hand into the reference;
 * 2. an illegal position must NEVER become base truth (invariant 9);
 * 3. the CNN desync veto (Bxc3, 2026-07-21) — a real move whose commit was rejected leaves the
 *    board physically ahead of the game state, and re-anchoring would make that desync silent and
 *    permanent. `desyncEvidence` bounds that hold: it escalates to the alarm rather than waiting
 *    on a recovery that, when the CNN is merely wrong, has no legal move to offer.
 */
internal fun EngineState.quietOutcome(
    moves: ViableMoves,
    cur: GrayImage,
    curBgr: BgrImage?,
    events: MutableList<TrackerEvent>,
    cnn: CnnEvaluator? = null,
): Boolean {
    val obsMove = moves.obsMove
    val nTouched = if (obsMove == null) TOUCHED_FALLBACK else moveTouchedMask(board, obsMove).countOneBits()
    val scaledFloor = config.reanchorLlFloor * (nTouched / TOUCHED_BASE)
    var handled = true
    if (obsMove == null || moves.best < scaledFloor) {
        val desync = cnnDesync()
        when {
            tainted != 0L -> {
                markStuck(STUCK_OCCLUDED)
                note = NOTE_WAITING_OCCLUDED
            }
            alarm != null -> {
                markStuck(STUCK_NO_LEGAL_MOVE)
                note = NOTE_CANNOT_ANCHOR
            }
            desync != null -> {
                markStuck(STUCK_CNN_DESYNC)
                events += desyncEvidence(cnn, desync.snap, desync.conflicts)
            }
            else -> {
                // The only verifiably CLEAN moment: re-anchor AND run the deferred jobs (the gamut
                // rebuild inside setRef, the session photo). `fromCommit = false` — invariant 6.
                confirmer.reset()
                clearStuck()
                anomalySince = 0L
                setRef(cur, curBgr)
                if (tainted == 0L) flushSessionCapture()
                events += TrackerEvent.ReAnchored
            }
        }
    } else if (moves.best < 0.0) {
        // Weak but move-consistent evidence (white-on-white?) → KEEP the reference: neither
        // re-anchor nor stuck, and the confirmer keeps collecting.
        note = "weak move evidence (${board.san(obsMove)}?) — waiting"
    } else {
        handled = false
    }
    return handled
}

/**
 * The confident OCCUPANCY conflicts between a fresh observation and the believed position.
 * Occupancy is the reliable axis: "b4 confidently EMPTY while a bishop is believed there" is a
 * desync, a misread piece TYPE is not.
 *
 * `snap.obs is None` is unreachable here — the frozen seam declares `CnnSnapshot.obs` non-null
 * (same finding as STATUS D03b-2).
 */
private fun EngineState.cnnDesync(): Desync? {
    val snap = cnnSnap ?: return null
    if (snap.fen != board.fen() || nowS - snap.tsMs / MS_PER_S >= DESYNC_MAX_AGE_S) return null
    val thr = config.cnnConfThr
    var conflicts = 0L
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        val believed = board.pieceCharAt(i) != null
        if (snap.obs.confident(square, thr) && snap.obs.occupied(square) != believed) {
            conflicts = conflicts.with(i)
        }
    }
    return if (conflicts == 0L) null else Desync(snap, conflicts.squareNames())
}

/** The observation that vetoed the re-anchor, and the squares it vetoed on. */
private class Desync(
    val snap: CnnSnapshot,
    val conflicts: List<String>,
)

/**
 * Steps 6b, 7 and 8 — the three gates between a candidate and dispatch. `true` = commit it.
 *
 * - **6b, absolute LL floor**: a sole-viable candidate has an infinite margin, so a weak phantom
 *   (`f6h5 @ 0.44` swallowed a live castle) sails through every margin check. Endpoint candidates
 *   (`vote = false`) stay exempt — they are CNN-verified by design.
 * - **7, motion gate**: a real move is always preceded by a hand, and it becomes visible within
 *   seconds of the hand leaving. BOTH conditions are needed — `motionSinceRef` alone was armed
 *   forever by a single wobble spike.
 * - **8, confirmer**: the same candidate over N stable frames. The endpoint candidate skips the
 *   vote; the CNN verify IS its multi-frame confirmation.
 */
internal fun EngineState.commitGates(cand: Candidate): Boolean {
    val sans = board.sanSequence(cand.moves).joinToString(" + ")
    val key = cand.moves.joinToString(" ") { uciOf(it) }
    var pass = true
    if (cand.vote && config.commitLlFloor > 0 && bestScore < config.commitLlFloor) {
        confirmer.reset()
        note =
            "$sans? evidence too weak (${pyFixed(bestScore, 2)} < ${pyFixed(config.commitLlFloor, 1)}) — " +
            "not committing"
        recordRejection(key, note.orEmpty())
        pass = false
    }
    if (pass && config.requireMotionForMove) {
        val age = nowS - lastMotionTs
        // `motionRecencyS <= 0` is OFF — no recency limit — the way 0 means off for every other
        // knob in the catalog (`censusZWeight`, `minGridLineCoverage`, `occlusionColorThr`,
        // `commitLlFloor`, `observerIntervalS`). Read literally it meant `age > 0`, i.e. reject
        // EVERY candidate: by the time one exists the hand is long gone (settle frames plus
        // `motionHoldS`), so the age is never zero. Found live on 2026-08-01 — the device had it at
        // 0.0 and the deterministic channel had not committed a single move in the whole session,
        // every one of them waiting out the 10 s CNN recovery poll instead.
        val stale = config.motionRecencyS > 0.0 && age > config.motionRecencyS
        if (!motionSinceRef || stale) {
            confirmer.reset()
            val why = if (!motionSinceRef) "no motion since last move" else "last motion ${pyFixed(age, 0)}s ago"
            note = "$sans? ignored — $why (drift/light, not a real move)"
            recordRejection(key, note.orEmpty())
            pass = false
        }
    }
    if (pass) {
        candidateUci = key
        if (cand.vote && !confirmer.feed(key)) {
            note = "detecting $sans… (${confirmer.count}/$confirmFrames)"
            pass = false
        }
    }
    return pass
}

/**
 * The immutable UI snapshot (`status()`), a pure function of the state. This is the ONE place that
 * turns the engine's bitboards and 64-element arrays into the square-name maps the UI wants.
 */
internal fun EngineState.toStatus(debugEnabled: Boolean = false): TrackerStatus =
    TrackerStatus(
        state = state,
        fen = board.fen(),
        z = squareValueMap(lastZ),
        diffs = squareValueMap(lastDiffs),
        census = lastCens?.let { squareValueMap(it) } ?: emptyMap(),
        changed = changed.sortedSquareNames().toSet(),
        shadowVetoed = shadowVetoed.sortedSquareNames().toSet(),
        occlusionVetoed = occludedVetoed.sortedSquareNames().toSet(),
        // The same computation the re-anchor veto uses, surfaced instead of only counted.
        cnnConflicts = cnnDesync()?.conflicts?.toSet() ?: emptySet(),
        bestLl = bestScore,
        secondLl = secondScore,
        bestUci = candidateUci,
        stuckReason = stuckReason,
        alarm = alarm,
        confirmerKey = confirmer.key,
        confirmerCount = confirmer.count,
        verifyState = verifyState,
        pendingUci = pending?.ucis?.joinToString(" "),
        pendingFrames = pending?.frames ?: 0,
        stageTimingsMs = stageTimingsMs.toMap(),
        fps = fps,
        note = note,
        debug = if (debugEnabled) debugPayload() else null,
    )

/**
 * The visual state every user-correction path drops: base truth, the averaging buffers, the
 * confirmer, the stuck marker, the occlusion latch and the anomaly timers.
 *
 * It is deliberately the INTERSECTION of `reset_to_start`, `capture_baseline` and `undo` — each
 * caller adds its own remainder, so no path clears more than Python does.
 */
internal fun EngineState.clearReferenceState() {
    refGray = null
    refBgr = null
    refFen = null
    confirmer.reset()
    grayBuf.clear()
    bgrBuf.clear()
    clearStuck()
    tainted = 0L
    occlWhitelist = 0L
    occludedSince = null
    shadowVetoed = 0L
    shadowBlocked.clear()
    occludedVetoed = 0L
    motionOccluded = 0L
    occlusionExpiry.fill(0.0)
    occlCoreExpiry.fill(0.0)
    anomalySince = 0L
    cnnSnap = null
    pending = null
    promoPending = null
    verifyState = null
    state = STATE_WAITING
}

/**
 * The FEN of the position `accept_cnn_position` would adopt, or `null` when the result has no
 * clean pair of kings. Nothing is mutated here — the caller decides whether to adopt it.
 */
private fun EngineState.cnnAdoptedFen(
    obs: CnnObservation,
    thr: Double,
): String? {
    val pieces = CharArray(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        val square = Squares.ALL[i]
        val believed = board.pieceCharAt(i) ?: EMPTY_SQUARE
        val label = if (obs.labelConfident(square, thr)) obs.label(square) else null
        // An unreadable label ("occluded") is not an observation of an empty square.
        pieces[i] = if (label == null) believed else pieceCharOf(label) ?: believed
    }
    if (pieces.count { it == 'K' } != 1 || pieces.count { it == 'k' } != 1) return null
    // Side to move and the clocks are carried over; the en-passant target is dropped, because the
    // adopted position has no move that could have created it.
    val fields = board.fen().split(' ')
    val clocks = "${fields[FEN_HALFMOVE]} ${fields[FEN_FULLMOVE]}"
    return "${placementOf(pieces)} ${fields[1]} ${castlingOf(pieces, fields[2])} - $clocks"
}

/** `config.label_from_piece` inverted; `"empty"` and `"occluded"` are not pieces. */
private fun pieceCharOf(label: String): Char? {
    if (label.length != 2) return EMPTY_SQUARE.takeIf { label == "empty" }
    val type = label[1].uppercaseChar()
    return when {
        type !in PIECE_TYPES -> null
        label[0] == 'w' -> type
        label[0] == 'b' -> type.lowercaseChar()
        else -> null
    }
}

/** The placement field, rank 8 down to rank 1 — [Squares.ALL] runs the other way. */
private fun placementOf(pieces: CharArray): String = (Squares.N - 1 downTo 0).joinToString("/") { rankOf(pieces, it) }

private fun rankOf(
    pieces: CharArray,
    rank: Int,
): String {
    val out = StringBuilder()
    var run = 0
    for (file in 0 until Squares.N) {
        val piece = pieces[rank * Squares.N + file]
        if (piece == EMPTY_SQUARE) {
            run += 1
            continue
        }
        if (run > 0) out.append(run)
        run = 0
        out.append(piece)
    }
    if (run > 0) out.append(run)
    return out.toString()
}

/** `clean_castling_rights` — a right survives only if its king AND its rook are still at home. */
private fun castlingOf(
    pieces: CharArray,
    current: String,
): String {
    val at = { square: String -> pieces[Squares.index(square)] }
    val out = StringBuilder()
    if ('K' in current && at("e1") == 'K' && at("h1") == 'R') out.append('K')
    if ('Q' in current && at("e1") == 'K' && at("a1") == 'R') out.append('Q')
    if ('k' in current && at("e8") == 'k' && at("h8") == 'r') out.append('k')
    if ('q' in current && at("e8") == 'k' && at("a8") == 'r') out.append('q')
    return if (out.isEmpty()) "-" else out.toString()
}

/** A `Squares.ALL`-keyed view of a 64-value channel — built for the UI, never for the engine. */
private fun squareValueMap(values: DoubleArray): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        out[Squares.ALL[i]] = values[i]
    }
    return out
}

/**
 * `_clear_alarm` — the ONLY release of the illegal-move latch, and the list of callers is closed:
 * `undo`, `resetToStart` / `setFen`, `captureBaseline`, `acceptCnnPosition` (all with a
 * [logReason]), plus the two VERIFIED restores in `cnnTick` — a `matchOk` observation and a
 * recovery sequence that resolves every conflict square (both `null`).
 *
 * **entry.md invariant 9:** nothing in the detection pipeline may call this; the alarm does not
 * heal by EMA drift, by timeout, or by "it looks fine now".
 *
 * A [logReason] marks a user correction, whose discontinuity lands in the decision log with
 * `decider = "user"`; the verified restores leave no row because no user acted. Either way the
 * emitted reason is why the latch went, never the kind of alarm it was.
 */
internal fun EngineState.clearAlarm(logReason: String?): List<TrackerEvent> {
    if (alarm == null) return emptyList()
    alarm = null
    alarmSince = 0.0
    clearDesyncStreak()
    if (logReason == null) return listOf(TrackerEvent.AlarmCleared(ALARM_BOARD_RESTORED))
    decisionLog.add(
        DecisionRecord(
            tsS = nowS,
            ply = history.size,
            move = null,
            san = null,
            fenBefore = null,
            fenAfter = board.fen(),
            decider = DECIDER_USER,
            reason = logReason,
            priorUsed = false,
            bestScore = bestScore,
            secondScore = secondScore,
            margin = bestScore - secondScore,
            changed = changed.sortedSquareNames(),
            changedVals = changedVals.toList(),
            shadowVetoed = shadowVetoed.sortedSquareNames(),
            occludedVetoed = occludedVetoed.sortedSquareNames(),
            gridCoverage = gridCoverage,
            zThr = config.zThr,
            motion = motion,
            cnnRun = cnnRun,
            cnnAgreement = cnnAgreement,
            cnnReadsTaken = cnnReadsTaken,
            cnnReadsStale = cnnReadsStale,
            cnnSnaps = cnnSnapsSeen,
            cnnSnapsToVerify = cnnSnapsToVerify,
            cnnSnapsNoEvaluator = cnnSnapsNoEvaluator,
            cnnSnapsNotDue = cnnSnapsNotDue,
            cnnBestMove = cnnBestMove,
        ),
    )
    return listOf(TrackerEvent.AlarmCleared(logReason))
}
