package com.chesslab.geometry.testutil

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java

// ONE mechanism for the OpenCV natives: Tier-C classes use `@EnabledIf("...OpenCvNatives#available")`;
// `assumeTrue` and `@Disabled` are BANNED here, so there is one greppable mechanism.
object OpenCvNatives {
    private val loaded: Boolean by lazy {
        runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }

    /** `@EnabledIf` resolves a METHOD; a Kotlin `val` would compile to `getAvailable()`. */
    @JvmStatic
    fun available(): Boolean = loaded
}
