package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test

/**
 * `TrackerStack` calls `setEnabled(config.cnnVerify)` and then `attach(...)` unconditionally, so a
 * run with the safeguard switched off still loads the model and ends up reporting [CnnState.Ready].
 * Same invariant as `CnnObserverCloseTest`: a disabled observer must not publish Ready.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverDisabledAttachTest {
    private val scheduler = TestCoroutineScheduler()

    @Test
    fun anObserverDisabledBeforeTheAttachNeverReportsReady() {
        val observer =
            CnnObserver(
                source = { null },
                fen = { "start" },
                onSnapshot = { },
                log = RecordingLog(),
                nowMs = { 0L },
                dispatcher = StandardTestDispatcher(scheduler),
            )

        observer.setEnabled(false)
        observer.attach { Attached(FakeClassifier(), "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()

        assertFalse(
            observer.state.value is CnnState.Ready,
            "cnnVerify=false disabled the observer, yet it published ${observer.state.value} — the debug screen " +
                "and StatusPublisher.cnnState then claim a running safeguard that wantsFrame() can never grant",
        )
    }
}
