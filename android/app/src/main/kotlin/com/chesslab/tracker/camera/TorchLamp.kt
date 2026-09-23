package com.chesslab.tracker.camera

import androidx.camera.core.Camera
import com.chesslab.tracker.service.TorchLampPort
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** A rebind starts with the torch off whatever the user asked for, so the want survives [detach] and
 *  [attach] re-asserts it — a lamp that goes out on a reconnect is worse than none. */
class TorchLamp : TorchLampPort {
    private val want = MutableStateFlow(false)
    private var camera: Camera? = null

    /** What the user asked for — not proof that the device did it. */
    override val torchOn: StateFlow<Boolean> = want.asStateFlow()

    override val hasTorch: Boolean get() = camera?.cameraInfo?.hasFlashUnit() == true

    fun attach(bound: Camera) {
        camera = bound
        apply()
    }

    fun detach() {
        camera = null
    }

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
