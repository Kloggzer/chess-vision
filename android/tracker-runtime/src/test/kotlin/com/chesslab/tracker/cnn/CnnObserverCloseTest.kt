package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private class ClosingClassifier :
    SquareClassifier,
    AutoCloseable {
    override val classes: List<String> = EXPECTED_CLASSES
    var closedOn: String? = null
        private set

    override fun classify(crops: List<BgrImage>): Array<FloatArray> =
        Array(ALL_SQUARES.size) { FloatArray(EXPECTED_CLASSES.size) { c -> if (c == 0) 1.0f else 0.0f } }

    override fun close() {
        closedOn = Thread.currentThread().name
    }
}

/**
 * A tracker restart closes an observer while the app keeps running, so the teardown has to be real:
 * the ONNX session must be freed ON the observer thread (closing it under a live `classify` is a
 * native use-after-free) and nothing may start afterwards.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverCloseTest {
    private val scheduler = TestCoroutineScheduler()
    private val classifier = ClosingClassifier()
    private var takes = 0

    private fun observer(): CnnObserver {
        val observer =
            CnnObserver(
                source = {
                    takes++
                    cnnFrame(1)
                },
                fen = { "start" },
                onSnapshot = { },
                log = RecordingLog(),
                nowMs = { 0L },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(classifier, "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()
        return observer
    }

    @Test
    fun closeFreesTheSessionOnTheObserverThread() {
        val observer = observer()
        observer.close()
        // Queued, not executed inline: it lands behind whatever the observer thread is still doing.
        assertEquals(null, classifier.closedOn)
        scheduler.runCurrent()
        assertTrue(classifier.closedOn != null, "the session must be closed, or a restart leaks it")
    }

    @Test
    fun aClosedObserverNeverAsksForAnotherFrame() {
        val observer = observer()
        observer.close()
        scheduler.runCurrent()
        val before = takes

        assertFalse(observer.wantsFrame(), "a closed observer must not keep the crop warp alive")
        repeat(10) { observer.onFrameAvailable() }
        scheduler.runCurrent()

        assertEquals(before, takes)
    }
}
