package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** Decider keys — the vocabulary is FIXED. */
internal const val DECIDER_DIFF = "diff"

internal const val DECIDER_DIFF_PAIR = "diff_pair"

internal const val DECIDER_CNN_PAIR = "cnn_pair"

internal const val DECIDER_CNN_OCCUPANCY = "cnn_occupancy"

internal const val DECIDER_CNN_OVERRULE = "cnn_overrule"

internal const val DECIDER_DIFF_AFTER_VERIFY = "diff_after_verify"

internal const val DECIDER_CNN_RECOVERY = "cnn_recovery"

internal const val DECIDER_CNN_RESYNC = "cnn_resync"

/** The user-correction row of the decision log. */
internal const val DECIDER_USER = "user"

/**
 * Read verbatim by the debug screen and the `track-feedback` ingest, so these strings are part of
 * the contract, not prose.
 */
internal val DECIDER_REASON: Map<String, String> =
    mapOf(
        DECIDER_DIFF to "frame-diff — UNVERIFIED, no CNN was available",
        DECIDER_DIFF_PAIR to "frame-diff double move (fast play) — UNVERIFIED, no CNN was available",
        DECIDER_CNN_PAIR to "frame-diff double move (fast play), confirmed by CNN occupancy",
        DECIDER_CNN_OCCUPANCY to "frame-diff, confirmed by CNN occupancy",
        DECIDER_CNN_OVERRULE to "frame-diff read a different move — CNN occupancy overruled it",
        DECIDER_DIFF_AFTER_VERIFY to
            "frame-diff, accepted unconfirmed after the CNN stayed uncertain with a clear view of both squares",
        DECIDER_CNN_RECOVERY to "position was LOST — rebuilt by the CNN, not detected",
        DECIDER_CNN_RESYNC to "manual resync by the user",
    )

private const val PRIOR_REASON_SUFFIX = " + prior tie-break"

/** The verify state after a commit. */
internal const val VERIFY_STATE_CONFIRMED = "confirmed"

/** The verify state while a candidate is pending. */
internal const val VERIFY_STATE_VERIFYING = "verifying"

/** The observer stopped answering, so the candidate was dropped. */
internal const val VERIFY_STATE_STALLED = "stalled"

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
 * Base truth is the `(image, FEN)` PAIR, never one half. **entry.md invariant 6:** a reference taken
 * at commit time may still carry hand residue, and a gamut built from it would blind the occlusion
 * veto for good — so the gamut is rebuilt ONLY on the quiet re-anchor, where the board is clean.
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

/** Driven by [EngineState.refGamut]. */
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
 * Apply the move and set base truth to `(image, FEN after the move)`. Used by the direct diff commit
 * AND by every verified path.
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
    lastCommitSize = 1
    recordDecision(move, san, fenBefore, decider, priorUsed)
    queueSessionCapture(san)
    // The reference comes from the DETECTION frame and may contain hand residue; re-capturing
    // instead catches the same hands and makes the tracker additionally blind (clip01 replay).
    // Residue is healed by `maybePatchAnomaly` or the CNN recovery.
    finishCommit(cur, curBgr)
    recoveredLast = recovered
    // Make prior decisions visible: the prior can guess on a genuine image tie.
    priorLast = priorUsed
    note =
        "Move detected: $san" +
        (if (recovered) " (CNN recovery)" else "") +
        (if (priorUsed) " (decided by prior — undo if needed)" else "") +
        (if (board.result().checkmate) " — Checkmate!" else "")
    return TrackerEvent.MoveCommitted(uci, san, board.fen(), decider, priorUsed)
}

/** Atomically apply a confirmed move sequence (fast play: half-move + reply). */
internal fun EngineState.commitSequence(
    moves: List<Move>,
    cur: GrayImage,
    curBgr: BgrImage?,
    decider: String = DECIDER_DIFF_PAIR,
): TrackerEvent {
    val sans = ArrayList<String>(moves.size)
    // ONE row per move, exactly as `pushRecovery` does. Both call sites once wrote a single row on
    // `moves.last()` with the `fenBefore` from before the FIRST move, so a pair kept costing its
    // first move: ply 25 of VID_20260802_222741 read `Nxf3+` with Black not to move, and the LCS
    // counted three moves as MISSED that the tracker had in fact seen (2026-08-09).
    val key = if (moves.size == 1) null else moves.joinToString(" ") { uciOf(it) }
    for ((i, move) in moves.withIndex()) {
        val fenBefore = board.fen()
        val san = board.san(move)
        sans.add(san)
        board.push(move)
        // Per move, not one `addAll` at the end: `recordDecision` reads `history.size` as the
        // row's ply, so the rows number themselves only if the history grows with them.
        history.add(san)
        val stamp = if (key == null) "" else " [move ${i + 1}/${moves.size} of pair $key]"
        recordDecision(move, san, fenBefore, decider, priorUsed = false, reasonSuffix = stamp)
    }
    lastMove = uciOf(moves.last())
    lastCommitSize = moves.size
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
    refProvisionalUntil = if (nowS < refHoldUntil) refHoldUntil else 0.0
    state = STATE_MOVE
    // The take-back hold is NOT cleared here. Clearing on commit meant a second, different CNN
    // bridge disarmed the guard set by the first; the hold is keyed to a FEN, so a commit that
    // genuinely advances the game leaves that position and the hold is inert on its own.
    confirmer.reset()
    // also resets the recovery confirmer
    clearStuck()
    pending = null
    anomalySince = 0L
    // Die Serie zaehlt gegen die Stellung, die der Commit gerade verlaesst. Sie ueberlebte ihn,
    // also war nach einem echten Zug `desyncObs` schon voll und `desyncSince` lange her — der
    // erste abweichende Read danach rastete sofort ein ("Alarm feuert zu schnell", TODO.md).
    clearDesyncStreak()
    verifyState = VERIFY_STATE_CONFIRMED
}

/**
 * WHO decided this move plus the evidence it was decided on. The image-carrying decision ring stays
 * in `:app` (`:core-engine` does no I/O and holds no frame history); this is the log half.
 */
internal fun EngineState.recordDecision(
    move: Move,
    san: String,
    fenBefore: String,
    decider: String,
    priorUsed: Boolean,
    /**
     * Appended verbatim to the canonical [DECIDER_REASON] text, so a CNN recovery can say which move
     * of which bridge a row is without widening `DebugDecision` — that type is a wire shape.
     */
    reasonSuffix: String = "",
) {
    val reason =
        (DECIDER_REASON[decider] ?: decider) + (if (priorUsed) PRIOR_REASON_SUFFIX else "") + reasonSuffix
    // Exactly ONE row inherits the ladder's verdict; the next one is already another decision.
    val verdict = pending?.voteOutcome ?: verdictOutcome
    verdictOutcome = null
    decisionLog.add(decisionRow(decider, reason, uciOf(move), verdict).copy(san = san, fenBefore = fenBefore, priorUsed = priorUsed))
}

/**
 * Defer the auto-labeled session photo for the move just committed, and take it immediately when the
 * board is already clean. `:core-engine` does no file I/O and owns no recorder, so this only
 * maintains [EngineState.pendingCapture]; `:app` turns it into a frame.
 */
internal fun EngineState.queueSessionCapture(san: String) {
    pendingCapture = PendingCapture(san, board.fen())
    if (motionOccluded == 0L && tainted == 0L) flushSessionCapture()
}

/**
 * The deferred photo is due now that the board has a clean stable view. Returns what was flushed
 * (`null` = nothing pending) instead of writing a file; the seam has no capture event and inventing
 * a `Note` would put engine-internal text on the user's screen.
 */
internal fun EngineState.flushSessionCapture(): PendingCapture? {
    val due = pendingCapture
    pendingCapture = null
    return due
}
