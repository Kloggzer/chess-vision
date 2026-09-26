package com.chesslab.tracker.cnn

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

/** Ein CLAHE-Modell ohne CLAHE zu bedienen ist eine stille Train/Serve-Luecke: das Standardmodell saehe rohe Pixel. */
class CropClaheForTest {
    private fun spec(claheClip: Double?): ModelSpec = ModelSpec.parse(modelConfigJson(claheClip = claheClip))

    @Test
    fun `a CLAHE-trained model is served with CLAHE`() {
        assertNotNull(cropClaheFor(spec(claheClip = 2.0))?.also { it.close() })
    }

    @Test
    fun `a plain model and no model are served without`() {
        assertNull(cropClaheFor(spec(claheClip = null)))
        assertNull(cropClaheFor(null))
    }

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
