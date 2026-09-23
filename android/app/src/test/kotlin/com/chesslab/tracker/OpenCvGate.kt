package com.chesslab.tracker

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java

/** JUnit's `@EnabledIf` resolves a static METHOD reference. */
object OpenCvGate {
    const val REF = "com.chesslab.tracker.OpenCvGate#available"

    @JvmStatic
    fun available(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
}
