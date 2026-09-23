package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.toModel
import com.chesslab.tracker.geometry.calibrateFromBoard

// Where a run's optics come from: measured from the footage it is about to process. The frame source never
// applies it; it goes through `Stage.LENS`, where a correction is visible and timed.

/** Consumes twenty frames the tracker then does not see — camera and board are fixed. Null when the fit does not
 *  beat an uncorrected picture; `LensFit.ok` is NOT the proof, only the square offset says whether it helped. */
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
