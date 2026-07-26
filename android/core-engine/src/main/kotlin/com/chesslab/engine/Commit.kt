package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** `_DECIDER_REASON` keys — the vocabulary is FIXED. */
internal const val DECIDER_DIFF = "diff"

internal const val DECIDER_DIFF_PAIR = "diff_pair"

internal const val DECIDER_CNN_PAIR = "cnn_pair"

internal const val DECIDER_CNN_OCCUPANCY = "cnn_occupancy"

internal const val DECIDER_CNN_OVERRULE = "cnn_overrule"

internal const val DECIDER_DIFF_AFTER_VERIFY = "diff_after_verify"

internal const val DECIDER_CNN_RECOVERY = "cnn_recovery"

internal const val DECIDER_CNN_RESYNC = "cnn_resync"

/** The user-correction row of the decision log (`_clear_alarm`). */
internal const val DECIDER_USER = "user"

/**
 * `_DECIDER_REASON` verbatim. Phase 07's debug screen and the `track-feedback` ingest read these
 * strings, so they are part of the contract, not prose.
 */
internal val DECIDER_REASON: Map<String, String> =
    mapOf(
        DECIDER_DIFF to "frame-diff (no CNN verify)",
        DECIDER_DIFF_PAIR to "frame-diff double move (fast play, no CNN verify)",
        DECIDER_CNN_PAIR to "CNN occupancy confirmed double move (fast play)",
        DECIDER_CNN_OCCUPANCY to "CNN occupancy confirmed",
        DECIDER_CNN_OVERRULE to "CNN overruled the diff move",
        DECIDER_DIFF_AFTER_VERIFY to "diff accepted (CNN uncertain, clear view)",
        DECIDER_CNN_RECOVERY to "CNN recovery (diff was stuck)",
        DECIDER_CNN_RESYNC to "manual CNN resync",
    )

/** `" + prior tie-break"`. */
private const val PRIOR_REASON_SUFFIX = " + prior tie-break"

/** `_verify_state` after a commit. */
internal const val VERIFY_STATE_CONFIRMED = "confirmed"

/** `_verify_state` while a candidate is pending. */
internal const val VERIFY_STATE_VERIFYING = "verifying"

private const val ROUND_2 = 100.0

private const val ROUND_3 = 1000.0

private const val BGR_CHANNELS = 3

/**
 * Scratch for the gamut rebuild, owned by the [EngineState] that triggers it — see
 * [ShadowVetoScratch] for why file scope was the wrong owner. Fully consumed inside the call:
 * `ColorGamut` copies what it keeps.
 */
internal class GamutScratch {
    var lab = ByteArray(0)
    var hsv = ByteArray(0)
}

/**
 * `_set_ref` — base truth is the `(image, FEN)` PAIR, never one half.
 *
 * **entry.md invariant 6:** `fromCommit = true` marks a reference taken at commit time. That frame
 * may still carry hand residue (a slow hand under the motion gate), and a colour gamut built from
 * it would bake the hand's colours in and blind the occlusion veto for good. The gamut is therefore
 * rebuilt **only** on the quiet re-anchor, where the board is verifiably clean — this function is
 * the only place in `:core-engine` that calls [boardColorGamut] at all.
 */
internal fun EngineState.setRef(
    cur: GrayImage,
    curBgr: BgrImage?,
    fromCommit: Boolean = false,
) {
    refGray = cur
    if (curBgr != null) {
        refBgr = curBgr
        // Deferred, not skipped: see EngineState.refGamut for why the rebuild happens on read.
        if (!fromCommit) markGamutStale(curBgr)
    }
    refFen = board.fen()
    refCorners = lastCorners?.copyOf()
    // Fresh reference -> require new motion (a hand) before the NEXT move may commit.
    motionSinceRef = false
}

/** `board_color_gamut(cur_bgr, self._det_size, white_pov)`; driven by [EngineState.refGamut]. */
internal fun EngineState.buildGamut(curBgr: BgrImage): ColorGamut? {
    val scratch = gamutScratch
    val need = curBgr.width * curBgr.height * BGR_CHANNELS
    if (scratch.lab.size != need) scratch.lab = ByteArray(need)
    if (scratch.hsv.size != need) scratch.hsv = ByteArray(need)
    bgrToLab(curBgr.data, curBgr.width, curBgr.height, scratch.lab)
    bgrToHsv(curBgr.data, curBgr.width, curBgr.height, scratch.hsv)
    val geom = PlaneGeometry(curBgr.width, curBgr.height, detSize, whitePov)
    return boardColorGamut(ColorPlanes(scratch.lab, scratch.hsv), geom)
}

/**
 * `_commit_move` — apply the move and set base truth to `(image, FEN after the move)`. Used by the
 * direct diff commit AND by every verified path; every default is Python's.
 */
internal fun EngineState.commitMove(
    move: Move,
    cur: GrayImage,
    curBgr: BgrImage?,
    decider: String = DECIDER_DIFF,
    priorUsed: Boolean = false,
    recovered: Boolean = false,
): TrackerEvent {
    val fenBefore = board.fen()
    val san = board.san(move)
    val uci = uciOf(move)
    board.push(move)
    history.add(san)
    lastMove = uci
    recordDecision(move, san, fenBefore, decider, priorUsed)
    queueSessionCapture(san)
    // The reference comes from the DETECTION frame and may contain hand residue; re-capturing
    // instead catches the same hands and makes the tracker additionally blind (clip01 replay).
    // Residue is healed by `maybePatchAnomaly` or the CNN recovery.
    finishCommit(cur, curBgr)
    recoveredLast = recovered
    // Make prior decisions visible (Spec 10 part 2): the prior can guess on a genuine image tie.
    priorLast = priorUsed
    note =
        "Move detected: $san" +
        (if (recovered) " (CNN recovery)" else "") +
        (if (priorUsed) " (decided by prior — undo if needed)" else "") +
        (if (board.result().checkmate) " — Checkmate!" else "")
    return TrackerEvent.MoveCommitted(uci, san, board.fen(), decider, priorUsed)
}

/**
 * `_commit_sequence` — atomically apply a confirmed move sequence (fast play: half-move + reply).
 * Provenance is recorded on the LAST move, never on both.
 */
internal fun EngineState.commitSequence(
    moves: List<Move>,
    cur: GrayImage,
    curBgr: BgrImage?,
    decider: String = DECIDER_DIFF_PAIR,
): TrackerEvent {
    val fenBefore = board.fen()
    val sans = ArrayList<String>(moves.size)
    for (move in moves) {
        sans.add(board.san(move))
        board.push(move)
    }
    history.addAll(sans)
    lastMove = uciOf(moves.last())
    recordDecision(moves.last(), sans.last(), fenBefore, decider, priorUsed = false)
    queueSessionCapture(sans.last())
    finishCommit(cur, curBgr)
    priorLast = false
    recoveredLast = false
    note =
        "Double move detected: ${sans.joinToString(" + ")} (fast play)" +
        (if (board.result().checkmate) " — Checkmate!" else "")
    return TrackerEvent.SequenceCommitted(moves.map { uciOf(it) }, sans, board.fen(), decider)
}

/** The state tail both commit paths share. */
private fun EngineState.finishCommit(
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    setRef(cur, curBgr, fromCommit = true)
    state = STATE_MOVE
    confirmer.reset()
    // also resets the recovery confirmer
    clearStuck()
    pending = null
    anomalySince = 0L
    verifyState = VERIFY_STATE_CONFIRMED
}

/**
 * `_record_decision` — WHO decided this move plus the evidence it was decided on. The
 * image-carrying `_recent_decisions` ring stays in `:app` (`:core-engine` does no I/O and holds no
 * frame history); this is the log half.
 */
internal fun EngineState.recordDecision(
    move: Move,
    san: String,
    fenBefore: String,
    decider: String,
    priorUsed: Boolean,
) {
    val reason = (DECIDER_REASON[decider] ?: decider) + (if (priorUsed) PRIOR_REASON_SUFFIX else "")
    decisionLog.add(
        DecisionRecord(
            tsS = nowS,
            ply = history.size,
            move = uciOf(move),
            san = san,
            fenBefore = fenBefore,
            fenAfter = board.fen(),
            decider = decider,
            reason = reason,
            priorUsed = priorUsed,
            bestScore = roundTo(bestScore, ROUND_2),
            secondScore = roundTo(secondScore, ROUND_2),
            margin = roundTo(bestScore - secondScore, ROUND_2),
            changed = changed.sortedSquareNames(),
            changedVals = changedVals.toList(),
            shadowVetoed = shadowVetoed.sortedSquareNames(),
            occludedVetoed = occludedVetoed.sortedSquareNames(),
            gridCoverage = roundTo(gridCoverage, ROUND_2),
            zThr = config.zThr,
            motion = roundTo(motion, ROUND_2),
            cnnRun = cnnRun,
            cnnAgreement = roundTo(cnnAgreement, ROUND_3),
            cnnBestMove = cnnBestMove,
            // Captured HERE, not read off the state when the debug screen renders: by then the
            // commit has cleared both and every historic row would show the newest values.
            stuckReason = stuckReason,
            verifyOutcome = pending?.voteOutcome,
        ),
    )
}

/**
 * `_queue_session_capture` — defer the auto-labeled session photo for the move just committed, and
 * take it immediately when the board is already clean.
 *
 * `:core-engine` does no file I/O and owns no recorder, so this only maintains
 * [EngineState.pendingCapture]; `:app` turns it into a frame.
 */
internal fun EngineState.queueSessionCapture(san: String) {
    pendingCapture = PendingCapture(san, board.fen())
    if (motionOccluded == 0L && tainted == 0L) flushSessionCapture()
}

/**
 * `_flush_session_capture` — the deferred photo is due now that the board has a clean stable view.
 * Returns what was flushed (`null` = nothing pending) instead of writing a file; the seam has no
 * capture event and inventing a `Note` would put engine-internal text on the user's screen.
 */
internal fun EngineState.flushSessionCapture(): PendingCapture? {
    val due = pendingCapture
    pendingCapture = null
    return due
}

/** Python's `round(x, n)` — half-to-EVEN on the exact value, like every other rounding here. */
private fun roundTo(
    value: Double,
    factor: Double,
): Double = Math.rint(value * factor) / factor
