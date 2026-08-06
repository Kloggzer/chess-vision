package com.chesslab.cnn

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

/**
 * `:core-cnn` names no OpenCV symbol at all — `Preprocess` works on `BgrImage`, a plain ByteArray
 * holder — and it was only ever an Android module because it consumed `:core-geometry`, which was
 * an AAR. Both facts are asserted here so the cascade cannot come back unnoticed.
 */
class PlatformPurityTest {
    @Test
    fun theClasspathIsPlainJvm() {
        assertThrows<ClassNotFoundException> { Class.forName("android.util.Log") }
        assertThrows<ClassNotFoundException> { Class.forName("org.opencv.core.Mat") }
        // Proves the assertions above check a populated classpath, not an empty one.
        Class.forName("com.chesslab.engine.api.BgrImage")
    }
}
