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

// Finding the board in a frame, and calibrating the lens from the board that is already in it.
//
// This was `:desktop` code, and it had no business being there: none of it names a camera, a file or
// a host. It sits beside `CalibrationProfile` and `CalibrationStore` because it uses their two
// constants — DEFAULT_MARKER_MARGIN and measuredBoardSize — which the move turns from a
// cross-module import into a same-package one.

/** The board's geometry for a quad: measured size, the marker outset the profile records. */
fun boardGeometryFor(quad: FloatArray): BoardGeometry =
    BoardGeometry(boardSize = measuredBoardSize(quad), margin = margins4(DEFAULT_MARKER_MARGIN))

/**
 * The markers alone, before the grid has had a say.
 *
 * Any board size will do: `boardCornersForFrame` returns FRAME-space points, and the size only
 * scales the homography it fits them through. A fresh [MarkerTracker] per call on purpose — its
 * smoothing is for a running tracker, and a one-shot measurement must judge each frame on its own
 * rather than on a blend of the ones before it.
 */
fun rawQuadOf(frame: Mat): FloatArray? =
    boardCornersForFrame(frame, BoardGeometry(boardSize = PROBE_BOARD_SIZE), MarkerTracker())
        ?.let { cornersToFlat(it) }

/**
 * The quad the markers give, corrected by the board's own grid.
 *
 * The ArUco quad carries whatever the marker outset is wrong by — the margin is a single constant
 * for four markers glued on by hand. `improveQuad` measures the grid and moves the quad onto it,
 * which absorbs that error without anyone having to estimate it, and it is the machinery specs/41
 * took a real video from a median 29.6 px offset to 2.0 with. It never returns a worse quad.
 *
 * Reading the outset directly from the outer grid lines would be the other route, and it is the
 * brittle one: those two lines are exactly the ones the detector is least sure of — the search
 * window for them is deliberately tighter (0.15 of a cell against 0.25) because the board's printed
 * label border sits about a third of a cell outside them. A fit over eighteen lines survives an
 * outlier; a reading off two does not.
 *
 * This is a SECOND caller of `improveQuad`, not a second implementation of it. `LiveAlign.onGrid`
 * is the other, and it means something different: it measures a rectified-space correction once per
 * pose and carries it onto every later quad for free. This corrects one quad on one frame, which is
 * what a one-shot measurement wants and what a running tracker must not do per frame.
 */
fun refinedQuad(
    frame: Mat,
    quad: FloatArray,
): FloatArray {
    val geometry = boardGeometryFor(quad)
    val improved = improveQuad(frame, cornersFromFlat(quad), geometry).quad ?: return quad
    return cornersToFlat(improved)
}

/** The board in this frame, markers first and then the grooves. */
fun quadOf(frame: Mat): FloatArray? = rawQuadOf(frame)?.let { refinedQuad(frame, it) }

/**
 * The independent verdict.
 *
 * The bow is what the lens fit minimises, so it cannot also be the proof — a model can always be
 * made to flatten its own objective. `alignmentOf` asks a different question of the same picture:
 * how far is each of the 64 squares from where the board's own grid says it is.
 */
fun squareOffsetOf(
    frame: Mat,
    quad: FloatArray,
): Double = alignmentOf(frame, cornersFromFlat(quad), boardGeometryFor(quad)).worst

/**
 * The lens, from lines that are straight in the world.
 *
 * A stored calibration assumes the optics do not move, and the rig's do — a varifocal lens changes
 * the barrel effect with zoom and focus. That is still the reason to fit from the board rather than
 * to trust a file.
 *
 * ~~The stored one measurably makes it WORSE: 15.1 px worst square offset raw against 21.7 px with
 * `calib.npz`.~~ **Overturned 2026-08-07, and the missing variable was [refinedQuad].** Those
 * numbers (2026-07-21) were taken on the bare ArUco quad, before the grid refit was in this path.
 * With it, on the rig at `boardSize` 1248 (limit 6.24 px), every figure a 60-frame median:
 *
 * | worst square offset | |
 * |---|---|
 * | raw | 4.92 - 4.97 px |
 * | stored `calib.json` | 4.47 px |
 * | **fitted from the board, here** | **3.91 px** |
 *
 * Within a condition the run-to-run spread is <= 0.07 px, so the ordering is not noise; it held in
 * three of three paired runs, and the fit reproduced k1 to 0.013 across two calibrations
 * (-0.2622, -0.2657) from 18 of 18 lines and ~2875 points. The board PASSES raw — this buys about
 * 20 %, not correctness.
 *
 * The reconciliation with `specs/30` and `specs/41`, which both measured a stored lens making
 * things worse, is that the projective grid fit absorbs most of the distortion on its own: specs/41
 * took a real video from a median 29.83 px offset to 2.00 with no lens at all. What is left for the
 * optics to explain is small — which is why it needs a spread this tight to see, and why measuring
 * it before the quad was refit found the opposite sign.
 *
 * Frames are pooled because the camera and the board are fixed: samples from twenty frames are
 * samples of the same geometry, and the pieces that hide a groove in one frame have moved by the
 * next. More lines seen is a better fit, which is why this collects before it fits.
 *
 * [borrowFrame] is a LOAN and not a getter, because the two hosts disagree about who owns the
 * pixels: a desktop `FrameSource.next()` hands back a Mat the source still owns and will overwrite,
 * while `CameraFrameBus.latestCalibrationFrame()` hands back a clone the caller must release.
 * Wrapping it as "call me with a frame, I will not keep it" lets each host keep its own rule
 * instead of one of them being quietly wrong. It returns false when the stream is over.
 */
fun calibrateFromBoard(
    borrowFrame: (use: (Mat) -> Unit) -> Boolean,
    width: Int,
    height: Int,
    frames: Int = CALIBRATION_FRAMES,
    onProgress: (String) -> Unit = {},
): LensFit? {
    val samples = mutableListOf<GridSample>()
    var seen = 0
    repeat(frames) {
        val more =
            borrowFrame { frame ->
                val quad = quadOf(frame)
                val found = if (quad == null) emptyList() else gridSamples(frame, boardGeometryFor(quad), cornersFromFlat(quad))
                samples += found
                seen += 1
                if (found.isNotEmpty()) onProgress("frame $seen: ${found.size} groove samples")
            }
        if (!more) return@repeat
    }
    if (samples.isEmpty()) return null
    return fitLens(samples, width, height)
}

/** Only the homography's scale; the returned points are in frame space either way. */
private const val PROBE_BOARD_SIZE = 800

/** Twenty frames of a fixed board: enough for occlusions to move, cheap enough to run at startup. */
private const val CALIBRATION_FRAMES = 20
