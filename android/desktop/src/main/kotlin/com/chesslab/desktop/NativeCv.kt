package com.chesslab.desktop

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.opencv.core.Core

/** Called before anything touches a `Mat`: a missing native fails here with a sentence. OpenCV's parallelism
 *  is OFF: under our two threads the 4.10 Windows `ArucoDetector.detectMarkers` committed a ~53 GB native
 *  buffer and ground for minutes (rec-20260808-003957, frame 7146); the ~1 ms per stage it costs is worth it. */
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
