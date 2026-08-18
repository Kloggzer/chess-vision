package com.chesslab.cnn

import com.chesslab.engine.api.BgrImage

/**
 * Pixels -> per-square probabilities. The ONNX Runtime implementation is **phase 05c in
 * `:app`** — `:core-cnn` deliberately has no ONNX, no OpenCV and no Android dependency, so
 * phase 04's verify/recovery state machines can be tested on the desktop JVM with a fake.
 */
interface SquareClassifier {
    /**
     * @param crops 64 BGR crops in [ALL_SQUARES] order.
     * @return 64 rows of `classes.size` PROBABILITIES (the softmax happens inside the
     *   implementation — the model head emits log-probabilities, see [softmax]), followed by ONE
     *   coverage value when the run declares a `coverage_output` — that one is a [sigmoid] and not
     *   a class, so it stays outside the softmax and outside the argmax.
     */
    fun classify(crops: List<BgrImage>): Array<FloatArray>

    /** Read from the model asset's `config.json`; assert with [requireExpectedClasses]. */
    val classes: List<String>

    fun close() {
        // no-op by default: a pure-Kotlin fake owns no native session
    }
}
