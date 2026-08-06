package com.chesslab.geometry

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

/**
 * This module has always been platform-free; until it stopped being an Android module the claim was
 * untestable, because the Android stubs were on every classpath by construction.
 *
 * The second assertion is the one with teeth: `org.opencv.android.OpenCVLoader` lives only in the
 * OpenCV AAR, never in the `org.bytedeco:opencv` jar this module compiles against. So native
 * initialisation cannot be named from here, and the seam between "the API" and "whoever mapped the
 * natives" is enforced by the compiler rather than by a comment.
 */
class PlatformPurityTest {
    @Test
    fun theClasspathIsPlainJvmPlusOpenCv() {
        assertThrows<ClassNotFoundException> { Class.forName("android.util.Log") }
        assertThrows<ClassNotFoundException> { Class.forName("org.opencv.android.OpenCVLoader") }
        // Proves the assertions above check a populated classpath, not an empty one.
        Class.forName("org.opencv.core.Mat")
    }
}
