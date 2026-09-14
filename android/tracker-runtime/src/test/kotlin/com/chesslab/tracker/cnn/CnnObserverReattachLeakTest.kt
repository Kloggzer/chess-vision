package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.log.RecordingLog
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.concurrent.atomic.AtomicInteger

private class CountingClassifier(
    val name: String,
) : SquareClassifier,
    AutoCloseable {
    override val classes: List<String> = EXPECTED_CLASSES
    val closes = AtomicInteger()

    override fun classify(crops: List<BgrImage>): Array<FloatArray> =
        Array(ALL_SQUARES.size) { FloatArray(EXPECTED_CLASSES.size) { c -> if (c == 0) 1.0f else 0.0f } }

    override fun close() {
        closes.incrementAndGet()
    }
}

/**
 * `CnnStateHolder.retry()` returns true from ANY state, and `load` assigns `classifier` without
 * looking at what is already there — so a retry on a Ready observer opens a second ONNX session and
 * drops the first one on the floor. Nothing in `CnnObserver` enforces the UI's Failed-only gating.
 */
class CnnObserverReattachLeakTest {
    private val first = CountingClassifier("first")
    private val second = CountingClassifier("second")

    @Test
    fun retryOnAReadyObserverDoesNotLeakTheRunningSession() {
        val observer =
            CnnObserver(
                source = { cnnFrame(1) },
                fen = { "start" },
                onSnapshot = { },
                log = RecordingLog(),
                nowMs = { 0L },
            )
        observer.attach { Attached(first, "CPU", MODEL_FP32_FILE) }
        awaitReady(observer)

        // What `TrackerService.kt:442` wires the debug screen's Retry button to.
        observer.retryAttach { Attached(second, "CPU", MODEL_FP32_FILE) }
        awaitReady(observer)

        assertEquals(
            1,
            first.closes.get(),
            "the first ONNX session was replaced by the retry and never closed — one leaked native " +
                "session (and its arena) per retry, for the lifetime of the process",
        )
        observer.close()
        assertEquals(1, second.closes.get(), "the live session is still closed on teardown")
    }

    private fun awaitReady(observer: CnnObserver) {
        val deadline = System.currentTimeMillis() + JOIN_MS
        while (observer.state.value !is CnnState.Ready && System.currentTimeMillis() < deadline) Thread.sleep(POLL_MS)
        assertTrue(observer.state.value is CnnState.Ready, "precondition: the model must be attached")
    }

    private companion object {
        const val JOIN_MS = 5_000L
        const val POLL_MS = 5L
    }
}
