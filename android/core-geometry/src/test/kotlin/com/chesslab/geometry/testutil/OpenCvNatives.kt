package com.chesslab.geometry.testutil

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java

// ONE mechanism for the OpenCV natives on the desktop JVM - no alternatives.
//
// `Loader.load(opencv_java::class.java)` unpacks the JNI library and registers it, which makes
// the `org.opencv.*` Java API (compiled against the OpenCV AAR) usable in the same JVM. That
// is why the bytedeco artifacts are test dependencies even though production code compiles
// against `org.opencv`.
//
// Tier-C test classes are gated with
// `@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")`.
// `Assumptions.assumeTrue` and `@Disabled` are BANNED here: one greppable mechanism.
object OpenCvNatives {
    private val loaded: Boolean by lazy {
        runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }

    /**
     * JUnit's `@EnabledIf` resolves a METHOD reference, so this is a function and not the
     * `val` the phase file sketches (a Kotlin `val` compiles to `getAvailable()`).
     */
    @JvmStatic
    fun available(): Boolean = loaded
}
