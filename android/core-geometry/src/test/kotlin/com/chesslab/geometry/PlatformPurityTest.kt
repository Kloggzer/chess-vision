package com.chesslab.geometry

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

/** `OpenCVLoader` lives only in the OpenCV AAR, never in the `org.bytedeco:opencv` jar: native
 *  initialisation cannot be named from here, so the compiler enforces the seam, not a comment. */
class PlatformPurityTest {
    @Test
    fun theClasspathIsPlainJvmPlusOpenCv() {
        assertThrows<ClassNotFoundException> { Class.forName("android.util.Log") }
        assertThrows<ClassNotFoundException> { Class.forName("org.opencv.android.OpenCVLoader") }
        // Proves the assertions above check a populated classpath, not an empty one.
        Class.forName("org.opencv.core.Mat")
    }
}
