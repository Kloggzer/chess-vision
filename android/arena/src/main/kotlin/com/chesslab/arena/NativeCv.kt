package com.chesslab.arena

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.opencv.core.Core

/** OpenCV's own parallelism stays OFF: under concurrent calls the 4.10 Windows `detectMarkers` committed a
 *  ~53 GB native buffer. The cost is about a millisecond per stage. */
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
