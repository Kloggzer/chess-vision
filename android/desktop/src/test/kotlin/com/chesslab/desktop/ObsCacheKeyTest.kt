package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

/** Der Cache antwortet auf Crop-Bytes. Haengt er nur am Modell-NAMEN, beantwortet neu abgelegte
 *  Gewichte der vorige Lauf — ein stilles A/B, das keinen Unterschied zeigt (Bug-Audit C4). */
class ObsCacheKeyTest {
    @TempDir
    lateinit var temp: Path

    private fun graph(bytes: ByteArray): File = temp.resolve("model.onnx").toFile().apply { writeBytes(bytes) }

    private fun config(text: String): File = temp.resolve("config.json").toFile().apply { writeText(text) }

    @Test
    fun newWeightsUnderTheSameModelNameGetTheirOwnCache() {
        val root = temp.resolve("obs-cache").toFile()
        val before = obsCacheDir(root, MODEL, graph(byteArrayOf(1, 2, 3)), config("{}"))
        val after = obsCacheDir(root, MODEL, graph(byteArrayOf(4, 5, 6)), config("{}"))

        assertNotEquals(before, after, "re-staged weights answered from the cache of the model they replaced")
    }

    /** Der Cache haelt WAHRSCHEINLICHKEITEN, und die haengen auch an der `config.json`
     *  (temperature, normalize, clahe_*). Ein A/B las sonst 41 168 alte Antworten. */
    @Test
    fun aChangedConfigGetsItsOwnCache() {
        val root = temp.resolve("obs-cache").toFile()
        val graph = graph(byteArrayOf(1, 2, 3))

        val before = obsCacheDir(root, MODEL, graph, config("""{"temperature": 1.0}"""))
        val after = obsCacheDir(root, MODEL, graph, config("""{"temperature": 1.495}"""))

        assertNotEquals(before, after, "eine geaenderte config wurde aus dem Lauf davor beantwortet")
    }

    @Test
    fun theSameWeightsKeepTheirCache() {
        val root = temp.resolve("obs-cache").toFile()
        val bytes = byteArrayOf(7, 8, 9)

        assertEquals(
            obsCacheDir(root, MODEL, graph(bytes), config("{}")),
            obsCacheDir(root, MODEL, graph(bytes), config("{}")),
            "an unchanged model must keep answering from disk — that is what the cache is for",
        )
    }

    private companion object {
        const val MODEL = "p4a-80-clahe"
    }
}
