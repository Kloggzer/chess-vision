package com.chesslab.arena

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.opencv.core.Core

/**
 * Maps the OpenCV natives into this JVM, once, before anything touches a `Mat`.
 *
 * OpenCV's own parallelism stays OFF: under concurrent calls the 4.10 Windows build's
 * `detectMarkers` reproducibly committed a ~53 GB native buffer (bisected 2026-08-08). The
 * per-stage cost of giving it up is about a millisecond.
 */
object NativeCv {
    private val loaded: Boolean by lazy {
        runCatching {
            Loader.load(opencv_java::class.java)
            Core.setNumThreads(1)
        }.isSuccess
    }

    fun require() {
        check(loaded) { "OpenCV natives could not be loaded — is the bytedeco classifier right for this OS?" }
    }
}
