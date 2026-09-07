package com.chesslab.engine

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.DebugPayload

/**
 * How many decision rows survive: a row is ~25 scalars and nothing appends per frame, so 64 buys a long
 * stretch of provenance for a few kB. NOT one row per move though — stuck transitions and the quiet
 * edge write rows too, so a filled ring can cover far less than "several games".
 */
internal const val DECISION_LOG_CAP = 64

/**
 * Motion is printed to four places because it is read against a threshold of 0.0025; at two places every
 * quiet frame prints `motion=0.00` and stops distinguishing "still" from "just under the gate".
 */
private const val MOTION_DP = 4

/** Agreement is a fraction near 1; two places would print 0.98 for both 0.980 and 0.984. */
private const val AGREEMENT_DP = 3

/** Decider of a row that records why a candidate was NOT committed. */
internal const val DECIDER_REJECTED = "rejected"

/**
 * The decision log as a fixed-capacity ring. A `MutableList` on purpose: `undo` pops the rows of the
 * undone plies from the tail and `setFen` clears it. The added rule is that the OLDEST row is dropped
 * at capacity — an unbounded log on a phone running a tournament session is a slow leak.
 */
internal class DecisionLog(
    private val cap: Int = DECISION_LOG_CAP,
    /**
     * Where a row goes the moment it is recorded; a no-op by default so tests and the clip harness stay
     * silent. It sits on `add`, not at the call sites, because a decision that never reaches the log is
     * the situation this exists to end; injected because the engine has no Android dependency.
     */
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

/**
 * One decision as a single greppable line, for the question that costs the most time on a live board: *why
 * did the deterministic path not commit this move?* Qxd4 (2026-08-01) is the worked example — four legal
 * moves gave a bit-identical occupancy board and nothing was written down. [pyFixed] keeps it in this module.
 */
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
        // Without these, `cnnAgree=0.000` cannot be told from "never asked" — see `EngineState`.
        append(" cnnReads=$cnnReadsTaken/$cnnReadsStale")
        // Snapshots seen, then where they went — verify ladder / no evaluator / gate
        // closed. `cnnReads=0` has four causes and this says which.
        append(" cnnSnaps=$cnnSnaps/$cnnSnapsToVerify/$cnnSnapsNoEvaluator/$cnnSnapsNotDue")
        cnnBestMove?.let { append(" cnnMove=$it") }
        stuckReason?.let { append(" stuck=$it") }
        verifyOutcome?.let { append(" verify=$it") }
        append(" fen=$fenAfter")
    }
}

/**
 * Record something the tracker declined to commit, or declined to keep believing; several callers are NOT
 * candidate rejections (stuck transition, quiet edge, latched alarm) and pass an EMPTY [key]. An identical
 * consecutive row folds into the tail — [foldOnChanged] adds the changed set, the quiet edge's only key.
 */
internal fun EngineState.recordRejection(
    key: String,
    why: String,
    foldOnChanged: Boolean = false,
    foldConsecutive: Boolean = true,
) {
    if (foldConsecutive && decisionLog.lastOrNull()?.foldsInto(key, why, changed, foldOnChanged) == true) return
    decisionLog.add(decisionRow(DECIDER_REJECTED, why, move = key, verifyOutcome = pending?.voteOutcome, accepted = false))
}

/** One row over the state's evidence as it stands; a commit adds its move via `copy`. */
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
        shadowVetoed = shadowVetoed.sortedSquareNames(),
        occludedVetoed = occludedVetoed.sortedSquareNames(),
        gridCoverage = gridCoverage,
        zThr = config.zThr,
        // Unrounded: it is read against a threshold of 0.0025 (`MOTION_DP`).
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

/**
 * Whether the row at the tail already says this. [changedNow] is compared only under [onChanged] —
 * `sortedSquareNames` allocates, and the key-only callers take this path on every stable frame.
 */
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

/**
 * The whole debug payload, assembled only while debug is on. Everything is read off state that already
 * exists — nothing is measured or kept alive for the debug screen, so switching it off restores the
 * exact previous cost.
 */
internal fun EngineState.debugPayload(): DebugPayload {
    val snap = cnnSnap
    return DebugPayload(
        decisions = decisionLog.map { it.toDebugDecision() },
        cnnReads = cnnReads(),
        tainted = tainted.sortedSquareNames().toSet(),
        cnnSeq = snap?.seq ?: -1L,
        cnnAgeMs = if (snap == null) -1L else (nowS * MS_PER_SECOND).toLong() - snap.tsMs,
        cnnInferMs = snap?.inferMs ?: 0.0,
        gridCoverage = gridCoverage,
        motion = motion,
        maxChanged = config.maxChanged,
        zThr = config.zThr,
        cnnConfThr = config.cnnConfThr,
        minConfidentBoard = config.minConfidentBoard,
        minConfidentRecovery = config.minConfidentRecovery,
    )
}

private const val MS_PER_SECOND = 1000.0

/**
 * The last glance, one row per square. Empty when nothing has been observed yet — a fabricated
 * all-zero board would be indistinguishable from a model that reads every square as empty.
 */
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

/**
 * The engine's internal row as the seam's. The two are separate types because `DecisionRecord` is
 * `internal` and carries engine spellings (`move`, `cnnRun`), while the UI reads `api/` only.
 */
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
    )
