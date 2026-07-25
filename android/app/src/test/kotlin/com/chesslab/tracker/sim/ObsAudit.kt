package com.chesslab.tracker.sim

import com.chesslab.cnn.OccupancyObservation
import com.chesslab.cnn.confidentSquares
import com.chesslab.cnn.expectedLabels
import com.chesslab.cnn.expectedOccupancy
import com.chesslab.cnn.labelConfidentSquares
import com.github.bhlangonijr.chesslib.Board

// What the model actually SAW, scored against `labels.json`'s per-frame FEN.
//
// This is the instrument that separates the two explanations for a diverging clip:
//   * a PORT bug — the engine mishandles a correct observation;
//   * a MODEL weakness — the observation itself is wrong on these Blender renders.
// The ground truth here is the render's own frame label, not the engine's belief, so the audit
// stays valid even after the run has desynced. Frames the label marks `occluded` are skipped:
// a hand over the board makes a disagreement correct behaviour, not an error.

private const val TOP_OFFENDERS = 6

internal class ObsAudit {
    private var clearFrames = 0
    private var occChecked = 0
    private var occWrong = 0
    private var labelChecked = 0
    private var labelWrong = 0
    private val wrongSquares = mutableMapOf<String, Int>()
    private val confusions = mutableMapOf<String, Int>()

    fun add(
        obs: OccupancyObservation,
        truthFen: String,
        thr: Double,
    ) {
        val board = Board().also { it.loadFromFen(truthFen) }
        val occupancy = expectedOccupancy(board)
        val labels = expectedLabels(board)
        clearFrames += 1
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

    /** One line: how often a CONFIDENT statement of the model was wrong, and where. */
    fun summary(): String =
        "clear-frame obs=$clearFrames  confident-occupancy ${pct(occWrong, occChecked)} wrong ($occWrong/$occChecked)  " +
            "confident-identity ${pct(labelWrong, labelChecked)} wrong ($labelWrong/$labelChecked)\n" +
            "      occupancy misreads: ${top(wrongSquares)}\n" +
            "      identity confusions: ${top(confusions)}"

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
