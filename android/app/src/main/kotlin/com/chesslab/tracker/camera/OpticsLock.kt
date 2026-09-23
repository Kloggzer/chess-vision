package com.chesslab.tracker.camera

import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.TotalCaptureResult
import android.util.Log
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera

/** Stabilizers off before the first frame (a few pixels of shift move all 64 crops off their squares);
 *  AE/AWB drift leaves corner blobs that `normalize_diffs` cannot remove (a phantom `a3` at 6.1 against
 *  15-27 for real moves). Nothing is frozen: exposure TIME is pinned, `BoardExposureGovernor` steers. */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null

    /** Nur ein Messwert: wanderndes Scharfstellen sieht im Frame-Diff aus wie ein Zug. */
    @Volatile
    private var observedFocus: Float? = null

    @Volatile
    private var focusResult: TotalCaptureResult? = null

    private fun focusReady(): Boolean {
        val target = looks.focusDiopters() ?: return true
        val result = focusResult ?: return false
        // The HAL quantizes/clamps lens positions (this phone reports 0.0946 dpt for a 0-dpt
        // request). Match the applied REQUEST and lens state, not exact physical diopters.
        return result.get(CaptureResult.CONTROL_AF_MODE) == CameraMetadata.CONTROL_AF_MODE_OFF &&
            result.request.get(CaptureRequest.LENS_FOCUS_DISTANCE) == target &&
            result.get(CaptureResult.LENS_STATE) != CameraMetadata.LENS_STATE_MOVING
    }

    /** Null solange er sucht — und bei `NOT_FOCUSED_LOCKED`: ein gescheiterter Suchlauf ist kein Startpunkt. */
    private fun settledAutoFocus(): Float? {
        val result = focusResult ?: return null
        val state = result.get(CaptureResult.CONTROL_AF_STATE) ?: return null
        val done =
            state == CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED ||
                state == CameraMetadata.CONTROL_AF_STATE_PASSIVE_FOCUSED
        if (!done || result.get(CaptureResult.LENS_STATE) == CameraMetadata.LENS_STATE_MOVING) return null
        return result.get(CaptureResult.LENS_FOCUS_DISTANCE)
    }

    private var lastTraced: ExposureSetting? = null

    /** NUR zum Messen — gestellt wird die Belichtungskorrektur ([ExposureSetting]). */
    @Volatile
    var observedExposure: ExposureSetting? = null
        private set

    val looks = CameraLookControl(::applyOptions, ::focusReady, ::settledAutoFocus)

    /** Stabilizers off here, for every frame: a shifted frame would be diffed against an unshifted reference. */
    fun prepare(extender: Camera2Interop.Extender<*>) {
        extender
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
                CameraMetadata.CONTROL_VIDEO_STABILIZATION_MODE_OFF,
            ).setCaptureRequestOption(
                CaptureRequest.LENS_OPTICAL_STABILIZATION_MODE,
                CameraMetadata.LENS_OPTICAL_STABILIZATION_MODE_OFF,
            ).setSessionCaptureCallback(callback)
    }

    /** Liest, was von aussen nicht zu erfragen ist: Fokusdistanz und Belichtungszustand. Messwerte, keine Entscheidungen. */
    private val callback =
        object : CameraCaptureSession.CaptureCallback() {
            override fun onCaptureCompleted(
                session: CameraCaptureSession,
                request: CaptureRequest,
                result: TotalCaptureResult,
            ) {
                focusResult = result
                result.get(CaptureResult.LENS_FOCUS_DISTANCE)?.let { observedFocus = it }
                val time = result.get(CaptureResult.SENSOR_EXPOSURE_TIME)
                val iso = result.get(CaptureResult.SENSOR_SENSITIVITY)
                if (time != null && iso != null) {
                    val seen = ExposureSetting(time, iso)
                    observedExposure = seen
                    traceExposure(seen)
                }
            }
        }

    /** Zeit und ISO, sobald sich eine merklich bewegt: das ISO treibt ueber `busy` die Schwelle in `ChangeEvidence`. */
    private fun traceExposure(seen: ExposureSetting) {
        val was = lastTraced
        val isoMoved = was == null || seen.iso > was.iso * ISO_STEP || seen.iso * ISO_STEP < was.iso
        if (!isoMoved && was.timeNs == seen.timeNs) return
        lastTraced = seen
        Log.i(TAG, "sensor %.1f ms ISO %d".format(seen.timeNs / 1e6, seen.iso))
    }

    /** Nothing waits: every value is stated, so the request goes out at once. Zoom included — the board
     *  geometry was calibrated under it, so it must come back after a rebind. */
    fun attach(camera: Camera) {
        focusResult = null
        this.camera = camera
        looks.attach(camera)
        applyOptions()
    }

    fun detach() {
        camera = null
        focusResult = null
        looks.detach()
    }

    /** An axis the user did not state is left to the device's automatic — what "auto" means on the screen. */
    private fun applyOptions() {
        val builder = CaptureRequestOptions.Builder()
        // Nur eine GENANNTE Distanz haelt den Fokus: `AF_MODE_OFF` ohne Zahl strandet die Linse
        // dort, wo sie zufaellig steht.
        val distance = looks.focusDiopters()
        distance?.let {
            builder
                .setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_OFF)
                .setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, it)
        }
        // A PRESET, not per-channel gains: the device applies its own tuned colour matrix with it.
        looks.awbMode()?.let { builder.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, it) }
        apply(builder.build(), said(distance))
    }

    private fun said(distance: Float?): String {
        val look = looks.look.value
        // Der beobachtete Zustand steht IMMER in der Zeile: ohne ihn war nicht zu belegen, dass das Geraet
        // 30 von 66,7 moeglichen Millisekunden brachliegen laesst.
        val seen = observedExposure?.let { " (Sensor %.1f ms ISO %d)".format(it.timeNs / 1e6, it.iso) } ?: ""
        val head = "steered$seen"
        val focus =
            distance?.let { ", focus %.3f dpt manual".format(it) }
                ?: observedFocus?.let { ", focus auto (%.3f dpt)".format(it) } ?: ", focus auto"
        val ev =
            looks.abilities.value
                ?.exposure
                ?.let { "%+.1f EV".format(it.ev(look.evIndex)) } ?: "index ${look.evIndex}"
        val brightness = if (look.evIndex == 0) "" else ", $ev"
        val colour = if (look.whiteBalance == WhiteBalance.AUTO) "" else ", ${look.whiteBalance.label}"
        val zoom = if (look.zoomRatio == 1f) "" else ", %.1fx zoom".format(look.zoomRatio)
        return "$head$focus$brightness$colour$zoom"
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
        private const val ISO_STEP = 1.2

        const val TAG = "OpticsLock"
    }
}
