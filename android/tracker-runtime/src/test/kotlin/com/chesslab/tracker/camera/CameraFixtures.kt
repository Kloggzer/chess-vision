package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.exp

internal class FakeLookPort(
    abilities: CameraAbilities?,
) : CameraLookPort {
    private val want = MutableStateFlow(CameraLook())
    private val offers = MutableStateFlow(abilities)
    var sets = 0
    var lensReady = true

    var deviceFocus: Float? = null
    var regionAsked: FocusRegion? = null

    override fun focusReady(): Boolean = lensReady

    override fun focusOn(region: FocusRegion): Boolean {
        regionAsked = region
        return deviceFocus != null
    }

    override fun autoFocus(): Float? = deviceFocus

    override val look: StateFlow<CameraLook> = want.asStateFlow()
    override val abilities: StateFlow<CameraAbilities?> = offers.asStateFlow()

    override fun setLook(next: CameraLook) {
        want.value = next
        sets++
    }
}

internal fun lumaBoard(
    size: Int,
    value: (x: Int, y: Int) -> Int,
): BgrImage {
    val data = ByteArray(size * size * 3)
    for (y in 0 until size) {
        for (x in 0 until size) {
            val v = value(x, y).coerceIn(0, 255).toByte()
            val i = (y * size + x) * 3
            data[i] = v
            data[i + 1] = v
            data[i + 2] = v
        }
    }
    return BgrImage(size, size, data)
}

internal fun checkers(amplitude: Float): BgrImage =
    lumaBoard(128) { x, y -> (128f + if ((x / 4 + y / 4) % 2 == 0) amplitude / 2 else -amplitude / 2).toInt() }

/** Kontrast nur nahe der Gipfeldistanz 0,3. */
internal fun focusBoard(focus: Float?): BgrImage {
    val f = focus ?: 1f
    return checkers(2f + 120f * exp(-(f - 0.3f) * (f - 0.3f) / (2 * 0.05f * 0.05f)))
}
