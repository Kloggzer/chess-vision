package com.chesslab.desktop

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java

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
 */
object NativeCv {
    private val loaded: Boolean by lazy { runCatching { Loader.load(opencv_java::class.java) }.isSuccess }

    fun require() {
        check(loaded) { "OpenCV natives could not be loaded — is the bytedeco classifier right for this OS?" }
    }
}
