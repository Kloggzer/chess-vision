package com.chesslab.tracker.camera

import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.TotalCaptureResult
import android.util.Log
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera

/**
 * Freezes everything optical once the picture has settled: focus, exposure, white balance, zoom
 * and both stabilizers.
 *
 * A fixed camera over a calibrated board has no use for any of them, and each one actively hurts:
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
 * Locking is deferred until the device reports its own converge, rather than being forced at bind:
 * a lock applied to an unconverged picture freezes the WRONG exposure, which is worse than not
 * locking at all. [rearm] releases everything and starts that wait over — the caller owns the
 * policy of when the scene has changed enough to be worth re-converging.
 */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null
    private var engaged = false

    /** Diopters, as the device reported them at convergence; null when the lens has no focuser. */
    private var focusDistance: Float? = null

    /**
     * Static request options, applied for every frame of the session.
     *
     * Both stabilizers go off here rather than in [engage] because they must never be on, not even
     * during the convergence window: a frame the stabilizer shifted is a frame the tracker would
     * diff against an unshifted reference.
     */
    fun prepare(extender: Camera2Interop.Extender<*>) {
        engaged = false
        focusDistance = null
        extender
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
                CameraMetadata.CONTROL_VIDEO_STABILIZATION_MODE_OFF,
            ).setCaptureRequestOption(
                CaptureRequest.LENS_OPTICAL_STABILIZATION_MODE,
                CameraMetadata.LENS_OPTICAL_STABILIZATION_MODE_OFF,
            ).setSessionCaptureCallback(callback)
    }

    /**
     * Adopt the bound camera and pin the zoom.
     *
     * Zoom is the one member of this set that needs no convergence — 1.0 is the calibrated state by
     * definition, since the profile's marker quad was measured at whatever zoom was in force. It is
     * also the only one a stray UI gesture could change later.
     */
    fun attach(camera: Camera) {
        this.camera = camera
        camera.cameraControl.setZoomRatio(1.0f)
    }

    /** Release the lock and wait for a fresh convergence. For a recalibration or a light change. */
    fun rearm() {
        engaged = false
        focusDistance = null
        apply(CaptureRequestOptions.Builder().build(), "released — waiting for a fresh converge")
    }

    fun detach() {
        camera = null
        engaged = false
    }

    private val callback =
        object : CameraCaptureSession.CaptureCallback() {
            override fun onCaptureCompleted(
                session: CameraCaptureSession,
                request: CaptureRequest,
                result: TotalCaptureResult,
            ) {
                if (!engaged && converged(result)) {
                    engaged = true
                    focusDistance = result.get(CaptureResult.LENS_FOCUS_DISTANCE)
                    engage()
                }
            }
        }

    private fun converged(result: TotalCaptureResult): Boolean =
        settled(
            result.get(CaptureResult.CONTROL_AE_STATE),
            result.get(CaptureResult.CONTROL_AWB_STATE),
            result.get(CaptureResult.CONTROL_AF_STATE),
        )

    private fun engage() {
        val builder =
            CaptureRequestOptions
                .Builder()
                .setCaptureRequestOption(CaptureRequest.CONTROL_AE_LOCK, true)
                .setCaptureRequestOption(CaptureRequest.CONTROL_AWB_LOCK, true)
        val distance = focusDistance
        val what =
            if (distance != null && hasFocuser()) {
                // AF_MODE_OFF alone would leave the lens wherever it happens to be; the distance
                // the device just converged on is the value that keeps the CURRENT picture sharp.
                builder
                    .setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_OFF)
                    .setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, distance)
                "focus %.3f dpt, exposure, white balance".format(distance)
            } else {
                "exposure, white balance (fixed-focus lens)"
            }
        apply(builder.build(), "locked: $what")
    }

    private fun hasFocuser(): Boolean {
        val info = camera?.cameraInfo ?: return false
        val min = Camera2CameraInfo.from(info).getCameraCharacteristic(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
        return min != null && min > 0f
    }

    private fun apply(
        options: CaptureRequestOptions,
        what: String,
    ) {
        val control = camera?.cameraControl ?: return
        runCatching { Camera2CameraControl.from(control).setCaptureRequestOptions(options) }
            .onSuccess { log("optics $what") }
            .onFailure { Log.w(TAG, "optics lock rejected by the device", it) }
    }

    internal companion object {
        const val TAG = "OpticsLock"

        /**
         * Have all three algorithms finished, so that freezing them freezes the RIGHT picture?
         *
         * A key the device does not report cannot be waited for, so a null state counts as settled.
         * That is deliberate rather than lenient: several devices never populate `CONTROL_AF_STATE`
         * on a fixed-focus lens, and a stricter reading would leave the optics running free forever
         * on exactly those devices — the failure mode this class exists to prevent.
         */
        fun settled(
            ae: Int?,
            awb: Int?,
            af: Int?,
        ): Boolean =
            (ae == null || ae in AE_SETTLED) &&
                (awb == null || awb in AWB_SETTLED) &&
                (af == null || af in AF_SETTLED)

        /** `FLASH_REQUIRED` is a settled state too — it means AE finished and wants a flash we have. */
        val AE_SETTLED =
            setOf(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AE_STATE_FLASH_REQUIRED,
                CameraMetadata.CONTROL_AE_STATE_LOCKED,
            )
        val AWB_SETTLED =
            setOf(
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_LOCKED,
            )

        /** `INACTIVE` covers the fixed-focus lens that never runs an AF algorithm at all. */
        val AF_SETTLED =
            setOf(
                CameraMetadata.CONTROL_AF_STATE_INACTIVE,
                CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED,
                CameraMetadata.CONTROL_AF_STATE_PASSIVE_FOCUSED,
            )
    }
}
