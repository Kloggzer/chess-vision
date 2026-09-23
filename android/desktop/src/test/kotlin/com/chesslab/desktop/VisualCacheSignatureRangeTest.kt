package com.chesslab.desktop

import com.chesslab.desktop.testutil.StillSource
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

class VisualCacheSignatureRangeTest {
    @Test
    fun `a different start frame is a different cache`() {
        assertNotEquals(sig(startFrame = 0L), sig(startFrame = 5L))
    }

    @Test
    fun `a frame limit is a different cache`() {
        assertNotEquals(sig(limitFrames = null), sig(limitFrames = 200))
    }

    @Test
    fun `a recorded-frame gate is a different cache, and so is a different timeline`() {
        assertNotEquals(sig(recordedFrames = null), sig(recordedFrames = 900))
        assertNotEquals(sig(recordedFrames = 900), sig(recordedFrames = 901))
    }

    @Test
    fun `ein anderer Prior ist ein anderer Cache`() {
        assertNotEquals(sig(priorLambda = 0.0), sig(priorLambda = 6.02))
        assertNotEquals(sig(priorLambda = 5.04), sig(priorLambda = 6.02))
    }

    /** `fps=` wirkt NUR ueber den Stride, `lens` aendert die Pixel: in keinem anderen Kopffeld. */
    @Test
    fun `Stride und Linse sind eigene Caches`() {
        assertNotEquals(sig(stride = 1), sig(stride = 2))
        assertNotEquals(sig(lens = false), sig(lens = true))
    }

    @Test
    fun `ein anderer prior-mode ist ein anderer Cache`() {
        assertNotEquals(sig(priorSafety = true), sig(priorSafety = false))
    }

    @Test
    fun `the same range signs the same`() {
        assert(
            sig(startFrame = 5L, limitFrames = 200, recordedFrames = 900) ==
                sig(startFrame = 5L, limitFrames = 200, recordedFrames = 900),
        )
    }

    private fun sig(
        startFrame: Long = 0,
        limitFrames: Int? = null,
        recordedFrames: Int? = null,
        priorLambda: Double = 0.0,
        priorSafety: Boolean = true,
        stride: Int = 1,
        lens: Boolean = false,
    ): String =
        visualCacheSignature(
            TrackerConfig(),
            BoardGeometry(),
            FloatArray(8) { it.toFloat() },
            StillSource,
            stride = stride,
            lens = lens,
            model = "m",
            startFrame = startFrame,
            limitFrames = limitFrames,
            recordedFrames = recordedFrames,
            priorLambda = priorLambda,
            priorSafety = priorSafety,
        )
}
