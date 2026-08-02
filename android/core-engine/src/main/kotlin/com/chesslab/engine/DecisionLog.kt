package com.chesslab.engine

import com.chesslab.engine.api.DebugCnnRead
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.DebugPayload

/**
 * How many decision rows survive. A row is ~25 scalars and strings, and nothing appends per frame,
 * so 64 buys a long stretch of provenance for a few kB and the phone never has to answer "how far
 * back does this go".
 *
 * It is no longer one row per committed or rejected move, though. Since [markStuck] started writing
 * a row on every stuck-REASON TRANSITION (`Guards.kt`), a board that alternates between
 * `too_many_changed` and `no_legal_move` — a hand hovering, which is the ordinary case — can burn
 * rows without a candidate ever forming. Only the transition writes and `recordRejection` folds an
 * identical consecutive row, so the rate is still bounded by events rather than by frames; but "64
 * rows is several games" is the wrong mental model for reading a ring that has filled up.
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
    /**
     * Where a row goes the moment it is recorded. Default is a no-op so tests and the clip harness
     * stay silent; `:app` wires it to logcat.
     *
     * It sits on `add` rather than at the three call sites because a fourth one will be written one
     * day, and a decision that never reaches the log is exactly the situation this exists to end.
     * The engine has no Android dependency and no wall clock, so the sink is injected, not imported.
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
 * One decision as a single greppable line.
 *
 * Written for the question that costs the most time on a live board: *why did the deterministic
 * path not commit this move?* Every field here is one that has actually been guessed at during a
 * debugging session — the changed set and its z-values say whether the evidence existed at all, the
 * two veto sets say whether it was thrown away, `best`/`2nd` say whether the scorer could separate
 * the candidates, and `cnn` says what the other channel thought at the same instant.
 *
 * The Qxd4 case of 2026-08-01 is the worked example: four legal moves produced a bit-identical
 * occupancy board, and the question "did the diff channel see d4 change?" was unanswerable because
 * nothing was written down. This line answers it.
 */
internal fun DecisionRecord.toLogLine(): String {
    val z = changedVals.joinToString(" ") { (square, value) -> "$square=${pyFixed(value, 1)}" }
    val head = if (accepted) "COMMIT" else "REJECT"
    return buildString {
        append("ply=$ply $head ${move ?: "-"}")
        san?.let { append(" ($it)") }
        append(" by=$decider why=$reason")
        append(" best=${pyFixed(bestScore, 2)} 2nd=${pyFixed(secondScore, 2)} margin=${pyFixed(margin, 2)}")
        append(" zThr=${pyFixed(zThr, 1)} changed=[$z]")
        if (shadowVetoed.isNotEmpty()) append(" shadowVeto=${shadowVetoed.joinToString(",")}")
        if (occludedVetoed.isNotEmpty()) append(" occlVeto=${occludedVetoed.joinToString(",")}")
        append(" motion=${pyFixed(motion, 4)} grid=${pyFixed(gridCoverage, 2)}")
        append(" cnn=${if (cnnRun) "run" else "off"} cnnAgree=${pyFixed(cnnAgreement, 3)}")
        cnnBestMove?.let { append(" cnnMove=$it") }
        stuckReason?.let { append(" stuck=$it") }
        verifyOutcome?.let { append(" verify=$it") }
        append(" fen=$fenAfter")
    }
}

/**
 * Record something the tracker declined to commit, or declined to keep believing.
 *
 * Python logs commits only, which is exactly the half that is never in question during a live
 * session — the interesting rows are "the tracker saw Nf3 and refused it, and here is the number
 * that refused it". The gates re-fire on every stable frame while the same weak candidate sits
 * there, so an identical consecutive rejection is folded into the row already at the tail; without
 * that fold one static phantom would evict the whole ring in a second.
 *
 * **Five callers, and two of them are not rejections of a candidate** — the name is narrower than
 * the function, and a reader who trusts it will mis-read the log:
 * - `TrackerEngine.commitGates` twice — the LL floor and the motion gate, the original case: a
 *   candidate existed and a gate threw it away. [key] is its uci sequence.
 * - `VerifySingle.reject` — the CNN verify ladder discarded the pending candidate.
 * - `Guards.markStuck` — no candidate ever formed; the row records the window in which nothing
 *   happened, because "blocked before a candidate could form" and "nothing happened at all" used
 *   to look identical in the log. [key] is the EMPTY string, so `toLogLine`'s `move ?: "-"` does
 *   not fire (it guards null, not blank) and the line carries a double space where a uci goes.
 * - `Alarm.latchAlarm` — the opposite end: the board was declared LOST. [key] is the guessed
 *   illegal move, or empty when there is no guess. Not a rejection in any sense; it is here
 *   because the most consequential act of the engine used to leave no provenance at all.
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
