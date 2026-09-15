package com.chesslab.tracker.camera

import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/**
 * Beide Messungen leiten die Feldkante allein aus der BREITE ab und laufen dann bis Zeile
 * `8 * cell`, indizieren aber ein Raster der Groesse `width * height`. Die Meldung des `require`
 * druckt beide Kanten und prueft nur eine — bei einem nicht-quadratischen Brett kommt kein
 * `IllegalArgumentException` zurueck, sondern ein Index-Fehler aus der Pixelschleife.
 */
class BoardMeterRasterGuardTest {
    @Test
    fun `a non-square raster is refused by the guard, not by the pixel loop`() {
        assertThrows(IllegalArgumentException::class.java) { meterSharpness(oblong()) }
        assertThrows(IllegalArgumentException::class.java) { meterBoard(oblong()) }
    }

    private fun oblong(): BgrImage = BgrImage(WIDTH, HEIGHT, ByteArray(WIDTH * HEIGHT * CHANNELS))

    private companion object {
        const val WIDTH = 160
        const val HEIGHT = 120
        const val CHANNELS = 3
    }
}
