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
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicReference

/**
 * What a [OpticsLock.remeasure] ended up doing, for the screen that asked for one.
 *
 * Two cases, deliberately: the device reported a fresh convergence, or it did not report one in
 * time. There is no "partly converged" — freezing half a settled picture is the failure the lock
 * exists to prevent.
 */
sealed interface OpticsSettling {
    /** Focus, exposure and white balance settled again and are frozen. Diopters, where reported. */
    data class Converged(
        val focusDistance: Float?,
    ) : OpticsSettling

    /** Nothing settled in time. Whatever was frozen before is frozen again; nothing changed. */
    data object TimedOut : OpticsSettling
}

/**
 * One wait for the device's next "everything has settled", with a deadline.
 *
 * Split out of [OpticsLock] because it is the whole of the timeout rule and none of it needs a
 * camera — which is also what makes the rule testable. The deadline is not paranoia: a key the
 * device never populates counts as settled ([OpticsLock.settled]), but a key it populates and
 * never advances does not, and without a deadline the button that triggers a re-measure would
 * simply never come back.
 */
internal class ConvergenceWait(
    private val timeoutMs: Long,
) {
    private val pending = AtomicReference<CompletableDeferred<Unit>?>(null)

    /**
     * Arm the wait, run [start], and wait. True when convergence was reported before the deadline.
     *
     * Armed BEFORE [start] runs, so a device that converges the instant the freeze is released
     * cannot report into a wait that does not exist yet.
     */
    suspend fun await(start: () -> Unit): Boolean {
        val wait = CompletableDeferred<Unit>()
        pending.set(wait)
        return try {
            start()
            withTimeoutOrNull(timeoutMs) { wait.await() } != null
        } finally {
            pending.compareAndSet(wait, null)
        }
    }

    /** Reported from the capture callback. A signal nobody is waiting for is dropped, not queued. */
    fun onConverged() {
        pending.getAndSet(null)?.complete(Unit)
    }
}

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
 * policy of when the scene has changed enough to be worth re-converging. [remeasure] is the same
 * thing with an answer and a deadline, for the user who can see that the picture settled wrong.
 */
@OptIn(ExperimentalCamera2Interop::class)
class OpticsLock(
    private val log: (String) -> Unit = { Log.i(TAG, it) },
) {
    private var camera: Camera? = null

    /** Written on the camera thread, read by [remeasure] on the caller's. */
    @Volatile
    private var engaged = false

    /** Diopters, as the device reported them at convergence; null when the lens has no focuser. */
    @Volatile
    private var focusDistance: Float? = null

    private val wait = ConvergenceWait(REMEASURE_TIMEOUT_MS)

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

    /**
     * [rearm], but with an answer: release the freeze, wait for a fresh convergence, and report it.
     *
     * The escape hatch for a lock that settled on the wrong moment — a hand in the frame at
     * start-up, the board not yet placed, the light not yet on. Nothing here is automatic and
     * nothing here loops: one call, one sequence. The automatic path is what settled wrong.
     *
     * A caller that also re-measures the GEOMETRY must do it strictly after this returns
     * [OpticsSettling.Converged]. Focus breathing moves the image, so a marker quad measured while
     * the lens was still hunting describes a picture that is already gone — and a wrong quad
     * silently transposes every label.
     *
     * On a timeout the PREVIOUS lock is put back rather than left released: a camera that cannot be
     * re-measured is still better off frozen on a stale picture than drifting for the rest of the
     * session, and the caller is told that nothing changed.
     */
    suspend fun remeasure(): OpticsSettling {
        val previous = focusDistance
        val hadLock = engaged
        if (wait.await(::rearm)) return OpticsSettling.Converged(focusDistance)
        if (hadLock) {
            focusDistance = previous
            engaged = true
            log("optics re-measure timed out after $REMEASURE_TIMEOUT_MS ms — restoring the previous lock")
            engage()
        } else {
            log("optics re-measure timed out after $REMEASURE_TIMEOUT_MS ms — nothing was locked, still waiting")
        }
        return OpticsSettling.TimedOut
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
                    // AFTER the freeze: a caller waiting on a re-measure is waiting for the lock to
                    // be back ON, not merely for the three algorithms to have stopped moving.
                    wait.onConverged()
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
         * How long [remeasure] waits for the device before giving up.
         *
         * Long enough for a full AF sweep plus AE and AWB in room light, which is a second or two
         * on this hardware, and short enough that a camera which never converges does not hold a
         * button — and the user — for an unbounded time.
         */
        const val REMEASURE_TIMEOUT_MS = 5_000L

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
