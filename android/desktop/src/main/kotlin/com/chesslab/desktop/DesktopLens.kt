package com.chesslab.desktop

import com.chesslab.geometry.LensModel
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.toModel
import com.chesslab.tracker.geometry.LensLoad
import com.chesslab.tracker.geometry.LensMode
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.decodeLens
import com.chesslab.tracker.geometry.lensFor
import com.chesslab.tracker.geometry.model
import java.io.File

// Where a run's optics come from: measured from the footage, or loaded for a named camera.
//
// Two sources and one rule between them — a fit from the board cannot be stale and a stored file
// can, so the fit wins wherever both are available. Neither is applied by the frame source; both
// go through `Stage.LENS`, which is the one place a correction is visible and measurable.

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

/**
 * The rig's optics if they may be applied here, and the REASON printed when they may not.
 *
 * Everything the decision needs sits in one place on purpose: the stored file, the delivered size
 * and the camera it is being asked about. `Undistorter` deliberately has no checks of its own — a
 * `require` on the frame path turns a configuration mistake into a dead tracker — so this is the
 * only gate, and it must never fail quietly.
 *
 * `LensMode.ON` rather than AUTO because the user typed the command. `data/lens/calib.json` was
 * written before a calibration recorded which camera it came from, so its `camera` is empty; AUTO
 * refuses that on principle and ON accepts it, treating the human as the identity check. A file
 * naming a DIFFERENT camera is refused either way.
 */
internal fun openLens(
    source: FrameSource,
    camera: String,
    wanted: Boolean,
): Undistorter? {
    val size = source.delivered
    val stored =
        when (val read = decodeLens(File(LENS_CALIBRATION).takeIf { it.isFile }?.readText())) {
            is LensLoad.Ok -> read.calibration
            is LensLoad.Refused -> return refuse(read.reason)
            LensLoad.Absent -> null
        }
    val mode = if (wanted) LensMode.ON else LensMode.OFF
    return when (val verdict = lensFor(stored, mode, camera, size.width, size.height)) {
        is LensLoad.Ok -> {
            val cal = verdict.calibration
            println("lens: ${cal.width}x${cal.height}, rms ${"%.2f".format(cal.rms)} px")
            Undistorter(cal.model(), size.width, size.height)
        }
        is LensLoad.Refused -> refuse(verdict.reason)
        LensLoad.Absent -> refuse("none stored at $LENS_CALIBRATION")
    }
}

internal fun refuse(reason: String): Undistorter? {
    println("no lens applied — $reason")
    return null
}

/** What a stored calibration has to name to be reusable here. Size is not identity; this is. */
internal fun cameraToken(index: Int): String = "webcam:$index"

/** Written by `chesslab lens calibrate`, exported to JSON because Kotlin does not read npz. */
private const val LENS_CALIBRATION = "../../data/lens/calib.json"
