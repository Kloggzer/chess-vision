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
 * **Nothing is frozen here any more (2026-08-30).** The automatic converge-and-freeze went first
 * (2026-08-02: it kept settling on a board that was not placed yet), the padlock that replaced it
 * went with the vendor tag. `TrackerCamera.pinExposureTime` states the exposure TIME through
 * `iso_exp_priority` and `BoardExposureGovernor` steers the rest, so an AE lock would freeze what
 * already stands and stop the ISO from following the room. What is left against drift is a stated
 * value per axis — the user's call on the scene, not a blanket hold on the automatic.
 */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null

    /**
     * Die Distanz, auf die der Autofokus zuletzt gestellt hat, in Dioptrien.
     *
     * Seit dem Ausbau des Schlosses nur noch ein Messwert: gestellt wird allein eine GENANNTE
     * Distanz. Sie steht trotzdem in der Zeile, denn wanderndes Scharfstellen sieht im Frame-Diff
     * aus wie ein Zug, und ohne die Zahl ist es hinterher nicht zu belegen.
     */
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

    /**
     * Die Distanz, auf die der GERAETE-Autofokus konvergiert ist, oder null solange er sucht.
     *
     * `NOT_FOCUSED_LOCKED` gilt als null: die Kamera sagt damit selbst, dass sie nichts gefunden
     * hat, und ein Startpunkt aus einem gescheiterten Suchlauf ist schlechter als keiner.
     */
    private fun settledAutoFocus(): Float? {
        val result = focusResult ?: return null
        val state = result.get(CaptureResult.CONTROL_AF_STATE) ?: return null
        val done =
            state == CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED ||
                state == CameraMetadata.CONTROL_AF_STATE_PASSIVE_FOCUSED
        if (!done || result.get(CaptureResult.LENS_STATE) == CameraMetadata.LENS_STATE_MOVING) return null
        return result.get(CaptureResult.LENS_FOCUS_DISTANCE)
    }

    /** Der zuletzt protokollierte Belichtungszustand — gegen eine Zeile je Bild. */
    private var lastTraced: ExposureSetting? = null

    /**
     * Was die Automatik zuletzt gewaehlt hat. NUR zum Messen — gestellt wird die
     * Belichtungskorrektur, siehe [ExposureSetting].
     */
    @Volatile
    var observedExposure: ExposureSetting? = null
        private set

    /**
     * Brightness and illuminant. Its own owner ([CameraLookControl]) — the steering and the request
     * are different acts; this class only carries the values into the request it owns.
     */
    val looks = CameraLookControl(::applyOptions, ::focusReady, ::settledAutoFocus)

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
            ).setSessionCaptureCallback(callback)
    }

    /**
     * Liest die zwei Zahlen, die von aussen nicht zu erfragen sind: die Fokusdistanz fuer das
     * Schloss und den Belichtungszustand als Startpunkt der eigenen Automatik.
     *
     * Dieser Callback trug einmal die ganze Automatik — er wartete auf AE, AWB und AF und fror sie
     * ungefragt ein. Was bleibt, sind gemessene Werte, keine Entscheidungen.
     */
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

    /**
     * Zeit und ISO, sobald sich eine von beiden merklich bewegt.
     *
     * Wie die AE ihr Ziel auf Zeit und Verstaerkung aufteilt, stand bisher nur in der Zeile einer
     * VERSTELLUNG — und genau wenn die Regelung nichts tut, war sie unsichtbar. Das ISO treibt
     * ueber `busy` die Schwelle in `ChangeEvidence` (`docs/board-exposure.md`).
     */
    private fun traceExposure(seen: ExposureSetting) {
        val was = lastTraced
        val isoMoved = was == null || seen.iso > was.iso * ISO_STEP || seen.iso * ISO_STEP < was.iso
        if (!isoMoved && was.timeNs == seen.timeNs) return
        lastTraced = seen
        Log.i(TAG, "sensor %.1f ms ISO %d".format(seen.timeNs / 1e6, seen.iso))
    }

    /**
     * Adopt the bound camera and re-assert the user's look.
     *
     * Nothing here waits: every value is stated, so the whole request can go out at once. Zoom
     * included — changing it invalidates the board geometry, so the value it was calibrated under
     * is the value that must come back after a rebind (default 1.0, so nothing changes for anyone
     * who never touched it). See [CameraLook].
     */
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

    /**
     * Build and issue the whole repeating request from the user's look.
     *
     * An axis the user did not state is left to the device's own automatic, which is exactly what
     * "auto" means on the camera screen.
     */
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
        // The one colour axis CameraX has no API for. A PRESET, not per-channel gains: the device
        // applies the gains AND the colour matrix its own tuning holds for it — see CameraLook.
        looks.awbMode()?.let { builder.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, it) }
        apply(builder.build(), said(distance))
    }

    private fun said(distance: Float?): String {
        val look = looks.look.value
        // Der beobachtete Zustand steht IMMER in der Zeile: ohne ihn ist nach einer Sitzung nicht
        // zu sagen, wie viel Luft ueberhaupt da war — und genau daran hing der Befund, dass das
        // Geraet 30 von 66,7 moeglichen Millisekunden brachliegen laesst.
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
        /** Ab dieser relativen Aenderung ist ein neues ISO eine Meldung wert. */
        private const val ISO_STEP = 1.2

        const val TAG = "OpticsLock"
    }
}
