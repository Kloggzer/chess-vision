package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardExposureGovernorTest {
    private class FakePort(
        abilities: CameraAbilities?,
    ) : CameraLookPort {
        private val want = MutableStateFlow(CameraLook())
        private val offers = MutableStateFlow(abilities)
        var sets = 0

        override val look: StateFlow<CameraLook> = want.asStateFlow()
        override val abilities: StateFlow<CameraAbilities?> = offers.asStateFlow()

        override fun setLook(next: CameraLook) {
            want.value = next
            sets++
        }
    }

    private val range = ExposureRange(indices = -24..24, stepEv = 1f / 6f)
    private val able = CameraAbilities(exposure = range)

    private fun board(value: Int): BgrImage = BgrImage(BOARD_PX, BOARD_PX, ByteArray(BOARD_PX * BOARD_PX * 3) { value.toByte() })

    private fun governor(port: FakePort) = BoardExposureGovernor(port, everyFrames = 1, holdFrames = 0)

    @Test
    fun `a device without exposure compensation is left alone`() {
        val port = FakePort(CameraAbilities(exposure = null))
        assertFalse(governor(port).onBoard(1, true) { board(10) })
        assertEquals(0, port.sets)
    }

    @Test
    fun `a dark board is corrected and reported`() {
        val port = FakePort(able)
        assertTrue(governor(port).onBoard(1, true) { board(10) }) { "eine Verstellung muss gemeldet werden" }
        assertTrue(port.look.value.evIndex > 0)
    }

    @Test
    fun `a good board changes nothing`() {
        val port = FakePort(able)
        assertFalse(governor(port).onBoard(1, true) { board(100) })
        assertEquals(0, port.sets) { "jede Verstellung kostet den Tracker seine Referenz" }
    }

    @Test
    fun `an unquiet frame holds the regulation off`() {
        // Die Pixel-Referenz danach zu verwerfen hiesse, dem Entscheidungspfad genau die Grundlage
        // wegzuziehen, auf der er rechnet — und die Sperre haelt noch eine Weile nach.
        val port = FakePort(able)
        val gov = BoardExposureGovernor(port, everyFrames = 1, holdFrames = 10)
        assertFalse(gov.onBoard(1, quiet = false) { board(10) })
        assertFalse(gov.onBoard(5, quiet = true) { board(10) }) { "die Sperre haelt nach" }
        assertTrue(gov.onBoard(20, quiet = true) { board(10) })
    }

    @Test
    fun `the users own correction is the starting point`() {
        // Sonst spraenge der erste Schritt an einer von Hand gesetzten Korrektur vorbei.
        val port = FakePort(able)
        port.setLook(port.look.value.copy(evIndex = 12))
        port.sets = 0
        governor(port).onBoard(1, true) { board(10) }
        assertTrue(port.look.value.evIndex > 12) { "war ${port.look.value.evIndex}, sollte ueber 12 liegen" }
    }

    @Test
    fun `a bright board with blown highlights is not dimmed`() {
        // Der gemeldete Fehler: die Klinke faellt bei Saettigung, und ein Brett ohne ein einziges
        // zu dunkles Feld wurde so Schritt fuer Schritt abgeblendet.
        val port = FakePort(able)
        assertFalse(governor(port).onBoard(1, true) { board(255) })
        assertEquals(0, port.sets) { "abgeblendet, obwohl nichts zu dunkel war" }
    }

    @Test
    fun `the player is told once per brightening episode`() {
        // Jeder Schritt derselben Aufhellung ist dasselbe Ereignis — sonst redet die App bei
        // jedem Tick, und das Fenster ist zwei Sekunden breit.
        val port = FakePort(able)
        val said = mutableListOf<ExposureNotice>()
        val gov = BoardExposureGovernor(port, everyFrames = 1, holdFrames = 0, onBrighten = { said += it })
        repeat(5) { tick -> gov.onBoard(tick.toLong(), true) { board(10) } }
        assertEquals(1, said.size) { "gemeldet: $said" }
        assertTrue(said.first().evAboveBase > 0.0)
    }

    @Test
    fun `metering is skipped between ticks`() {
        val port = FakePort(able)
        val gov = BoardExposureGovernor(port, everyFrames = 30, holdFrames = 0)
        var reads = 0
        gov.onBoard(1, true) {
            reads++
            board(10)
        }
        repeat(20) {
            gov.onBoard(2L + it, true) {
                reads++
                board(10)
            }
        }
        assertEquals(1, reads) { "der Warp darf nur beim Messen angefasst werden" }
    }

    @Test
    fun `the closed loop settles`() {
        // Ein Brett, das auf die Verstellung REAGIERT. Mit einem starren Testbild misst man eine
        // Physik, die es nicht gibt: die Regelung saehe ihre eigene Korrektur nie ankommen.
        val port = FakePort(able)
        val gov = governor(port)
        var changes = 0
        repeat(TICKS) { changes += if (gov.onBoard(it.toLong(), true, { rendered(port) })) 1 else 0 }
        assertTrue(changes in 1..SETTLE_STEPS) { "$changes Verstellungen — sollte nach wenigen stehen" }
    }

    /**
     * Das Brett, wie es bei der aktuellen Korrektur aussaehe — linear belichtet, dann sRGB.
     *
     * Zwei helle Reihen ueber sechs dunklen: der Fall, um den es geht. Ein per-Pixel gemischtes
     * Testbild taugt nicht, dort hebt das Helle jeden Feldmittelwert ueber die Schwelle.
     */
    private fun rendered(port: FakePort): BgrImage {
        val light = lightOf(port.look.value.evIndex * range.stepEv.toDouble())
        val cell = BOARD_PX / 8
        val data = ByteArray(BOARD_PX * BOARD_PX * 3)
        for (y in 0 until BOARD_PX) {
            val base = if (y / cell < BRIGHT_ROWS) BRIGHT_BASE else DARK_BASE
            val v = (Math.pow((base * light).coerceAtMost(1.0), 1.0 / GAMMA) * BYTE_MAX).toInt().toByte()
            java.util.Arrays.fill(data, y * BOARD_PX * 3, (y + 1) * BOARD_PX * 3, v)
        }
        return BgrImage(BOARD_PX, BOARD_PX, data)
    }

    private companion object {
        const val TICKS = 40
        const val BOARD_PX = 160
        const val SETTLE_STEPS = 8
        const val GAMMA = 2.2
        const val BRIGHT_BASE = 0.6
        const val DARK_BASE = 0.005
        const val BRIGHT_ROWS = 2
        const val BYTE_MAX = 255
    }
}
