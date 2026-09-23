package com.chesslab.engine

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.DebugPayload

/** Not one row per move: stuck transitions and the quiet edge write rows too, so a full ring covers less than it seems. */
internal const val DECISION_LOG_CAP = 64

/** Read against a threshold of 0.0025: at two places every quiet frame prints `motion=0.00`. */
private const val MOTION_DP = 4

private const val AGREEMENT_DP = 3

internal const val DECIDER_REJECTED = "rejected"

/** `undo` pops the undone plies' rows and `setFen` clears it; at capacity the OLDEST drops — unbounded is a slow leak. */
internal class DecisionLog(
    private val cap: Int = DECISION_LOG_CAP,
    /** On `add`, not at the call sites: a decision that never reaches the log is what this exists to end. */
    private val sink: (DecisionRecord) -> Unit = {},
) : AbstractMutableList<DecisionRecord>() {
    private val items = ArrayList<DecisionRecord>(cap)

    override val size: Int get() = items.size

    override fun get(index: Int): DecisionRecord = items[index]

    override fun set(
        index: Int,
        element: DecisionRecord,
    ): DecisionRecord = items.set(index, element)

    override fun add(
        index: Int,
        element: DecisionRecord,
    ) {
        items.add(index, element)
        while (items.size > cap) items.removeAt(0)
        sink(element)
    }

    override fun removeAt(index: Int): DecisionRecord = items.removeAt(index)
}

/** For *why did the deterministic path not commit this move?* — Qxd4: four legal moves gave one occupancy
 *  board and nothing was written down. */
fun DebugDecision.toLogLine(): String {
    val z = changedVals.joinToString(" ") { (square, value) -> "$square=${pyFixed(value, 1)}" }
    val head = if (accepted) "COMMIT" else "REJECT"
    return buildString {
        append("ply=$ply $head ${uci ?: "-"}")
        san?.let { append(" ($it)") }
        append(" by=$decider why=$reason")
        append(" best=${pyFixed(bestScore, 2)} 2nd=${pyFixed(secondScore, 2)} margin=${pyFixed(margin, 2)}")
        append(" zThr=${pyFixed(zThr, 1)} changed=[$z]")
        if (shadowVetoed.isNotEmpty()) append(" shadowVeto=${shadowVetoed.joinToString(",")}")
        if (occludedVetoed.isNotEmpty()) append(" occlVeto=${occludedVetoed.joinToString(",")}")
        append(" motion=${pyFixed(motion, MOTION_DP)} grid=${pyFixed(gridCoverage, 2)}")
        append(" cnn=${if (cnnRun) "run" else "off"} cnnAgree=${pyFixed(cnnAgreement, AGREEMENT_DP)}")
        // Without these, `cnnAgree=0.000` cannot be told from "never asked".
        append(" cnnReads=$cnnReadsTaken/$cnnReadsStale")
        // Snapshots seen, then verify ladder / no evaluator / gate closed: `cnnReads=0` has four causes.
        append(" cnnSnaps=$cnnSnaps/$cnnSnapsToVerify/$cnnSnapsNoEvaluator/$cnnSnapsNotDue")
        cnnBestMove?.let { append(" cnnMove=$it") }
        stuckReason?.let { append(" stuck=$it") }
        verifyOutcome?.let { append(" verify=$it") }
        append(" fen=$fenAfter")
    }
}

/** Several callers are NOT candidate rejections (stuck transition, quiet edge, alarm) and pass an EMPTY [key].
 *  An identical consecutive row folds into the tail. */
internal fun EngineState.recordRejection(
    key: String,
    why: String,
    foldOnChanged: Boolean = false,
    foldConsecutive: Boolean = true,
) {
    if (foldConsecutive && decisionLog.lastOrNull()?.foldsInto(key, why, changed, foldOnChanged) == true) return
    decisionLog.add(decisionRow(DECIDER_REJECTED, why, move = key, verifyOutcome = pending?.voteOutcome, accepted = false))
}

internal fun EngineState.decisionRow(
    decider: String,
    reason: String,
    move: String? = null,
    verifyOutcome: String? = null,
    accepted: Boolean = true,
): DecisionRecord =
    DecisionRecord(
        tsS = nowS,
        ply = history.size,
        move = move,
        san = null,
        fenBefore = null,
        fenAfter = board.fen(),
        decider = decider,
        reason = reason,
        priorUsed = false,
        bestScore = roundTo(bestScore, ROUND_2),
        secondScore = roundTo(secondScore, ROUND_2),
        margin = roundTo(bestScore - secondScore, ROUND_2),
        changed = changed.sortedSquareNames(),
        changedVals = changedVals.toList(),
        shadowVetoed = (pending?.shadowVetoedAtLift ?: verdictShadowVetoed ?: shadowVetoed).sortedSquareNames(),
        occludedVetoed = (pending?.occludedVetoedAtLift ?: verdictOccludedVetoed ?: occludedVetoed).sortedSquareNames(),
        gridCoverage = gridCoverage,
        zThr = config.zThr,
        motion = motion,
        cnnRun = cnnRun,
        cnnAgreement = roundTo(cnnAgreement, ROUND_3),
        cnnReadsTaken = cnnReadsTaken,
        cnnReadsStale = cnnReadsStale,
        cnnSnaps = cnnSnapsSeen,
        cnnSnapsToVerify = cnnSnapsToVerify,
        cnnSnapsNoEvaluator = cnnSnapsNoEvaluator,
        cnnSnapsNotDue = cnnSnapsNotDue,
        cnnBestMove = cnnBestMove,
        // Captured here: a commit clears both, so a row read later would show the newest values.
        stuckReason = stuckReason,
        verifyOutcome = verifyOutcome,
        accepted = accepted,
        refProvisional = nowS < refHoldUntil,
    )

private const val ROUND_2 = 100.0

private const val ROUND_3 = 1000.0

/** HALF_EVEN on the exact value, like Python's `round`. */
private fun roundTo(
    value: Double,
    factor: Double,
): Double = Math.rint(value * factor) / factor

private fun DecisionRecord.isSameRejection(
    key: String,
    why: String,
): Boolean = !accepted && move == key && reason == why

/** [changedNow] only under [onChanged]: `sortedSquareNames` allocates, and key-only callers come here every stable frame. */
private fun DecisionRecord.foldsInto(
    key: String,
    why: String,
    changedNow: Long,
    onChanged: Boolean,
): Boolean {
    var folds = isSameRejection(key, why)
    if (folds && onChanged) folds = changed == changedNow.sortedSquareNames()
    return folds
}

/** Only while debug is on, read off existing state: switching it off restores the exact previous cost. */
internal fun EngineState.debugPayload(): DebugPayload {
    val snap = cnnSnap
    return DebugPayload(
        decisions = decisionLog.map { it.toDebugDecision() },
        cnnReads = cnnReads(),
        tainted = tainted.sortedSquareNames().toSet(),
        cnnSeq = snap?.seq ?: -1L,
        cnnAgeMs = if (snap == null) -1L else (nowS * MS_PER_SECOND).toLong() - snap.tsMs,
        // Dieselbe -1 wie darueber: eine 0,0 las sich als gemessene Inferenzzeit.
        cnnInferMs = snap?.inferMs ?: -1.0,
        gridCoverage = gridCoverage,
        motion = motion,
        maxChanged = config.maxChanged,
        zThr = config.zThr,
        cnnConfThr = config.cnnConfThr,
        minConfidentBoard = config.minConfidentBoard,
        minConfidentRecovery = config.minConfidentRecovery,
        frameGate = lastFrameGate,
        engineSeq = lastInputSeq,
        stableFrames = stableCount,
        requiredStableFrames = settleFrames,
        bufferedFrames = grayBuf.size,
        holdRemainingMs = ((holdUntil - nowS) * MS_PER_SECOND).coerceAtLeast(0.0),
    )
}

private const val MS_PER_SECOND = 1000.0

/** Empty before any observation: an all-zero board would look like a model reading every square as empty. */
private fun EngineState.cnnReads(): List<DebugCnnRead> {
    val obs = cnnSnap?.obs ?: return emptyList()
    val thr = config.cnnConfThr
    return List(Squares.COUNT) { i ->
        val square = Squares.ALL[i]
        DebugCnnRead(
            square = square,
            label = obs.label(square),
            conf = obs.conf(square),
            pOccluded = obs.pOccluded(square),
            occupied = obs.occupied(square),
            confident = obs.confident(square, thr),
            believed = board.pieceCharAt(i),
        )
    }
}

/** Separate types: `DecisionRecord` is internal with engine spellings; the UI reads `api/` only. */
internal fun DecisionRecord.toDebugDecision(): DebugDecision =
    DebugDecision(
        tsS = tsS,
        ply = ply,
        uci = move,
        san = san,
        fenBefore = fenBefore,
        fenAfter = fenAfter,
        decider = decider,
        reason = reason,
        priorUsed = priorUsed,
        bestScore = bestScore,
        secondScore = secondScore,
        margin = margin,
        changed = changed,
        changedVals = changedVals,
        shadowVetoed = shadowVetoed,
        occludedVetoed = occludedVetoed,
        gridCoverage = gridCoverage,
        zThr = zThr,
        motion = motion,
        cnnRun = cnnRun,
        cnnAgreement = cnnAgreement,
        cnnReadsTaken = cnnReadsTaken,
        cnnReadsStale = cnnReadsStale,
        cnnSnaps = cnnSnaps,
        cnnSnapsToVerify = cnnSnapsToVerify,
        cnnSnapsNoEvaluator = cnnSnapsNoEvaluator,
        cnnSnapsNotDue = cnnSnapsNotDue,
        cnnBestMove = cnnBestMove,
        stuckReason = stuckReason,
        verifyOutcome = verifyOutcome,
        accepted = accepted,
        refProvisional = refProvisional,
    )
