package com.chesslab.tracker.camera

import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraMetadata
import android.util.Log
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.SurfaceOrientedMeteringPointFactory
import com.chesslab.tracker.camera.FocusRegion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The camera's controls, held the way [TorchLamp] holds the lamp: a small owner of one concern,
 * attached to whatever camera is currently bound.
 *
 * Its own class rather than four fields on [OpticsLock] for the reason the lamp got one — that one
 * owns the repeating request and the stabilizers, and steering the camera is a different act.
 *
 * The WANT and the DEVICE are separate on purpose, the same rule again: a rebind (resolution change,
 * reconnect, downshift) starts the session at the device's defaults, so the want outlives [detach]
 * and [attach] re-asserts it.
 *
 * **Which API each axis uses, and why:**
 *
 * | axis | route | why |
 * |---|---|---|
 * | zoom | `CameraControl.setZoomRatio` | CameraX; range from `CameraInfo.zoomState` |
 * | brightness | `CameraControl.setExposureCompensationIndex` | CameraX; steers AE, never replaces it |
 * | torch | `CameraControl.enableTorch` (in [TorchLamp]) | CameraX |
 * | white balance | `CONTROL_AWB_MODE` preset | CameraX has no white-balance API at all |
 * | focus | `CONTROL_AF_MODE_OFF` + `LENS_FOCUS_DISTANCE` | CameraX can only ask AF to run, not to hold a distance |
 *
 * The two interop axes are capture-request options, and [OpticsLock] owns the repeating request, so
 * this class hands them over rather than issuing them itself.
 */
@OptIn(ExperimentalCamera2Interop::class)
class CameraLookControl(
    /** Re-issue the repeating capture request — [OpticsLock] owns it; this class owns the values. */
    private val reissue: () -> Unit,
    private val focusReady: () -> Boolean = { true },
    private val settledAutoFocus: () -> Float? = { null },
) : CameraLookPort {
    private val want = MutableStateFlow(CameraLook())
    private val offers = MutableStateFlow<CameraAbilities?>(null)
    private var camera: Camera? = null

    override val look: StateFlow<CameraLook> = want.asStateFlow()

    override val abilities: StateFlow<CameraAbilities?> = offers.asStateFlow()

    fun attach(bound: Camera) {
        camera = bound
        offers.value = read(bound)
        // The device is back at its defaults; the want is not. No re-issue — the caller is mid-bind
        // and builds the request itself.
        want.value = want.value.clampedTo(offers.value)
        applyCameraX()
    }

    fun detach() {
        camera = null
    }

    override fun focusReady(): Boolean = focusReady.invoke()

    /**
     * Den Geraete-Autofokus auf das Brett richten und laufen lassen.
     *
     * `disableAutoCancel`, weil CameraX die Messung sonst nach fuenf Sekunden zurueckdreht — der
     * Startpunkt waere dann schon wieder fort, bevor die Gegenprobe ihn bestaetigt hat.
     */
    override fun focusOn(region: FocusRegion): Boolean {
        val control = camera?.cameraControl ?: return false
        val point = SurfaceOrientedMeteringPointFactory(1f, 1f).createPoint(region.cx, region.cy, region.size)
        val action =
            FocusMeteringAction
                .Builder(point, FocusMeteringAction.FLAG_AF)
                .disableAutoCancel()
                .build()
        return runCatching {
            control.startFocusAndMetering(action)
            true
        }.getOrElse {
            Log.w(OpticsLock.TAG, "autofocus region rejected by the device", it)
            false
        }
    }

    /** Dioptrien zurueck auf die 0..1-Skala — dieselbe Abbildung wie [focusDiopters], invers. */
    override fun autoFocus(): Float? {
        val min = offers.value?.minFocusDiopters ?: return null
        if (min <= 0f) return null
        return settledAutoFocus()?.let { (it / min).coerceIn(0f, 1f) }
    }

    override fun setLook(next: CameraLook) {
        want.value = next.clampedTo(offers.value)
        applyCameraX()
        reissue()
    }

    /**
     * The `CONTROL_AWB_MODE` value, or null for [WhiteBalance.AUTO] — for which the key is left
     * UNSET rather than written as `CONTROL_AWB_MODE_AUTO`, so "automatic" means the device's own
     * default and not a second opinion about what automatic is.
     */
    fun awbMode(): Int? = awbModeFor(want.value.whiteBalance)

    /**
     * `LENS_FOCUS_DISTANCE` in diopters for a manual focus, or null while focus is automatic.
     *
     * 0..1 maps onto 0..`LENS_INFO_MINIMUM_FOCUS_DISTANCE`, i.e. infinity to the lens's nearest —
     * the same mapping the reference IP-camera app uses, and the only one that is device-independent.
     */
    fun focusDiopters(): Float? = want.value.focus?.let { it * (offers.value?.minFocusDiopters ?: 0f) }

    /**
     * The axes CameraX has an API for. Both return futures nobody awaits: a rejected zoom or an
     * out-of-range index is the device's answer, and the state to render is [look] either way.
     */
    private fun applyCameraX() {
        val control = camera?.cameraControl ?: return
        val look = want.value
        if (offers.value?.zoom != null) {
            runCatching { control.setZoomRatio(look.zoomRatio) }
                .onFailure { Log.w(OpticsLock.TAG, "zoom ${look.zoomRatio} rejected by the device", it) }
        }
        if (offers.value?.exposure != null) {
            runCatching { control.setExposureCompensationIndex(look.evIndex) }
                .onFailure { Log.w(OpticsLock.TAG, "exposure index ${look.evIndex} rejected by the device", it) }
        }
    }

    /** Everything the device advertises, asked once per bind. */
    private fun read(bound: Camera): CameraAbilities {
        val info = bound.cameraInfo
        val interop = Camera2CameraInfo.from(info)
        val ev = info.exposureState
        val zoom = info.zoomState.value
        val awb = interop.getCameraCharacteristic(CameraCharacteristics.CONTROL_AWB_AVAILABLE_MODES)?.toSet().orEmpty()
        return CameraAbilities(
            exposure =
                if (!ev.isExposureCompensationSupported) {
                    null
                } else {
                    ExposureRange(
                        indices = ev.exposureCompensationRange.lower..ev.exposureCompensationRange.upper,
                        stepEv = ev.exposureCompensationStep.toFloat(),
                    )
                },
            zoom = zoom?.takeIf { it.maxZoomRatio > it.minZoomRatio }?.let { it.minZoomRatio..it.maxZoomRatio },
            minFocusDiopters = interop.getCameraCharacteristic(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) ?: 0f,
            // AUTO always, then only the presets this device says it has — a mode it does not
            // advertise is silently ignored by the HAL, which reads to the user as a dead chip.
            whiteBalance = WhiteBalance.entries.filter { it == WhiteBalance.AUTO || awbModeFor(it) in awb },
            hasTorch = info.hasFlashUnit(),
        )
    }

    companion object {
        /** The framework constant for an illuminant, or null for [WhiteBalance.AUTO]. */
        fun awbModeFor(value: WhiteBalance): Int? =
            when (value) {
                WhiteBalance.AUTO -> null
                WhiteBalance.INCANDESCENT -> CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT
                WhiteBalance.WARM_FLUORESCENT -> CameraMetadata.CONTROL_AWB_MODE_WARM_FLUORESCENT
                WhiteBalance.FLUORESCENT -> CameraMetadata.CONTROL_AWB_MODE_FLUORESCENT
                WhiteBalance.DAYLIGHT -> CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT
                WhiteBalance.CLOUDY -> CameraMetadata.CONTROL_AWB_MODE_CLOUDY_DAYLIGHT
                WhiteBalance.SHADE -> CameraMetadata.CONTROL_AWB_MODE_SHADE
            }
    }
}
