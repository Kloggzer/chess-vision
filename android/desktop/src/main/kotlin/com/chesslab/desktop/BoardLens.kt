package com.chesslab.desktop

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.GridSample
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.fitLens
import com.chesslab.geometry.gridSamples
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import com.chesslab.tracker.geometry.measuredBoardSize
import org.opencv.core.Mat

/**
 * The lens, calibrated from the board that is already in the picture.
 *
 * A stored calibration assumes the optics do not move. This rig's do — a varifocal lens changes the
 * barrel effect with zoom and focus — and the stored one measurably makes it WORSE: 15.1 px worst
 * square offset raw against 21.7 px with `calib.npz` (2026-07-21, rms 5.46).
 *
 * This replaces a search that scored candidates by `alignmentOf(...).worst`. That is a residual
 * AFTER a homography, so it traded against focal length and had to be gridded over it, and a lens
 * error could not be told from a board-geometry error. Straightness cannot be absorbed by any
 * homography and does not depend on focal length at all, so the fit has one job.
 *
 * Frames are pooled: the camera and the board are fixed, so samples from twenty frames are samples
 * of the same geometry, and the pieces that hide a groove in one frame have moved by the next.
 * More lines seen is a better fit, which is why this collects before it fits.
 */
fun calibrateFromBoard(
    source: FrameSource,
    frames: Int = CALIBRATION_FRAMES,
    onProgress: (String) -> Unit = {},
): LensFit? {
    val samples = mutableListOf<GridSample>()
    var seen = 0
    repeat(frames) {
        val frame = source.next() ?: return@repeat
        val quad = quadOf(frame) ?: return@repeat
        val geometry = boardGeometryFor(quad)
        val found = gridSamples(frame, geometry, cornersFromFlat(quad))
        samples += found
        seen += 1
        if (found.isNotEmpty()) onProgress("frame $seen: ${found.size} groove samples")
    }
    if (samples.isEmpty()) return null
    val first = source.delivered
    return fitLens(samples, first.width, first.height)
}

/** The board's geometry for a quad: measured size, the marker outset the profile records. */
fun boardGeometryFor(quad: FloatArray): BoardGeometry =
    BoardGeometry(boardSize = measuredBoardSize(quad), margin = margins4(DEFAULT_MARKER_MARGIN))

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
 */
fun refinedQuad(
    frame: Mat,
    quad: FloatArray,
): FloatArray {
    val geometry = boardGeometryFor(quad)
    val improved = improveQuad(frame, cornersFromFlat(quad), geometry).quad ?: return quad
    return cornersToFlat(improved)
}

/**
 * The independent verdict.
 *
 * The bow is what the fit minimises, so it cannot also be the proof — a model can always be made to
 * flatten its own objective. `alignmentOf` asks a different question of the same picture: how far is
 * each of the 64 squares from where the board's own grid says it is.
 */
fun squareOffsetOf(
    frame: Mat,
    quad: FloatArray,
): Double = alignmentOf(frame, cornersFromFlat(quad), boardGeometryFor(quad)).worst

/** Twenty frames of a fixed board: enough for occlusions to move, cheap enough to run at startup. */
private const val CALIBRATION_FRAMES = 20
