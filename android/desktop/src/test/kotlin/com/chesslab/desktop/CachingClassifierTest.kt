package com.chesslab.desktop

import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

/** Eine Datei JE AUFNAHME statt je Eintrag: 655 588 Winzdateien kosteten unter Last bis zu 70 %
 *  eines Replays (`docs/desktop-replay.md`). */
class CachingClassifierTest {
    @TempDir
    lateinit var temp: Path

    private class Zaehlend(
        val answer: Float,
    ) : SquareClassifier {
        override val classes = List(CLASSES) { "c$it" }
        var calls = 0

        override fun classify(crops: List<BgrImage>): Array<FloatArray> {
            calls += 1
            return Array(crops.size) { FloatArray(CLASSES) { answer } }
        }

        override fun close() = Unit
    }

    private fun crops(seed: Byte) = listOf(BgrImage(2, 2, ByteArray(2 * 2 * 3) { seed }))

    /** Ein Lauf, der seine Crops sieht und danach zumacht — sonst haelt Windows das Temp fest. */
    private fun lauf(
        inner: Zaehlend,
        recording: String,
        vararg seeds: Byte,
    ): Array<FloatArray> {
        val cache = CachingClassifier(inner, temp.toFile(), recording)
        var last = emptyArray<FloatArray>()
        for (seed in seeds) last = cache.classify(crops(seed))
        cache.close()
        return last
    }

    @Test
    fun `derselbe Crop wird nur einmal gerechnet`() {
        val inner = Zaehlend(0.5f)

        lauf(inner, "rec", 1, 1)

        assertEquals(1, inner.calls, "der zweite Aufruf haette aus dem Speicher kommen muessen")
    }

    @Test
    fun `ein spaeterer Lauf liest die Datei der Aufnahme`() {
        lauf(Zaehlend(0.25f), "rec", 2)
        val zweiter = Zaehlend(0.99f)

        val out = lauf(zweiter, "rec", 2)

        assertEquals(0, zweiter.calls, "die Antwort lag auf der Platte")
        assertArrayEquals(FloatArray(CLASSES) { 0.25f }, out[0], 0.0f)
    }

    @Test
    fun `eine andere Aufnahme sieht die Datei nicht`() {
        lauf(Zaehlend(0.25f), "rec-a", 3)
        val andere = Zaehlend(0.75f)

        lauf(andere, "rec-b", 3)

        assertEquals(1, andere.calls, "der Cache ist je Aufnahme — sonst waere er wieder global")
    }

    @Test
    fun `ein abgerissener Schwanz kostet nur den letzten Satz`() {
        lauf(Zaehlend(0.25f), "rec", 4, 5)
        val datei = temp.toFile().listFiles()!!.single { it.name.startsWith("rec.") }
        datei.writeBytes(datei.readBytes().dropLast(HALBER_SATZ).toByteArray())
        val nachher = Zaehlend(0.75f)

        lauf(nachher, "rec", 4, 5)

        assertEquals(1, nachher.calls, "der erste Satz muss ueberleben, nur der abgerissene faellt weg")
    }
}

private const val CLASSES = 13

/** Genug, um den LETZTEN Satz zu zerstoeren und den ersten stehen zu lassen. */
private const val HALBER_SATZ = 20
