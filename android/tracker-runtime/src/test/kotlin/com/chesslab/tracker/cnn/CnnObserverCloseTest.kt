package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.log.RecordingLog
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

private class ClosingClassifier :
    SquareClassifier,
    AutoCloseable {
    override val classes: List<String> = EXPECTED_CLASSES
    val closes = AtomicInteger()

    @Volatile
    var closedOn: String? = null
        private set

    override fun classify(crops: List<BgrImage>): Array<FloatArray> =
        Array(ALL_SQUARES.size) { FloatArray(EXPECTED_CLASSES.size) { c -> if (c == 0) 1.0f else 0.0f } }

    override fun close() {
        closes.incrementAndGet()
        closedOn = Thread.currentThread().name
    }
}

/**
 * A tracker restart closes an observer while the app keeps running, so the teardown has to be real
 * AND finished when [CnnObserver.close] returns: `TrackerStack.close` releases the pipeline and the
 * CLAHE right after it, and the next stack opens the next ONNX session.
 */
class CnnObserverCloseTest {
    private val classifier = ClosingClassifier()
    private val takes = AtomicInteger()

    private fun observer(
        source: CnnFrameSource =
            CnnFrameSource {
                takes.incrementAndGet()
                cnnFrame(1)
            },
    ): CnnObserver {
        val observer =
            CnnObserver(
                source = source,
                fen = { "start" },
                onSnapshot = { },
                log = RecordingLog(),
                nowMs = { 0L },
            )
        observer.attach { Attached(classifier, "CPU", MODEL_FP32_FILE) }
        awaitReady(observer)
        return observer
    }

    @Test
    fun closeFreesTheSessionOnTheObserverThread() {
        val observer = observer()

        observer.close()

        assertEquals(1, classifier.closes.get(), "the session must be closed, or a restart leaks it")
        assertTrue(
            classifier.closedOn.orEmpty().contains("chesslab-cnn"),
            "the session must be freed on the observer thread, got ${classifier.closedOn}",
        )
    }

    @Test
    fun closeWaitsForTheObservationInFlight() {
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        val observer =
            observer {
                entered.countDown()
                release.await()
                cnnFrame(1)
            }
        observer.onFrameAvailable()
        assertTrue(entered.await(2, TimeUnit.SECONDS), "precondition: the observation must be running")

        val returned = AtomicBoolean(false)
        val closer = Thread { observer.close().also { returned.set(true) } }
        closer.start()
        Thread.sleep(SETTLE_MS)
        assertFalse(returned.get(), "close must not return while the observer thread is still reading")

        release.countDown()
        closer.join(JOIN_MS)
        assertTrue(returned.get(), "close must return once the observation finished")
        assertEquals(1, classifier.closes.get())
    }

    @Test
    fun closeDuringAttachClosesTheSessionThatArrivesLate() {
        val opening = CountDownLatch(1)
        val release = CountDownLatch(1)
        val observer =
            CnnObserver(
                source = { cnnFrame(1) },
                fen = { "start" },
                onSnapshot = { },
                log = RecordingLog(),
                nowMs = { 0L },
            )
        observer.attach {
            opening.countDown()
            release.await()
            Attached(classifier, "CPU", MODEL_FP32_FILE)
        }
        assertTrue(opening.await(2, TimeUnit.SECONDS), "precondition: the model must be opening")

        val closer = Thread { observer.close() }
        closer.start()
        Thread.sleep(SETTLE_MS)
        release.countDown()
        closer.join(JOIN_MS)

        assertEquals(1, classifier.closes.get(), "a session that finishes opening after close is still ours to close")
        assertFalse(observer.state.value is CnnState.Ready, "a disabled observer must not publish Ready")
    }

    @Test
    fun aClosedObserverNeverAsksForAnotherFrame() {
        val observer = observer()
        observer.close()
        val before = takes.get()

        assertFalse(observer.wantsFrame(), "a closed observer must not keep the crop warp alive")
        repeat(10) { observer.onFrameAvailable() }

        assertEquals(before, takes.get())
    }

    private fun awaitReady(observer: CnnObserver) {
        val deadline = System.currentTimeMillis() + JOIN_MS
        while (observer.state.value !is CnnState.Ready && System.currentTimeMillis() < deadline) Thread.sleep(POLL_MS)
        assertTrue(observer.state.value is CnnState.Ready, "precondition: the model must be attached")
    }

    private companion object {
        const val SETTLE_MS = 150L
        const val JOIN_MS = 5_000L
        const val POLL_MS = 5L
    }
}
