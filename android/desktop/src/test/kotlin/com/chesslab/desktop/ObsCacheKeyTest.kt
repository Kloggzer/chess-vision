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

    @Test
    fun newWeightsUnderTheSameModelNameGetTheirOwnCache() {
        val root = temp.resolve("obs-cache").toFile()
        val before = obsCacheDir(root, MODEL, graph(byteArrayOf(1, 2, 3)))
        val after = obsCacheDir(root, MODEL, graph(byteArrayOf(4, 5, 6)))

        assertNotEquals(before, after, "re-staged weights answered from the cache of the model they replaced")
    }

    @Test
    fun theSameWeightsKeepTheirCache() {
        val root = temp.resolve("obs-cache").toFile()
        val bytes = byteArrayOf(7, 8, 9)

        assertEquals(
            obsCacheDir(root, MODEL, graph(bytes)),
            obsCacheDir(root, MODEL, graph(bytes)),
            "an unchanged model must keep answering from disk — that is what the cache is for",
        )
    }

    private companion object {
        const val MODEL = "p4a-80-clahe"
    }
}
