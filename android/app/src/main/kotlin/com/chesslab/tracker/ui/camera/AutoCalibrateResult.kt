package com.chesslab.tracker.ui.camera

import com.chesslab.tracker.geometry.ArucoCalibrator
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.MeasuredGeometry
import com.chesslab.tracker.ui.calibration.CalibrationHost

/** The one line the viewfinder shows over the picture after a press. */
fun AutoCalibrateResult.note(): String =
    when (this) {
        is AutoCalibrateResult.Done -> note
        is AutoCalibrateResult.Failed -> "Not calibrated · $why"
    }

/** What one press produced, in the words the viewfinder shows over the picture. */
sealed interface AutoCalibrateResult {
    data class Done(
        val note: String,
    ) : AutoCalibrateResult

    data class Failed(
        val why: String,
    ) : AutoCalibrateResult
}

/**
 * Re-measure the board quad from where the camera is now, and save it. One press, no wizard.
 *
 * This is the aiming screen's half of calibration and deliberately not all of it. It re-measures the
 * **quad** and carries the stored orientation and marker outsets over untouched — which is exactly
 * what makes it safe to run without a confirmation step. A wrong a8 assignment silently transposes
 * every label on the board, so `CalibrationViewModel` makes the orientation check unskippable; that
 * check is about which corner is a8, and moving the phone over the same board does not change the
 * answer. The full wizard stays where it is, one tap from the game, for the case where it does.
 *
 * It refines the quad on the board's own grooves before saving — the same `improveQuad` the manual
 * flow runs at its confirmation step, so the two cannot produce different geometry from the same
 * picture.
 *
 * `onRemeasured`, never `onCalibrated`: the optics on this screen are already converged and frozen,
 * usually to values the user just set by hand, and re-arming them would release the very lock this
 * quad was measured under.
 */
suspend fun autoCalibrate(
    host: CalibrationHost,
    store: CalibrationStore,
): AutoCalibrateResult {
    val detector = ArucoCalibrator(host.latestCalibrationFrame, store::geometry)
    val found =
        detector.detect()
            ?: return AutoCalibrateResult.Failed("no camera frame yet")
    if (!found.ok || found.corners.isEmpty()) {
        return AutoCalibrateResult.Failed(found.reason ?: "board not found")
    }
    // The grooves, not just the markers: the markers are glued on by hand and the quad they give is
    // a few pixels off the squares. See `specs/30-sharper-alignment`.
    val refined = detector.refine(found.corners)
    val corners = refined?.corners ?: found.corners
    val saved =
        store.saveRecalibrated(
            MeasuredGeometry(corners.copyOf(), found.frameWidth, found.frameHeight),
            savedAtMs = System.currentTimeMillis(),
        )
    host.onRemeasured(saved.geometry(), saved.corners, saved.name)
    val markers = "${found.markerIds.size} of 4 markers"
    val grid =
        refined?.let {
            val pct = { px: Double -> "${(px / it.cellPx * 100).toInt()}%" }
            if (it.applied) " · grid ${pct(it.beforePx)} → ${pct(it.afterPx)}" else " · grid ${pct(it.beforePx)}"
        } ?: ""
    return AutoCalibrateResult.Done("Calibrated · $markers$grid")
}
