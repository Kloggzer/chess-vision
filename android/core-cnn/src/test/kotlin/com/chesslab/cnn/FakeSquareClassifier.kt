package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage
import com.github.bhlangonijr.chesslib.Board

/**
 * Test double for [SquareClassifier]: derives a one-hot-ish distribution from a FEN, with
 * per-square overrides for chronic-misread and occlusion scenarios. Phase 04 reuses it, so
 * the constructor is stable: `FakeSquareClassifier(fen, conf, overrides)`.
 */
class FakeSquareClassifier(
    fen: String,
    private val conf: Double = 0.99,
    private val overrides: Map<String, Pair<String, Double>> = emptyMap(),
    override val classes: List<String> = EXPECTED_CLASSES,
) : SquareClassifier {
    private val expected: Map<String, String> = expectedLabels(Board().also { it.loadFromFen(fen) })

    /** The full probability row for one square: target class at its confidence, rest uniform. */
    fun probsFor(square: String): FloatArray {
        val override = overrides[square]
        val label = override?.first ?: expected.getValue(square)
        val confidence = override?.second ?: conf
        val index = classes.indexOf(label)
        require(index >= 0) { "label $label is not in $classes" }
        val rest = ((1.0 - confidence) / (classes.size - 1)).toFloat()
        return FloatArray(classes.size) { if (it == index) confidence.toFloat() else rest }
    }

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        require(crops.size == ALL_SQUARES.size) { "expected ${ALL_SQUARES.size} crops, got ${crops.size}" }
        return Array(ALL_SQUARES.size) { probsFor(ALL_SQUARES[it]) }
    }

    /** The observation this fake would produce, without going through crops. */
    fun observe(): OccupancyObservation = observationFromProbs(Array(ALL_SQUARES.size) { probsFor(ALL_SQUARES[it]) }, classes)
}
