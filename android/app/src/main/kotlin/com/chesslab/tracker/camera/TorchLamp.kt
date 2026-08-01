package com.chesslab.tracker.camera

import androidx.camera.core.Camera
import com.chesslab.tracker.service.TorchLampPort
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The camera's lamp, held the way [OpticsLock] holds the 3A state: a small owner of one concern,
 * attached to whatever camera is currently bound.
 *
 * The WANT and the DEVICE are separate on purpose. A rebind — a resolution change, a reconnect, a
 * downshift after a failed bind — starts with the torch off whatever the user asked for, and a lamp
 * that switches itself off mid-game because the camera reconnected is worse than one that never came
 * on. So the want survives [detach] and [attach] re-asserts it.
 */
class TorchLamp : TorchLampPort {
    private val want = MutableStateFlow(false)
    private var camera: Camera? = null

    /** What the user asked for — not proof that the device did it. */
    override val torchOn: StateFlow<Boolean> = want.asStateFlow()

    /** False on a device with no flash unit, and while nothing is bound. */
    override val hasTorch: Boolean get() = camera?.cameraInfo?.hasFlashUnit() == true

    fun attach(bound: Camera) {
        camera = bound
        apply()
    }

    fun detach() {
        camera = null
    }

    /** Returns false when there is nothing to switch; the want is remembered either way. */
    override fun setTorch(value: Boolean): Boolean {
        want.value = value
        return apply()
    }

    private fun apply(): Boolean {
        val bound = camera ?: return false
        if (!bound.cameraInfo.hasFlashUnit()) return false
        bound.cameraControl.enableTorch(want.value)
        return true
    }
}
