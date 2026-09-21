package com.chesslab.desktop

import com.chesslab.desktop.testutil.StillSource
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/**
 * Die Cache-Zeilen haengen an der RELATIVEN Sequenznummer. Der Ausschnitt fehlte in der Signatur,
 * also nahm ein Lauf ab Bild 5 den Cache eines Laufs ab Bild 0 an — und antwortete mit den
 * Beobachtungen fremder Bilder. Still, mitten in einer Messung.
 */
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

    /** Die abgelegten Zeilen sind prior-konditioniert; ohne den Prior in der Signatur las ein
     *  Lauf mit anderer Staerke — oder ohne sie — die Wahrscheinlichkeiten einer fremden Rechnung. */
    @Test
    fun `ein anderer Prior ist ein anderer Cache`() {
        assertNotEquals(sig(priorLambda = 0.0), sig(priorLambda = 6.02))
        assertNotEquals(sig(priorLambda = 5.04), sig(priorLambda = 6.02))
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
    ): String =
        visualCacheSignature(
            TrackerConfig(),
            BoardGeometry(),
            FloatArray(8) { it.toFloat() },
            StillSource,
            stride = 1,
            lens = false,
            model = "m",
            startFrame = startFrame,
            limitFrames = limitFrames,
            recordedFrames = recordedFrames,
            priorLambda = priorLambda,
        )
}
