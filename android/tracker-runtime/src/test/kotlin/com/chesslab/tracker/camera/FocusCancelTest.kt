package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.math.exp

/**
 * `cancel()` only looks at `sweep`, which is null in the two phases the user is most likely to
 * abort in: the device seek after `start()`, and the confirmation step after a peak was picked.
 */
class FocusCancelTest {
    private class Port(
        abilities: CameraAbilities?,
    ) : CameraLookPort {
        private val want = MutableStateFlow(CameraLook())
        private val offers = MutableStateFlow(abilities)
        var deviceFocus: Float? = null

        override fun focusReady(): Boolean = true

        override fun focusOn(region: FocusRegion): Boolean = deviceFocus != null

        override fun autoFocus(): Float? = deviceFocus

        override val look: StateFlow<CameraLook> = want.asStateFlow()
        override val abilities: StateFlow<CameraAbilities?> = offers.asStateFlow()

        override fun setLook(next: CameraLook) {
            want.value = next
        }
    }

    private val able = CameraAbilities(minFocusDiopters = 10f)
    private val region = FocusRegion(0.5f, 0.5f, 0.4f)

    private fun boardFor(focus: Float?): BgrImage {
        val f = focus ?: 1f
        val amplitude = 2f + 120f * exp(-(f - 0.3f) * (f - 0.3f) / (2 * 0.05f * 0.05f))
        val size = 128
        val data = ByteArray(size * size * 3)
        for (y in 0 until size) {
            for (x in 0 until size) {
                val on = (x / 4 + y / 4) % 2 == 0
                val v = (128f + if (on) amplitude / 2 else -amplitude / 2).toInt().coerceIn(0, 255).toByte()
                val i = (y * size + x) * 3
                data[i] = v
                data[i + 1] = v
                data[i + 2] = v
            }
        }
        return BgrImage(size, size, data)
    }

    @Test
    fun `cancel during the device seek restores the manual distance`() {
        val port = Port(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = BoardFocusGovernor(port, settleFrames = 0)
        port.deviceFocus = 0.3f
        g.onBoard(0, true, region) { boardFor(0.42f) }
        g.start()
        assertEquals(FocusState.Seeking, g.state.value) { "Vorbedingung: der Geraete-Fokus laeuft" }

        g.cancel()

        assertEquals(FocusState.Idle, g.state.value) { "cancel muss den Lauf beenden" }
        assertEquals(0.42f, port.look.value.focus) { "cancel muss die manuelle Distanz zuruecklegen" }
    }

    @Test
    fun `cancel during the confirmation step stops the run`() {
        val port = Port(able)
        port.setLook(CameraLook(focus = 0.42f))
        val g = BoardFocusGovernor(port, settleFrames = 0)
        g.onBoard(0, true, region) { boardFor(0.42f) }
        g.sweep()
        // Die Bestaetigung ist der Zustand, in dem alle Stufen gelaufen sind (done == total).
        var seq = 1L
        var confirming = false
        while (seq < 400 && !confirming) {
            g.onBoard(seq++, true, null) { boardFor(port.look.value.focus) }
            val state = g.state.value
            confirming = state is FocusState.Sweeping && state.done == state.total - 1
        }
        assertEquals(true, confirming) { "Vorbedingung: die Bestaetigungsstufe wurde erreicht" }

        g.cancel()
        repeat(20) { g.onBoard(seq++, true, null) { boardFor(port.look.value.focus) } }

        assertEquals(FocusState.Idle, g.state.value) { "cancel in der Bestaetigung muss den Lauf beenden" }
    }
}
