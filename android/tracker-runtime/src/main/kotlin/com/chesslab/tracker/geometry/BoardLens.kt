package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.GridSample
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.MarkerTracker
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.boardCornersForFrame
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.fitLens
import com.chesslab.geometry.gridSamples
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.margins4
import org.opencv.core.Mat

// Finding the board in a frame, and calibrating the lens from the board already in it.

fun boardGeometryFor(quad: FloatArray): BoardGeometry =
    BoardGeometry(boardSize = measuredBoardSize(quad), margin = margins4(DEFAULT_MARKER_MARGIN))

/** A fresh [MarkerTracker] per call: its smoothing is for a running tracker, a one-shot must judge each frame. */
fun rawQuadOf(frame: Mat): FloatArray? =
    boardCornersForFrame(frame, BoardGeometry(boardSize = PROBE_BOARD_SIZE), MarkerTracker())
        ?.let { cornersToFlat(it) }

/** The margin is one constant for four hand-glued markers; `improveQuad` absorbs that error (specs/41: 29.6 px to
 *  2.0). Not read off the outer lines — the ones the detector is least sure of. This corrects one quad on one
 *  frame; `LiveAlign.onGrid` carries a rectified correction across a pose. */
fun refinedQuad(
    frame: Mat,
    quad: FloatArray,
): FloatArray {
    val geometry = boardGeometryFor(quad)
    val improved = improveQuad(frame, cornersFromFlat(quad), geometry).quad ?: return quad
    return cornersToFlat(improved)
}

fun quadOf(frame: Mat): FloatArray? = rawQuadOf(frame)?.let { refinedQuad(frame, it) }

/** The bow is what the fit minimises, so it cannot also be the proof. */
fun squareOffsetOf(
    frame: Mat,
    quad: FloatArray,
): Double = alignmentOf(frame, cornersFromFlat(quad), boardGeometryFor(quad)).worst

/** A stored calibration's sign FLIPS between sittings (k1 -0.262 then -0.222, nobody touched the camera); a fit
 *  from the board in the same minute won both times by 1.2 px. Costs ~15 s (`quadOf` 625 ms). [borrowFrame] is a
 *  LOAN: a desktop source owns and overwrites its Mat, the phone's bus hands a view the caller must release. */
fun calibrateFromBoard(
    borrowFrame: (use: (Mat) -> Unit) -> Boolean,
    width: Int,
    height: Int,
    frames: Int = CALIBRATION_FRAMES,
    onProgress: (String) -> Unit = {},
): LensFit? {
    val samples = mutableListOf<GridSample>()
    val quadMs = mutableListOf<Double>()
    val grooveMs = mutableListOf<Double>()
    var seen = 0
    repeat(frames) {
        val more =
            borrowFrame { frame ->
                val quad = timed(quadMs) { quadOf(frame) }
                val found =
                    timed(grooveMs) {
                        if (quad == null) emptyList() else gridSamples(frame, boardGeometryFor(quad), cornersFromFlat(quad))
                    }
                samples += found
                seen += 1
                if (found.isNotEmpty()) onProgress("frame $seen: ${found.size} groove samples")
            }
        if (!more) return@repeat
    }
    if (samples.isEmpty()) return null
    onProgress("per frame: quad ${ms(quadMs)}, grooves ${ms(grooveMs)}  (medians over $seen)")
    val fitMs = mutableListOf<Double>()
    val fit = timed(fitMs) { fitLens(samples, width, height) }
    onProgress("fit over ${samples.size} points: ${ms(fitMs)}")
    return fit
}

/** Costs go out through the progress channel: a phone deciding on a spinner asks the same as a CLI. */
private inline fun <T> timed(
    into: MutableList<Double>,
    body: () -> T,
): T {
    val started = System.nanoTime()
    val out = body()
    into += (System.nanoTime() - started) / NANOS_PER_MS
    return out
}

/** Median, because a first call carries JIT. */
private fun ms(values: List<Double>): String = if (values.isEmpty()) "-" else "%.1f ms".format(values.sorted()[values.size / 2])

private const val NANOS_PER_MS = 1_000_000.0

private const val PROBE_BOARD_SIZE = 800

private const val CALIBRATION_FRAMES = 20
