package com.chesslab.arena

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.warpFromCorners
import org.opencv.core.Mat

/** Everything here is CAUSAL. [raw] and all derived from it is valid only during one
 *  [ArenaTracker.onFrame] call — the arena reuses the buffers. */
class FrameView(
    val index: Long,
    val tsMs: Double,
    val fps: Double,
    val raw: Mat,
    val quad: FloatArray?,
    private val models: Models,
) {
    val model: String get() = models.default

    /** The last column is the coverage sigmoid, not a class. */
    fun classes(model: String = models.default): List<String> = models.of(model).classes

    fun coverageGate(model: String = models.default): Double? = models.of(model).coverageGate

    fun geometry(model: String = models.default): BoardGeometry? = quad?.let { models.of(model).geometryFor(it) }

    private val cached = HashMap<String, Array<FloatArray>>()

    /** COSTS REAL TIME (~20-40 ms) and is counted per model: a tracker asking every frame cannot run on a
     *  phone. Cached per frame and model. */
    fun squares(model: String = models.default): Array<FloatArray>? {
        val corners = quad ?: return null
        cached[model]?.let { return it }
        models.counted(model)
        val vision = models.of(model)
        return vision.readSquares(raw, corners, vision.geometryFor(corners)).also { cached[model] = it }
    }

    /** The last column of [squares], named: a reader that must know which column is not a class will one
     *  day softmax it. */
    fun coverage(model: String = models.default): DoubleArray? {
        val rows = squares(model) ?: return null
        val last = models.of(model).classes.size
        return DoubleArray(rows.size) { rows[it][last].toDouble() }
    }

    fun covered(model: String = models.default): Set<String>? {
        val gate = models.of(model).coverageGate ?: return null
        val rows = coverage(model) ?: return null
        return ALL_SQUARES.filterIndexedTo(LinkedHashSet()) { i, _ -> rows[i] > gate }
    }

    /** The CALLER releases it. */
    fun board(size: Int? = null): Mat? {
        val corners = quad ?: return null
        return warpFromCorners(raw, models.of(models.default).geometryFor(corners), cornersFromFlat(corners), size)
    }
}

/** One instance per recording, frames in order, no second pass. Return the moves CERTAIN on this frame, in
 *  UCI; illegal ones are refused loudly. Nothing is always allowed — late scores, invented is the veto. */
interface ArenaTracker : AutoCloseable {
    fun onFrame(frame: FrameView): List<String>

    fun finish(): List<String> = emptyList()

    override fun close() {
    }
}
