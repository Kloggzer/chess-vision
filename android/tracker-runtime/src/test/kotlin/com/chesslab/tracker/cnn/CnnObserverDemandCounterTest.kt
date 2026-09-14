package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Die Zieh-Haelfte der CNN-Drossel, auf der Zeile, die die anderen drei meldet.
 *
 * `observations = 0` hat von aussen ununterscheidbare Ursachen — genau dafuer sind die Zaehler da.
 * `gateUnwanted` wird "wie die anderen" gezaehlt, aber von niemandem gedruckt.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverDemandCounterTest {
    private val scheduler = TestCoroutineScheduler()

    @Test
    fun anEngineRefusalIsReportedLikeEveryOtherGate() {
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
        // An engine that knows a reading would tell it nothing. The only gate that refuses here.
        observer.demandFrom { false }

        observer.onFrameAvailable()
        scheduler.runCurrent()

        assertEquals(1L, observer.gateUnwanted, "the refusal was attributed to the engine's own demand")
        assertTrue(
            observer.counters.contains("gateUnwanted=1"),
            "the engine refused the frame and the counter recorded it, but the line that reports every " +
                "other gate does not carry it: \"${observer.counters}\". `TrackerStack.dropLine()` omits it " +
                "too, so a run where the ENGINE is what silences the CNN is indistinguishable from one " +
                "where the observer was simply never asked.",
        )
    }
}
