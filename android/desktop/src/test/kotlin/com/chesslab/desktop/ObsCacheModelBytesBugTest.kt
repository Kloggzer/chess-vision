package com.chesslab.desktop

import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

/** Bug-Audit C4: der Cache haengt am Modell-NAMEN und den Crop-Bytes. Ein Modell unter demselben
 *  Namen neu abgelegt antwortet aus dem vorigen Lauf — ein stilles A/B, das keinen Unterschied
 *  zeigt (`docs/bug-audit-2026-09-13.md`). */
@Disabled("BUG: C4 — der Obs-Cache haengt am Modell-NAMEN, nicht an seinen Bytes")
class ObsCacheModelBytesBugTest {
    @TempDir
    lateinit var temp: Path

    private class Constant(
        private val value: Float,
    ) : SquareClassifier {
        override val classes: List<String> = PIECES13_CLASSES

        override fun classify(crops: List<BgrImage>): Array<FloatArray> = Array(crops.size) { FloatArray(classes.size) { value } }
    }

    @Test
    fun newWeightsUnderTheSameModelNameAreNotAnsweredFromTheOldOnesCache() {
        val dir = temp.resolve("p4a-80-clahe").toFile()
        val crops = listOf(BgrImage(1, 1, ByteArray(BGR)))

        CachingClassifier(Constant(OLD), dir).classify(crops)
        val second = CachingClassifier(Constant(NEW), dir).classify(crops)

        assertEquals(
            NEW,
            second[0][0],
            "the re-staged model was answered from the cache of the model it replaced — the key is " +
                "the crop bytes and the directory is the model NAME, so nothing here sees new weights",
        )
    }

    private companion object {
        const val BGR = 3
        const val OLD = 0.25f
        const val NEW = 0.75f
    }
}
