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
 * **The freeze is on a BUTTON now, not on a timer (2026-08-02).** This class used to watch the
 * capture results, wait for the device to report that everything had settled, and then lock it for
 * the session — with a `remeasure()` escape hatch for when it settled on the wrong moment. It kept
 * settling on the wrong moment: at start-up the board is often not placed, a hand is in the frame
 * or the lamp is not on yet, and the session then held that picture. An automatic that needs an
 * escape hatch beside it is a coin flip with extra machinery.
 *
 * What replaces it is [CameraLook.locked] — the same AE/AWB lock and the same focus pin, applied
 * when the user presses the padlock. The mechanism was never wrong; the trigger was. Locking on a
 * press means locking a picture somebody actually looked at.
 *
 * Unlocked, nothing here stops exposure and white balance from wandering, and the drift above is
 * real. The padlock is what keeps the frame-diff honest, and it is the user's call when to close
 * it.
 */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null

    /**
     * The distance the device's autofocus last reported, in diopters.
     *
     * Read from every capture result and used for one thing: when the padlock closes, THIS is what
     * the focus is pinned at. `AF_MODE_OFF` without a distance would strand the lens wherever it
     * happened to be, so a lock with nothing to pin would be worse than no lock. Written on the
     * camera thread, read when the request is rebuilt.
     */
    @Volatile
    private var observedFocus: Float? = null

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
     * Nothing here waits: every value is either stated or a lock flag, so the whole request can go
     * out at once. Zoom included — changing it invalidates the board geometry, so the value it was
     * calibrated under is the value that must come back after a rebind (default 1.0, so nothing
     * changes for anyone who never touched it). See [CameraLook].
     *
     * A lock survives a rebind as a FLAG, but the pinned focus distance does not survive as a
     * number: [observedFocus] starts empty on a new session and fills again from the first capture
     * results. That is the honest behaviour — the old distance described the old session's lens.
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
     * One builder, because it is ONE request — the lock and the steered values are not two acts.
     * An axis the user neither stated nor locked is left to the device's own automatic, which is
     * exactly what "auto" means on the camera screen.
     */
    private fun applyOptions() {
        val builder = CaptureRequestOptions.Builder()
        val locked = looks.look.value.locked
        if (locked) {
            builder.setCaptureRequestOption(CaptureRequest.CONTROL_AE_LOCK, true)
            // AWB_LOCK freezes the white-balance ALGORITHM at its last values, which on this device
            // also suppresses a later change of `CONTROL_AWB_MODE`: measured, Bulb (2 700 K) and
            // Shade (7 500 K) rendered identically under the lock (mean R/B 1.841 against 1.851)
            // while both differed from automatic. A pinned illuminant does not drift, so the lock
            // buys nothing there and costs the whole control.
            builder.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_LOCK, !looks.illuminantPinned)
        }
        // Focus, from whichever source has one. A MANUAL distance wins and needs no lock — it is a
        // stated value, so it holds from the moment it is set. Otherwise the padlock pins whatever
        // the autofocus last reported; unlocked and unstated, focus is left to the device.
        val distance = looks.focusDiopters() ?: observedFocus.takeIf { locked && looks.canFocus }
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
        val head = (if (look.locked) "locked: exposure, white balance" else "steered") + seen
        val focus =
            distance?.let { ", focus %.3f dpt%s".format(it, if (look.focus != null) " manual" else " held") }
                ?: ", focus auto"
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
