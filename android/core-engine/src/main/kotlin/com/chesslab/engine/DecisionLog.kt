package com.chesslab.engine

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.DebugPayload

/**
 * How many decision rows survive. A row is ~25 scalars and strings, appended at most once per
 * committed or rejected move — not per frame — so 64 is several games of provenance for a few kB,
 * and the phone never has to answer "how far back does this go".
 */
internal const val DECISION_LOG_CAP = 64

/** `_decider` of a row that records why a candidate was NOT committed. */
internal const val DECIDER_REJECTED = "rejected"

/**
 * `_decision_log` as a fixed-capacity ring.
 *
 * It is a `MutableList` on purpose: `undo` pops the rows of the undone plies from the tail and
 * `setFen` clears it, so the log has to behave like the list those two already speak. The only
 * added rule is that the OLDEST row is dropped once the capacity is reached — an unbounded log on
 * a phone that runs a tournament session is a slow leak nobody would ever see.
 */
internal class DecisionLog(
    private val cap: Int = DECISION_LOG_CAP,
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
    }

    override fun removeAt(index: Int): DecisionRecord = items.removeAt(index)
}

/**
 * Record a candidate the commit gates threw away.
 *
 * Python logs commits only, which is exactly the half that is never in question during a live
 * session — the interesting rows are "the tracker saw Nf3 and refused it, and here is the number
 * that refused it". The gates re-fire on every stable frame while the same weak candidate sits
 * there, so an identical consecutive rejection is folded into the row already at the tail; without
 * that fold one static phantom would evict the whole ring in a second.
 */
internal fun EngineState.recordRejection(
    key: String,
    why: String,
) {
    if (decisionLog.lastOrNull()?.isSameRejection(key, why) == true) return
    decisionLog.add(
        DecisionRecord(
            tsS = nowS,
            ply = history.size,
            move = key,
            san = null,
            fenBefore = null,
            fenAfter = board.fen(),
            decider = DECIDER_REJECTED,
            reason = why,
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
            cnnBestMove = cnnBestMove,
            stuckReason = stuckReason,
            verifyOutcome = pending?.voteOutcome,
            accepted = false,
        ),
    )
}

private fun DecisionRecord.isSameRejection(
    key: String,
    why: String,
): Boolean = !accepted && move == key && reason == why

/**
 * The whole debug payload, assembled only while debug is on (see `TrackerEngine.setDebugEnabled`).
 *
 * Everything here is read off state that already exists — nothing is measured, cached or kept alive
 * for the debug screen's benefit, so switching it off restores the exact previous cost.
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
private fun DecisionRecord.toDebugDecision(): DebugDecision =
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
        cnnAgreement = cnnAgreement,
        cnnBestMove = cnnBestMove,
        stuckReason = stuckReason,
        verifyOutcome = verifyOutcome,
        accepted = accepted,
    )
