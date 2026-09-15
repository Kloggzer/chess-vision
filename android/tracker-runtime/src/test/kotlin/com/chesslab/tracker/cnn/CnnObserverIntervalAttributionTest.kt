package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * `wantsFrame` asks the interval BEFORE `demand()`; the attribution below it asks the other way
 * round, so the throttle's own refusals are booked on the engine.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverIntervalAttributionTest {
    private val scheduler = TestCoroutineScheduler()

    @Test
    fun aThrottledFrameIsAttributedToTheThrottle() {
        val observer =
            CnnObserver(
                source = { cnnFrame(1) },
                fen = { "start" },
                onSnapshot = {},
                log = RecordingLog(),
                nowMs = { 0L },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(FakeClassifier(), "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()
        // The throttle is shut: `wantsFrame` never reaches `demand()`, so the engine never refused.
        observer.setIntervalS(10.0)
        observer.demandFrom { false }

        observer.onFrameAvailable()
        scheduler.runCurrent()

        assertEquals(1L, observer.gateInterval, "counters were ${observer.counters}")
        assertEquals(0L, observer.gateUnwanted, "the engine was never asked")
    }
}
