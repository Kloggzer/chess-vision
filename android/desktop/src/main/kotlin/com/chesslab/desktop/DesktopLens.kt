package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.toModel
import com.chesslab.tracker.geometry.calibrateFromBoard

// Where a run's optics come from: measured from the footage it is about to process.
//
// There used to be a second source, a stored `data/lens/calib.json`, and a rule between them. The
// verb that wrote that file went on 2026-08-20 and the reader followed on 2026-08-21 — a fit from
// the board cannot go stale, which was the whole argument for preferring it anyway. The frame
// source never applies it; it goes through `Stage.LENS`, where a correction is visible and timed.

/**
 * The lens, measured from the board this footage is of.
 *
 * It consumes the source's first frames, which the tracker then does not see — twenty of them,
 * against a board that has not been touched yet. The camera and the board are fixed, so they are
 * twenty samples of one geometry, and a groove hidden by a piece in one frame is visible in the
 * next.
 *
 * Null when the board cannot be found or the fit does not beat an uncorrected picture by the
 * required margin. That gate is `LensFit.ok`, and it is deliberately NOT the proof: the bow is
 * what the fit minimises, so only the square offset says whether it helped.
 */
internal fun fitLensFrom(source: FrameSource): LensModel? {
    val size = source.delivered
    val fit =
        calibrateFromBoard(
            { use -> source.next()?.also(use) != null },
            size.width,
            size.height,
        ) { println("  $it") }
    if (fit == null) {
        println("no lens: the board's markers never decoded in the first frames")
        return null
    }
    println(
        "lens from the board: ${fit.evidence}; bow ${"%.5f".format(fit.bowBefore)} → " +
            "${"%.5f".format(fit.bowAfter)}, k1=${"%.4f".format(fit.k1)} k2=${"%.4f".format(fit.k2)}",
    )
    if (fit.rejected != null || !fit.ok) {
        println("no lens: ${fit.rejected ?: "the bow did not improve by the required margin"}")
        return null
    }
    return fit.toModel()
}

internal fun refuse(reason: String): Undistorter? {
    println("no lens applied — $reason")
    return null
}
