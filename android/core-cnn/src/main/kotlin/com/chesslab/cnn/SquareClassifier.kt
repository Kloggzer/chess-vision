package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage

/** No ONNX, OpenCV or Android here, so the verify/recovery machines are testable on the JVM with a fake. */
interface SquareClassifier {
    /** 64 rows of `classes.size` PROBABILITIES (softmax inside — the head emits log-probabilities), plus ONE
     *  coverage value when the run declares `coverage_output`: a [sigmoid], outside softmax and argmax. */
    fun classify(crops: List<BgrImage>): Array<FloatArray>

    /** From the asset's `config.json`; assert with [requireExpectedClasses]. */
    val classes: List<String>

    fun close() {
        // no-op by default: a pure-Kotlin fake owns no native session
    }
}
