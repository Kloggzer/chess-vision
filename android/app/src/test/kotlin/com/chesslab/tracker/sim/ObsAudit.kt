package com.chesslab.tracker.sim

import com.chesslab.cnn.OccupancyObservation
import com.chesslab.cnn.confidentSquares
import com.chesslab.cnn.expectedLabels
import com.chesslab.cnn.expectedOccupancy
import com.chesslab.cnn.labelConfidentSquares
import com.github.bhlangonijr.chesslib.Board

// What the model SAW against the render's own frame label — separates a PORT bug from a MODEL
// weakness, and stays valid after a desync.

private const val TOP_OFFENDERS = 8

private const val SQUARES = 64.0

internal class ObsAudit {
    private var clearFrames = 0
    private var occChecked = 0
    private var occWrong = 0
    private var labelChecked = 0
    private var labelWrong = 0

    // The UNGATED statistic (`pOcc > pEmpty`, no abstaining): what `resyncCheck`, `verifyMove` and
    // the alarm gate actually live on.
    private var allSquares = 0
    private var misses = 0
    private var phantoms = 0
    private var perfectBoards = 0
    private var allLabels = 0
    private var allLabelsWrong = 0

    private val wrongSquares = mutableMapOf<String, Int>()
    private val allWrongSquares = mutableMapOf<String, Int>()
    private val confusions = mutableMapOf<String, Int>()

    private val allSquaresWrong get() = misses + phantoms

    fun add(
        obs: OccupancyObservation,
        truthFen: String,
        thr: Double,
    ) {
        val board = Board().also { it.loadFromFen(truthFen) }
        val occupancy = expectedOccupancy(board)
        val labels = expectedLabels(board)
        clearFrames += 1
        var boardWrong = 0
        for ((square, want) in occupancy) {
            allSquares += 1
            val got = obs.occupied(square)
            if (got != want) {
                // A MISS bakes an unseen move into the reference (S17-SIM-1); a PHANTOM trips the
                // desync veto and starves the re-anchor (S17-SIM-2).
                if (want) misses += 1 else phantoms += 1
                allWrongSquares.merge(square, 1, Int::plus)
                boardWrong += 1
            }
            allLabels += 1
            if (obs.label(square) != labels.getValue(square)) allLabelsWrong += 1
        }
        if (boardWrong == 0) perfectBoards += 1
        for (square in obs.confidentSquares(thr)) {
            occChecked += 1
            if (obs.occupied(square) != occupancy.getValue(square)) {
                occWrong += 1
                wrongSquares.merge(square, 1, Int::plus)
            }
        }
        for (square in obs.labelConfidentSquares(thr)) {
            labelChecked += 1
            val want = labels.getValue(square)
            val got = obs.label(square)
            if (got != want) {
                labelWrong += 1
                confusions.merge("$want->$got", 1, Int::plus)
            }
        }
    }

    /** Folds another clip's audit into this one, so a whole model gets one set of numbers. */
    fun absorb(other: ObsAudit) {
        clearFrames += other.clearFrames
        occChecked += other.occChecked
        occWrong += other.occWrong
        labelChecked += other.labelChecked
        labelWrong += other.labelWrong
        allSquares += other.allSquares
        misses += other.misses
        phantoms += other.phantoms
        perfectBoards += other.perfectBoards
        allLabels += other.allLabels
        allLabelsWrong += other.allLabelsWrong
        other.allWrongSquares.forEach { (k, v) -> allWrongSquares.merge(k, v, Int::plus) }
        other.wrongSquares.forEach { (k, v) -> wrongSquares.merge(k, v, Int::plus) }
        other.confusions.forEach { (k, v) -> confusions.merge(k, v, Int::plus) }
    }

    /** One line: how often a CONFIDENT statement of the model was wrong, and where. */
    fun summary(): String =
        "clear-frame obs=$clearFrames  confident-occupancy ${pct(occWrong, occChecked)} wrong ($occWrong/$occChecked)  " +
            "confident-identity ${pct(labelWrong, labelChecked)} wrong ($labelWrong/$labelChecked)\n" +
            "      occupancy misreads: ${top(wrongSquares)}\n" +
            "      identity confusions: ${top(confusions)}"

    /**
     * THE decision metric: occupancy is all the tracker consumes, identity is context only. Far above
     * `implied` (`perSquareAcc^64`) = errors CLUSTERED; at or below = spread, a resolution ceiling.
     */
    fun occupancyAccuracy(): String {
        val right = allSquares - allSquaresWrong
        val perSquare = if (allSquares == 0) 0.0 else right.toDouble() / allSquares
        return "observations=$clearFrames ($allSquares square reads)\n" +
            "  per-square occupancy acc  ${acc(right, allSquares)} ($right/$allSquares)   <- HEADLINE\n" +
            "  whole-board occupancy acc ${acc(perfectBoards, clearFrames)} ($perfectBoards/$clearFrames)" +
            "   implied by per-square if independent: ${"%.4f".format(Math.pow(perSquare, SQUARES))}\n" +
            "  error direction: misses (piece->empty) $misses  vs  phantoms (empty->piece) $phantoms" +
            "   -> ${if (misses >= phantoms) "MISSES dominate" else "PHANTOMS dominate"}\n" +
            "  error clustering: ${clustering()}\n" +
            "  worst squares: ${top(allWrongSquares)}\n" +
            "  confident-occupancy wrong ${pct(occWrong, occChecked)} ($occWrong/$occChecked)\n" +
            "  [context only, NOT part of the decision] per-square identity acc " +
            "${acc(allLabels - allLabelsWrong, allLabels)}, confident-identity wrong " +
            "${pct(labelWrong, labelChecked)}, confusions: ${top(confusions)}"
    }

    /** How concentrated the errors are: how few squares carry half of them, and how many are clean. */
    private fun clustering(): String {
        if (allSquaresWrong == 0) return "no errors"
        val sorted = allWrongSquares.values.sortedDescending()
        var acc = 0
        var half = 0
        for (v in sorted) {
            if (acc >= allSquaresWrong / 2) break
            acc += v
            half += 1
        }
        return "$half of ${sorted.size} touched squares carry half the errors; " +
            "${SQUARES.toInt() - sorted.size}/64 squares never wrong"
    }

    private fun acc(
        right: Int,
        total: Int,
    ): String = if (total == 0) "n/a" else "%.4f".format(right.toDouble() / total)

    private fun top(counts: Map<String, Int>): String =
        counts.entries
            .sortedByDescending { it.value }
            .take(TOP_OFFENDERS)
            .joinToString { "${it.key}x${it.value}" }
            .ifEmpty { "none" }

    private fun pct(
        wrong: Int,
        total: Int,
    ): String = if (total == 0) "n/a" else "%.2f%%".format(100.0 * wrong / total)
}
