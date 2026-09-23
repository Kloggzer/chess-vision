package com.chesslab.geometry.testutil

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java

// ONE mechanism for the OpenCV natives on the desktop JVM: Tier-C classes are gated with
// `@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")`; `assumeTrue` and
// `@Disabled` are BANNED here, so there is one greppable mechanism.
object OpenCvNatives {
    private val loaded: Boolean by lazy {
        runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }

    /** `@EnabledIf` resolves a METHOD; a Kotlin `val` would compile to `getAvailable()`. */
    @JvmStatic
    fun available(): Boolean = loaded
}
