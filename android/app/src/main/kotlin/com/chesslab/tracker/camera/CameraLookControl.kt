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

/** The camera's controls. The WANT outlives a rebind ([detach]/[attach] re-assert it): a rebind starts
 *  at device defaults. White balance and focus go through Camera2 interop — CameraX has no API for
 *  either — and [OpticsLock] owns the repeating request, so this class only hands the values over. */
@OptIn(ExperimentalCamera2Interop::class)
class CameraLookControl(
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

    /** `disableAutoCancel`: CameraX cancels metering after five seconds, before the counter-check confirms it. */
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

    /** Null for [WhiteBalance.AUTO]: the key stays UNSET, so "automatic" is the device's own default. */
    fun awbMode(): Int? = awbModeFor(want.value.whiteBalance)

    /** 0..1 maps onto 0..`LENS_INFO_MINIMUM_FOCUS_DISTANCE` (infinity to nearest) — the only device-independent map. */
    fun focusDiopters(): Float? = want.value.focus?.let { it * (offers.value?.minFocusDiopters ?: 0f) }

    /** Futures nobody awaits: a rejected value is the device's answer, and [look] is rendered either way. */
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
