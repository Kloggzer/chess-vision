package com.chesslab.tracker.cnn

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Ein Prior, der nicht gerechnet werden konnte, darf nicht wie "kein Prior gewollt" aussehen:
 * `possibleLabels` wirft auf eine kaputte FEN, und der Snapshot danach sieht normal aus.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverPriorFailureTest {
    private val scheduler = TestCoroutineScheduler()
    private val log = RecordingLog()

    @Test
    fun aPriorThatCouldNotBeBuiltIsCountedAndLogged() {
        val snapshots = mutableListOf<CnnSnapshot>()
        val observer =
            CnnObserver(
                source = { cnnFrame(1) },
                fen = { "definitely not a fen" },
                onSnapshot = { snapshots += it },
                priorLambda = 4.0,
                log = log,
                nowMs = { 0L },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(FakeClassifier(), "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()

        observer.onFrameAvailable()
        scheduler.runCurrent()
        observer.close()

        assertEquals(1, snapshots.size, "die Inferenz laeuft weiter — nur eben ohne Prior")
        assertTrue(
            observer.counters.contains("priorFailed=1"),
            "der Prior konnte nicht gebaut werden, die Zaehlerzeile sagt es aber nicht: " +
                "\"${observer.counters}\"",
        )
        assertTrue(
            log.warnings.any { it.contains("prior", ignoreCase = true) },
            "kein Wort ueber den verschluckten Fehler: ${log.warnings}",
        )
    }
}
