package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureRequest
import android.util.Log
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera

/**
 * The optical state of the session: both stabilizers off, and whatever the USER set.
 *
 * A fixed camera over a calibrated board has no use for a moving picture, and each axis hurts in
 * its own way:
 *
 * - **Stabilization** (optical AND electronic) shifts the image against the board. The homography
 *   is computed once from the marker quad and every square crop is derived from it, so a stabilizer
 *   nudging the frame by a few pixels moves all 64 crops off their squares. This is the one setting
 *   turned off unconditionally, before the first frame — there is no state in which we want it.
 * - **Exposure and white balance** drift continuously in room light. A drift is not uniform across
 *   the frame — vignetting makes it strongest in the corners — so `normalize_diffs`, which removes
 *   the GLOBAL shift, leaves a coherent blob behind. Measured on a real recording: a diffuse
 *   corner drift 2.7 s after the first reference scored `a2 6.1 / a3 4.5` and committed a phantom
 *   `a3`, on a board where nothing had moved. Real moves in that same recording score 15-27.
 * - **Focus** hunting does the same thing with sharpness instead of brightness, and a refocus
 *   between the reference and the current frame changes every edge on the board at once.
 *
 * **The automatic freeze is gone, deliberately (2026-08-02).** This class used to watch the capture
 * results, wait for the device to report that exposure, white balance and focus had all settled,
 * and then lock them for the session — with a `remeasure()` escape hatch for when it settled on the
 * wrong moment. In practice it kept settling on the wrong moment: at start-up the board is often
 * not placed, a hand is in the frame or the lamp is not on yet, and the session then held that
 * picture. An automatic that is wrong often enough to need an escape hatch beside it is not an
 * automatic; it is a coin flip with extra machinery. So the whole convergence path was removed and
 * the axes are steered from the camera screen only.
 *
 * **The drift above did not go away with it.** Nothing here now stops exposure and white balance
 * from wandering — that is what the camera screen's focus, EV and illuminant controls are for, and
 * pinning them is no longer a convenience but the thing that keeps the frame-diff honest. A stated
 * value needs no convergence and no lock: it holds from the moment it is set.
 */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null

    /**
     * Brightness and illuminant. Its own owner ([CameraLookControl]) — the steering and the request
     * are different acts; this class only carries the values into the request it owns.
     */
    val looks = CameraLookControl(::applyOptions)

    /**
     * Static request options, applied for every frame of the session.
     *
     * Both stabilizers go off here rather than anywhere later because they must never be on, not
     * for a single frame: a frame the stabilizer shifted is a frame the tracker would diff against
     * an unshifted reference.
     */
    fun prepare(extender: Camera2Interop.Extender<*>) {
        extender
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
                CameraMetadata.CONTROL_VIDEO_STABILIZATION_MODE_OFF,
            ).setCaptureRequestOption(
                CaptureRequest.LENS_OPTICAL_STABILIZATION_MODE,
                CameraMetadata.LENS_OPTICAL_STABILIZATION_MODE_OFF,
            )
    }

    /**
     * Adopt the bound camera and re-assert the user's look.
     *
     * Every axis here is a STATED value, not a measured one, so there is nothing to wait for — the
     * want is simply re-applied to the new session. Zoom included: changing it invalidates the board
     * geometry, so the value that was calibrated under is the value that must come back after a
     * rebind (default 1.0, so nothing changes for anyone who never touched it). See [CameraLook].
     */
    fun attach(camera: Camera) {
        this.camera = camera
        looks.attach(camera)
        applyOptions()
    }

    fun detach() {
        camera = null
        looks.detach()
    }

    /**
     * Build and issue the whole repeating request from the user's look.
     *
     * One builder, because it is ONE request. Nothing is conditional on a lock any more: an axis the
     * user did not touch is left to the device's own automatic, which is exactly what "auto" means
     * on the camera screen.
     */
    private fun applyOptions() {
        val builder = CaptureRequestOptions.Builder()
        // A manual distance needs no freeze — it is a stated value, so it holds from the moment it
        // is set. Untouched, focus is left to the device: `AF_MODE_OFF` without a distance would
        // strand the lens wherever it happened to be.
        val distance = looks.focusDiopters()
        distance?.let {
            builder
                .setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_OFF)
                .setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, it)
        }
        // The one colour axis CameraX has no API for. A PRESET, not per-channel gains: the device
        // applies the gains AND the colour matrix its own tuning holds for it — see CameraLook.
        looks.awbMode()?.let { builder.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, it) }
        apply(builder.build(), said(distance))
    }

    private fun said(distance: Float?): String {
        val focus = distance?.let { ", focus %.3f dpt manual".format(it) } ?: ", focus auto"
        val look = looks.look.value
        val ev =
            looks.abilities.value
                ?.exposure
                ?.let { "%+.1f EV".format(it.ev(look.evIndex)) } ?: "index ${look.evIndex}"
        val brightness = if (look.evIndex == 0) "" else ", $ev"
        val colour = if (look.whiteBalance == WhiteBalance.AUTO) "" else ", ${look.whiteBalance.label}"
        val zoom = if (look.zoomRatio == 1f) "" else ", %.1fx zoom".format(look.zoomRatio)
        return "steered$focus$brightness$colour$zoom"
    }

    private fun apply(
        options: CaptureRequestOptions,
        what: String,
    ) {
        val control = camera?.cameraControl ?: return
        runCatching { Camera2CameraControl.from(control).setCaptureRequestOptions(options) }
            .onSuccess { log("optics $what") }
            .onFailure { Log.w(TAG, "optics request rejected by the device", it) }
    }

    internal companion object {
        const val TAG = "OpticsLock"
    }
}
