package com.chesslab.arena

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.warpFromCorners
import org.opencv.core.Mat

/**
 * What a tracker sees of one frame. Everything on it is CAUSAL — the arena hands frames over in
 * order and nothing here can reach forward.
 *
 * [raw] and anything derived from it is valid only for the duration of one [ArenaTracker.onFrame]
 * call; the arena reuses the buffers. Copy what you want to keep.
 */
class FrameView(
    val index: Long,
    val tsMs: Double,
    val fps: Double,
    val raw: Mat,
    /** The board's four corners in frame pixels (`a8, h8, h1, a1`), or null when it was not found. */
    val quad: FloatArray?,
    private val models: Models,
) {
    /** What [squares] reads when you name no model. */
    val model: String get() = models.default

    /** Column names of a [squares] row; the last one is the coverage sigmoid, not a class. */
    fun classes(model: String = models.default): List<String> = models.of(model).classes

    /** The coverage above which this model's own class read is not worth having. */
    fun coverageGate(model: String = models.default): Double? = models.of(model).coverageGate

    fun geometry(model: String = models.default): BoardGeometry? = quad?.let { models.of(model).geometryFor(it) }

    private val cached = HashMap<String, Array<FloatArray>>()

    /**
     * The classifier over all 64 squares, `a1..h8`, or null without a board.
     *
     * COSTS REAL TIME (~20-40 ms for the board) and the arena counts every call, per model: a
     * tracker that asks on every frame is not one that can run on a phone. Cached per frame and
     * per model, so asking twice for the same thing is free.
     */
    fun squares(model: String = models.default): Array<FloatArray>? {
        val corners = quad ?: return null
        cached[model]?.let { return it }
        models.counted(model)
        val vision = models.of(model)
        return vision.readSquares(raw, corners, vision.geometryFor(corners)).also { cached[model] = it }
    }

    /** The rectified board as an image, `size` px on a side. The CALLER releases it. */
    fun board(size: Int? = null): Mat? {
        val corners = quad ?: return null
        return warpFromCorners(raw, models.of(models.default).geometryFor(corners), cornersFromFlat(corners), size)
    }
}

/**
 * The thing to build. One instance per recording, frames in order, no second pass.
 *
 * Return the moves that became CERTAIN on this frame, in UCI (`e2e4`, `e7e8q`). The arena keeps
 * the board: it pushes what you return and rejects anything illegal, loudly. Returning nothing is
 * always allowed — a late move still scores, an invented one is the veto.
 */
interface ArenaTracker : AutoCloseable {
    fun onFrame(frame: FrameView): List<String>

    /** Anything still held back when the video ends. Usually empty. */
    fun finish(): List<String> = emptyList()

    override fun close() {
        // no-op by default
    }
}
