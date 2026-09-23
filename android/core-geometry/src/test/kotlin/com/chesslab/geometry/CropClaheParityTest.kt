package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.random.Random

/** Goldene Zahlen aus `tmp/clahe_golden.py`: ein Modell, das auf behandelten Crops trainiert wurde
 *  und rohe bekommt, ist still schlechter. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class CropClaheParityTest {
    private fun mat(fill: (y: Int, x: Int) -> Int): Mat {
        val m = Mat(SIZE, SIZE, CvType.CV_8UC3)
        val row = ByteArray(SIZE * CHANNELS)
        for (y in 0 until SIZE) {
            for (x in 0 until SIZE) {
                val v = fill(y, x).coerceIn(0, MAX).toByte()
                row[x * CHANNELS] = v
                row[x * CHANNELS + 1] = v
                row[x * CHANNELS + 2] = v
            }
            m.put(y, 0, row)
        }
        return m
    }

    private fun sum(m: Mat): Long {
        val buf = ByteArray(SIZE * SIZE * CHANNELS)
        m.get(0, 0, buf)
        return buf.sumOf { (it.toInt() and MAX).toLong() }
    }

    private fun at(
        m: Mat,
        y: Int,
        x: Int,
    ): Int {
        val px = ByteArray(CHANNELS)
        m.get(y, x, px)
        return px[0].toInt() and MAX
    }

    private fun clahe() = CropClahe(CLIP, TILE, LO, HI)

    @Test
    fun `a cell inside the band matches the training transform`() {
        val rng = Random(SEED)
        val noise = Array(SIZE) { DoubleArray(SIZE) { gauss(rng) * NOISE_SD } }
        val m = mat { y, x -> (RAMP_LO + (RAMP_HI - RAMP_LO) * x / (SIZE - 1.0) + noise[y][x]).toInt() }
        clahe().use { c ->
            assertTrue(c.applyTo(m)) { "eine Zelle im Band muss behandelt werden" }
        }
        // Die Summe ist der Fingerabdruck: ein anderer Operator (Kacheln, Kanal, Farbraum) verschiebt sie weit.
        val got = sum(m)
        assertTrue(kotlin.math.abs(got - GOLDEN_SUM) < GOLDEN_SUM / TOLERANCE_DIV) {
            "Summe $got weicht von Python ($GOLDEN_SUM) ab"
        }
        m.release()
    }

    @Test
    fun `a cell above the band is untouched`() {
        val m = mat { _, _ -> ABOVE }
        clahe().use { assertFalse(it.applyTo(m)) }
        assertEquals(ABOVE.toLong() * SIZE * SIZE * CHANNELS, sum(m))
        m.release()
    }

    @Test
    fun `a cell below the band is untouched`() {
        // Unter 25 verstaerkt CLAHE Sensorrauschen statt Struktur — gemessen 2,6 Punkte SCHLECHTER.
        val m = mat { _, _ -> BELOW }
        clahe().use { assertFalse(it.applyTo(m)) }
        assertEquals(BELOW.toLong() * SIZE * SIZE * CHANNELS, sum(m))
        m.release()
    }

    @Test
    fun `only the inner region decides`() {
        // Der Rand traegt das Nachbarfeld: ein heller Nachbar darf eine dunkle Zelle nicht aus dem Band schieben.
        val m = mat { y, x -> if (y in EDGE until SIZE - EDGE && x in EDGE until SIZE - EDGE) CORE else RIM }
        clahe().use { assertTrue(it.applyTo(m)) { "der Kern liegt im Band, also wird behandelt" } }
        assertEquals(MAX, at(m, 0, 0)) { "der gesaettigte Rand bleibt gesaettigt" }
        m.release()
    }

    @Test
    fun `an open window treats everything`() {
        // Ohne Grenzen ist das Band keins — derselbe Kurzschluss wie in `_Clahe._inside`.
        val m = mat { _, _ -> ABOVE }
        CropClahe(CLIP, TILE).use { assertTrue(it.applyTo(m)) }
        m.release()
    }

    /** Box-Muller, damit das Rauschen dieselbe Form hat wie `default_rng(11).normal`. */
    private fun gauss(rng: Random): Double {
        val u1 = rng.nextDouble().coerceAtLeast(1e-12)
        val u2 = rng.nextDouble()
        return kotlin.math.sqrt(-2.0 * kotlin.math.ln(u1)) * kotlin.math.cos(2.0 * Math.PI * u2)
    }

    private companion object {
        const val SIZE = 80
        const val CHANNELS = 3
        const val MAX = 255
        const val CLIP = 2.0
        const val TILE = 8
        const val LO = 25.0
        const val HI = 40.0
        const val SEED = 11
        const val NOISE_SD = 3.0
        const val RAMP_LO = 20.0
        const val RAMP_HI = 44.0
        const val ABOVE = 120
        const val BELOW = 12
        const val RIM = 200
        const val CORE = 32
        const val EDGE = 8

        const val GOLDEN_SUM = 977_985L

        /** 2 % — das Rauschen ist ein anderes, der Operator derselbe. */
        const val TOLERANCE_DIV = 50
    }
}
