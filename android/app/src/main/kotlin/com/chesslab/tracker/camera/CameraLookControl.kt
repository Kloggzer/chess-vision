package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import android.util.Log
import androidx.camera.core.Camera
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Brightness and illuminant, held the way [TorchLamp] holds the lamp: a small owner of one concern,
 * attached to whatever camera is currently bound.
 *
 * Its own class rather than three fields on [OpticsLock] for the reason the lamp got one — the lock
 * owns the 3A FREEZE, and steering the automatic is a different act with a different lifetime. The
 * freeze is earned once, at convergence; a look is asserted immediately and survives every rebind.
 *
 * The WANT and the DEVICE are separate on purpose, the same rule again: a rebind (resolution change,
 * reconnect, downshift) starts the session at the device's defaults, so the want outlives [detach]
 * and [attach] re-asserts it.
 *
 * Only ONE of the two axes reaches the device through `Camera2Interop`. See [CameraLook] for the
 * measurement that decided it.
 */
class CameraLookControl(
    /**
     * Re-issue the repeating capture request. The white-balance half is a capture-request option and
     * [OpticsLock] owns that request; this class owns the value, not the plumbing.
     */
    private val reissue: () -> Unit,
) : CameraLookPort {
    private val want = MutableStateFlow(CameraLook())
    private val range = MutableStateFlow<ExposureRange?>(null)
    private var camera: Camera? = null

    override val look: StateFlow<CameraLook> = want.asStateFlow()

    override val exposure: StateFlow<ExposureRange?> = range.asStateFlow()

    /**
     * True while an illuminant is pinned, which means auto-white-balance has nothing left to do.
     *
     * [OpticsLock.converged] needs it: with `CONTROL_AWB_MODE` set to a preset the device reports
     * `CONTROL_AWB_STATE` as `INACTIVE`, which is not a settled state, so a re-measure would run to
     * its deadline and restore the previous lock every single time.
     */
    val illuminantPinned: Boolean get() = want.value.whiteBalance != WhiteBalance.AUTO

    fun attach(bound: Camera) {
        camera = bound
        val state = bound.cameraInfo.exposureState
        range.value =
            if (!state.isExposureCompensationSupported) {
                null
            } else {
                ExposureRange(
                    indices = state.exposureCompensationRange.lower..state.exposureCompensationRange.upper,
                    stepEv = state.exposureCompensationStep.toFloat(),
                )
            }
        // The device is back at its defaults; the want is not. Re-assert without a re-issue — the
        // caller is mid-bind and will build the request itself.
        want.value = want.value.clampedTo(range.value)
        applyExposure()
    }

    fun detach() {
        camera = null
    }

    override fun setLook(next: CameraLook) {
        want.value = next.clampedTo(range.value)
        applyExposure()
        reissue()
    }

    /**
     * The `CONTROL_AWB_MODE` value, or null for [WhiteBalance.AUTO] — for which the key is left
     * UNSET rather than written as `CONTROL_AWB_MODE_AUTO`, so "automatic" means the device's own
     * default and not a second opinion about what automatic is.
     */
    fun awbMode(): Int? =
        when (want.value.whiteBalance) {
            WhiteBalance.AUTO -> null
            WhiteBalance.INCANDESCENT -> CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT
            WhiteBalance.WARM_FLUORESCENT -> CameraMetadata.CONTROL_AWB_MODE_WARM_FLUORESCENT
            WhiteBalance.FLUORESCENT -> CameraMetadata.CONTROL_AWB_MODE_FLUORESCENT
            WhiteBalance.DAYLIGHT -> CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT
            WhiteBalance.CLOUDY -> CameraMetadata.CONTROL_AWB_MODE_CLOUDY_DAYLIGHT
            WhiteBalance.SHADE -> CameraMetadata.CONTROL_AWB_MODE_SHADE
        }

    /**
     * Brightness, through CameraX's own API rather than through interop.
     *
     * `setExposureCompensationIndex` STEERS auto-exposure instead of replacing it, so the device
     * keeps the exposure-time/sensitivity trade and the tonemap is untouched — and there is no
     * exposure time to supply, which is the whole reason the manual-ISO version had to invent one.
     */
    private fun applyExposure() {
        val control = camera?.cameraControl ?: return
        val index = want.value.evIndex
        runCatching { control.setExposureCompensationIndex(index) }
            .onFailure { Log.w(OpticsLock.TAG, "exposure compensation index $index rejected by the device", it) }
    }
}
