package com.chesslab.desktop

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.opencv.core.Core

/**
 * Maps the OpenCV natives into this JVM, once.
 *
 * The shared modules compile against `org.bytedeco:opencv`'s `org.opencv.*` classes but take it
 * `compileOnly` — each runtime supplies the implementation. On Android that is the AAR, loaded by
 * `OpenCVLoader.initLocal()`; here it is this. The AAR's loader is not even on this classpath, so
 * the two cannot be confused.
 *
 * Called before anything touches a `Mat`. A missing native must fail here, at startup, with a
 * sentence — not as an `UnsatisfiedLinkError` from inside a warp three minutes into a game.
 *
 * OpenCV's internal parallelism is DISABLED on this host, for the same reason the ONNX session
 * runs one intra-op thread. Two of our threads call into OpenCV at once (the drive thread's
 * per-frame stages, LiveAlign's ArUco on a worker), and under that concurrency the 4.10 Windows
 * build's `ArucoDetector.detectMarkers` reproducibly committed a single ~53 GB native buffer and
 * ground for minutes (rec-20260808-003957 around frame 7146, a motion-blurred hand; the same
 * frames detect in 16-22 ms in isolation). Isolated by bisection on 2026-08-08: liveAlign off →
 * no balloon; grid correction off, detection on → balloon. The per-stage costs this gives up are
 * ~1 ms each (`chesslabPerf`: warp 0.9, gray 1.1 at 1080p) — determinism and a bounded footprint
 * are worth far more to a measurement host.
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
