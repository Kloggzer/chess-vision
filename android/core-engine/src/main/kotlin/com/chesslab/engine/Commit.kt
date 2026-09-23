package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.github.bhlangonijr.chesslib.move.Move

/** Decider keys — a FIXED vocabulary. */
internal const val DECIDER_DIFF = "diff"

internal const val DECIDER_DIFF_PAIR = "diff_pair"

internal const val DECIDER_CNN_PAIR = "cnn_pair"

internal const val DECIDER_CNN_OCCUPANCY = "cnn_occupancy"

internal const val DECIDER_CNN_OVERRULE = "cnn_overrule"

internal const val DECIDER_DIFF_AFTER_VERIFY = "diff_after_verify"

internal const val DECIDER_CNN_RECOVERY = "cnn_recovery"

internal const val DECIDER_CNN_RESYNC = "cnn_resync"

internal const val DECIDER_USER = "user"

/** Read verbatim by the debug screen and the `track-feedback` ingest: contract, not prose. */
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

internal const val VERIFY_STATE_CONFIRMED = "confirmed"

internal const val VERIFY_STATE_VERIFYING = "verifying"

internal const val VERIFY_STATE_STALLED = "stalled"

private const val BGR_CHANNELS = 3

/** Owned by the [EngineState] that triggers the rebuild ([ShadowVetoScratch] says why); `ColorGamut` copies what it keeps. */
internal class GamutScratch {
    var lab = ByteArray(0)
    var hsv = ByteArray(0)
}

/** Base truth is the `(image, FEN)` PAIR. Invariant 6: a commit-time reference may carry hand residue, and
 *  a gamut built from it blinds the occlusion veto — so the gamut is rebuilt ONLY on the quiet re-anchor. */
internal fun EngineState.setRef(
    cur: GrayImage,
    curBgr: BgrImage?,
    fromCommit: Boolean = false,
) {
    refGray = cur
    if (curBgr != null) {
        refBgr = curBgr
        // Deferred, not skipped: EngineState.refGamut rebuilds on read.
        if (!fromCommit) markGamutStale(curBgr)
    }
    refFen = board.fen()
    refCorners = lastCorners?.copyOf()
    // Fresh reference -> new motion (a hand) is required before the NEXT move may commit.
    motionSinceRef = false
}

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

/** Base truth becomes `(image, FEN after)`. Used by the direct diff commit AND every verified path. */
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
    // The DETECTION frame may carry hand residue; re-capturing catches the same hands and blinds the tracker
    // further (clip01 replay). Residue heals through `maybePatchAnomaly` or recovery.
    finishCommit(cur, curBgr)
    recoveredLast = recovered
    priorLast = priorUsed
    note =
        "Move detected: $san" +
        (if (recovered) " (CNN recovery)" else "") +
        (if (priorUsed) " (decided by prior — undo if needed)" else "") +
        (if (board.result().checkmate) " — Checkmate!" else "")
    return TrackerEvent.MoveCommitted(uci, san, board.fen(), decider, priorUsed)
}

internal fun EngineState.commitSequence(
    moves: List<Move>,
    cur: GrayImage,
    curBgr: BgrImage?,
    decider: String = DECIDER_DIFF_PAIR,
): TrackerEvent {
    val sans = ArrayList<String>(moves.size)
    // ONE row per move, as `pushRecovery` does: a single row with the first move's `fenBefore` cost a pair its
    // first move — the LCS counted three seen moves as MISSED.
    val key = if (moves.size == 1) null else moves.joinToString(" ") { uciOf(it) }
    for ((i, move) in moves.withIndex()) {
        val fenBefore = board.fen()
        val san = board.san(move)
        sans.add(san)
        board.push(move)
        // Per move: `recordDecision` reads `history.size` as the row's ply.
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

private fun EngineState.finishCommit(
    cur: GrayImage,
    curBgr: BgrImage?,
) {
    setRef(cur, curBgr, fromCommit = true)
    refProvisionalUntil = if (nowS < refHoldUntil) refHoldUntil else 0.0
    state = STATE_MOVE
    // The take-back hold is NOT cleared: a second bridge would disarm the first's guard. Keyed to a FEN, it is
    // inert once a real commit leaves that position.
    confirmer.reset()
    clearStuck()
    pending = null
    anomalySince = 0L
    // Die Serie zaehlt gegen die verlassene Stellung: sie ueberlebte den Commit, und der erste abweichende Read
    // danach rastete sofort ein.
    clearDesyncStreak()
    verifyState = VERIFY_STATE_CONFIRMED
}

/** The image-carrying decision ring stays in `:app` (`:core-engine` does no I/O); this is the log half. */
internal fun EngineState.recordDecision(
    move: Move,
    san: String,
    fenBefore: String,
    decider: String,
    priorUsed: Boolean,
    /** Lets a recovery say which move of which bridge a row is without widening `DebugDecision` (a wire shape). */
    reasonSuffix: String = "",
) {
    val reason =
        (DECIDER_REASON[decider] ?: decider) + (if (priorUsed) PRIOR_REASON_SUFFIX else "") + reasonSuffix
    // Exactly ONE row inherits the ladder's verdict.
    val verdict = pending?.voteOutcome ?: verdictOutcome
    val row = decisionRow(decider, reason, uciOf(move), verdict)
    verdictOutcome = null
    verdictShadowVetoed = null
    verdictOccludedVetoed = null
    decisionLog.add(row.copy(san = san, fenBefore = fenBefore, priorUsed = priorUsed))
}

/** `:core-engine` does no file I/O, so this only maintains [EngineState.pendingCapture]; `:app` takes the frame. */
internal fun EngineState.queueSessionCapture(san: String) {
    pendingCapture = PendingCapture(san, board.fen())
    if (motionOccluded == 0L && tainted == 0L) flushSessionCapture()
}

/** Returns what was flushed instead of writing a file: the seam has no capture event, and a `Note` would put
 *  engine text on the user's screen. */
internal fun EngineState.flushSessionCapture(): PendingCapture? {
    val due = pendingCapture
    pendingCapture = null
    return due
}

/** [cur]'s pixels only on [visible] squares: a reference anchored under a hand took the hand and differed on
 *  24 squares for the rest of the game. Without a same-size reference the frame is taken whole. */
internal fun EngineState.setRefComposite(
    cur: GrayImage,
    curBgr: BgrImage?,
    visible: Long,
    fromCommit: Boolean,
) {
    val ref = refGray
    val refColor = refBgr
    if (visible == -1L || ref == null || ref.width != cur.width || ref.height != cur.height) {
        setRef(cur, curBgr, fromCommit)
        return
    }
    val gray = GrayImage(ref.width, ref.height, ref.data.copyOf())
    val color =
        if (curBgr != null && refColor != null && refColor.data.size == curBgr.data.size) {
            BgrImage(refColor.width, refColor.height, refColor.data.copyOf())
        } else {
            null
        }
    val boxes = detBoxes
    visible.forEachSquare { i ->
        val x0 = boxes.x0[i].coerceIn(0, ref.width)
        val x1 = boxes.x1[i].coerceIn(0, ref.width)
        val y0 = boxes.y0[i].coerceIn(0, ref.height)
        val y1 = boxes.y1[i].coerceIn(0, ref.height)
        for (y in y0 until y1) {
            val row = y * ref.width
            System.arraycopy(cur.data, row + x0, gray.data, row + x0, x1 - x0)
            if (color != null && curBgr != null) {
                System.arraycopy(curBgr.data, (row + x0) * BGR_CHANNELS, color.data, (row + x0) * BGR_CHANNELS, (x1 - x0) * BGR_CHANNELS)
            }
        }
    }
    setRef(gray, color ?: curBgr, fromCommit)
}
