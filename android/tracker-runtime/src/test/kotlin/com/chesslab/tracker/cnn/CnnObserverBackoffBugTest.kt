package com.chesslab.tracker.cnn

import com.chesslab.engine.api.CnnSnapshot
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** `startedMs = now + 1000` machte die Pause eine Sekunde PLUS ein Beobachtungsintervall. */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverBackoffBugTest {
    private val scheduler = TestCoroutineScheduler()
    private var now = 0L
    private val snapshots = mutableListOf<CnnSnapshot>()
    private var takes = 0

    @Test
    fun aFailedObservationPausesForOneSecondAndNotForOneSecondPlusTheInterval() {
        val observer =
            CnnObserver(
                source = {
                    takes++
                    cnnFrame(takes.toLong())
                },
                fen = { "start" },
                onSnapshot = { snapshots += it },
                nowMs = { now },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(FakeClassifier(failing = true), "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()
        observer.setIntervalS(INTERVAL_S)

        now = FIRST_MS
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(1, takes, "the first observation must run and fail")

        now = FIRST_MS + BACKOFF_MS
        observer.onFrameAvailable()
        scheduler.runCurrent()

        assertEquals(
            2,
            takes,
            "one second after the failure the observer is still idle: the backoff was written into " +
                "`startedMs`, which the readiness check then compares against the observer interval too",
        )
    }

    private companion object {
        const val INTERVAL_S = 0.2
        const val BACKOFF_MS = 1000L
        const val FIRST_MS = 5000L
    }
}
