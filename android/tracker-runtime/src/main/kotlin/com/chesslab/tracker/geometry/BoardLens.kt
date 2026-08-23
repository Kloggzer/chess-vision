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
 * `calib.npz`.~~ Those numbers (2026-07-21) were taken on the bare ArUco quad, before [refinedQuad]
 * was in this path, so they measured the two errors together. Re-measured 2026-08-07 with the grid
 * refit in place, on the rig at `boardSize` 1248 (limit 6.24 px), every figure a 60-frame median:
 *
 * | worst square offset | sitting A | sitting B, ~1 h later |
 * |---|---|---|
 * | raw | 4.91 · 4.93 · 5.46 | 4.68 · 4.86 · 5.14 |
 * | stored `calib.json` | 4.43 · 4.47 · 4.50 | 4.98 · 5.26 · 5.28 |
 * | **fitted from the board** | **3.91** | **3.54** |
 *
 * **The stored calibration's sign FLIPS between sittings — and that is the whole argument for this
 * function.** Within a sitting it is consistent (3 of 3 each way, spread <= 0.07 px) and between
 * them it reverses, while the raw column barely moves. The mechanism is visible in the fit itself:
 * k1 read -0.2622 and -0.2657 in sitting A and -0.2223 in sitting B. Nobody touched the camera. A
 * varifocal lens refocusing is a ~15 % change in distortion, so a stored file describes an optical
 * state that no longer exists, and whether it helps or hurts is a coin toss on when it was written.
 *
 * A fit taken from the board in the same minute wins BOTH times, by 1.2 px, because it cannot be
 * stale. That is the case for calibrating here rather than loading a file — not the earlier claim
 * that a stored lens is simply worse, which was one sitting's luck read as a property.
 *
 * The reconciliation with `specs/30` and `specs/41`, which both measured a stored lens making
 * things worse, is that the projective grid fit absorbs most of the distortion on its own: specs/41
 * took a real video from a median 29.83 px offset to 2.00 with no lens at all. What is left for the
 * optics to explain is ~1 px — small enough that measuring it before the quad was refit found the
 * opposite sign, and small enough that the board PASSES raw. This buys margin, not correctness.
 *
 * Costs, medians over 20 frames on the dev machine at `boardSize` 1248: `quadOf` **625 ms**
 * (dominated by the grid refit), groove sampling 88 ms, [fitLens] over 2874 points 152 ms. A
 * calibration is therefore ~15 s of wall clock, which a host needs to know before it decides
 * whether to show a spinner.
 *
 * Frames are pooled because the camera and the board are fixed: samples from twenty frames are
 * samples of the same geometry, and the pieces that hide a groove in one frame have moved by the
 * next. More lines seen is a better fit, which is why this collects before it fits.
 *
 * [borrowFrame] is a LOAN and not a getter, because the two hosts disagree about who owns the
 * pixels: a desktop `FrameSource.next()` hands back a Mat the source still owns and will overwrite,
 * while `CameraFrameBus.latestCalibrationFrame()` hands back a shared view the caller must release.
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

/**
 * Run [body], recording how long it took.
 *
 * The costs go out through [calibrateFromBoard]'s existing progress channel rather than through a
 * new parameter, because a caller that wants to know how it is going wants this too — a phone
 * deciding whether a calibration needs a progress indicator has exactly the same question as a CLI
 * printing a line. Nothing here is host-shaped.
 */
private inline fun <T> timed(
    into: MutableList<Double>,
    body: () -> T,
): T {
    val started = System.nanoTime()
    val out = body()
    into += (System.nanoTime() - started) / NANOS_PER_MS
    return out
}

/** Median, because a first call carries JIT and must not become the number people plan against. */
private fun ms(values: List<Double>): String = if (values.isEmpty()) "-" else "%.1f ms".format(values.sorted()[values.size / 2])

private const val NANOS_PER_MS = 1_000_000.0

/** Only the homography's scale; the returned points are in frame space either way. */
private const val PROBE_BOARD_SIZE = 800

/** Twenty frames of a fixed board: enough for occlusions to move, cheap enough to run at startup. */
private const val CALIBRATION_FRAMES = 20
