package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.tracker.log.RecordingLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

internal class FakeClassifier(
    private val failing: Boolean = false,
) : SquareClassifier {
    override val classes: List<String> = EXPECTED_CLASSES
    var runs = 0

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        runs++
        if (failing) error("inference exploded")
        return Array(ALL_SQUARES.size) { FloatArray(EXPECTED_CLASSES.size) { c -> if (c == 0) 1.0f else 0.0f } }
    }
}

internal fun cnnFrame(seq: Long) = CnnFrame(List(ALL_SQUARES.size) { BgrImage(1, 1, ByteArray(3)) }, seq, seq, null, null)

/**
 * `_observer_due` / `_cnn_worker` on a virtual clock: an observation only ever starts synchronously in
 * [CnnObserver.onFrameAvailable], so the queued dispatcher decides exactly when it runs.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnObserverScheduleTest {
    private val scheduler = TestCoroutineScheduler()
    private var now = 0L
    private var fen: String? = "start"
    private val snapshots = mutableListOf<CnnSnapshot>()
    private var takes = 0
    private var seq = 1L
    private val log = RecordingLog()

    private fun observer(
        classifier: SquareClassifier = FakeClassifier(),
        priorLambda: Double = 0.0,
    ): CnnObserver {
        val observer =
            CnnObserver(
                source = {
                    takes++
                    cnnFrame(seq)
                },
                fen = { fen },
                onSnapshot = { snapshots += it },
                priorLambda = priorLambda,
                log = log,
                nowMs = { now },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { Attached(classifier, "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()
        return observer
    }

    @Test
    fun onlyOneObservationInFlight() {
        val observer = observer()
        repeat(100) { observer.onFrameAvailable() }
        scheduler.runCurrent()
        assertEquals(1, takes)
        assertEquals(1, snapshots.size)
    }

    @Test
    fun respectsObserverIntervalS() {
        val observer = observer()
        observer.setIntervalS(2.0)
        now = 5_000
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(1, snapshots.size)

        now = 6_900
        assertFalse(observer.wantsFrame())
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(1, snapshots.size)

        now = 7_000
        assertTrue(observer.wantsFrame())
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(2, snapshots.size)
    }

    @Test
    fun doesNotSpawnWhileFailed() {
        val observer =
            CnnObserver(
                source = {
                    takes++
                    cnnFrame(1)
                },
                fen = { fen },
                onSnapshot = { snapshots += it },
                log = log,
                nowMs = { now },
                dispatcher = StandardTestDispatcher(scheduler),
            )
        observer.attach { error("no model") }
        scheduler.runCurrent()
        repeat(10) { observer.onFrameAvailable() }
        scheduler.runCurrent()
        assertTrue(observer.state.value is CnnState.Failed)
        assertEquals(0, takes)
        assertEquals(0, snapshots.size)
    }

    @Test
    fun failureBacksOffOneSecondEvenAtIntervalZero() {
        val observer = observer(FakeClassifier(failing = true))
        now = 100
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(0, snapshots.size)
        assertEquals(1, log.warnings.size)

        now = 1_000
        assertFalse(observer.wantsFrame(), "interval 0 must not retry-and-log at loop rate")
        now = 1_100
        assertTrue(observer.wantsFrame())
    }

    @Test
    fun refusedFramesAreCountedByTheGateThatRefusedThem() {
        val observer = observer()
        observer.setIntervalS(2.0)
        now = 5_000
        observer.onFrameAvailable()
        // Still in flight — the dispatcher has not run the observation yet.
        observer.onFrameAvailable()
        observer.onFrameAvailable()
        scheduler.runCurrent()
        assertEquals(2L, observer.gateBusy)

        now = 6_000
        observer.onFrameAvailable()
        assertEquals(1L, observer.gateInterval)

        observer.setEnabled(false)
        observer.onFrameAvailable()
        assertEquals(1L, observer.gateOff)
        assertEquals(1L, observer.gateInterval, "the off refusal must not double-count as interval")
    }

    @Test
    fun snapshotCarriesTheObservedSeqAndTheFenCapturedAtStart() {
        val observer = observer()
        seq = 42
        observer.onFrameAvailable()
        // The game moves on while the CNN is still looking at frame 42.
        fen = "after-a-move"
        scheduler.runCurrent()
        val snap = snapshots.single()
        assertEquals(42L, snap.seq)
        assertEquals("start", snap.fen)
    }

    /** `gateUnwanted` wurde gezaehlt, aber von niemandem gedruckt — `observations = 0` blieb ununterscheidbar. */
    @Test
    fun anEngineRefusalIsReportedLikeEveryOtherGate() {
        val observer = observer()
        observer.demandFrom { false }

        observer.onFrameAvailable()
        scheduler.runCurrent()

        assertEquals(1L, observer.gateUnwanted, "the refusal was attributed to the engine's own demand")
        assertTrue(
            observer.counters.contains("gateUnwanted=1"),
            "the engine refused the frame, but the counter line does not carry it: \"${observer.counters}\"",
        )
    }

    /** `wantsFrame` asks the interval BEFORE `demand()`; the attribution once asked the other way round. */
    @Test
    fun aThrottledFrameIsAttributedToTheThrottle() {
        val observer = observer()
        observer.setIntervalS(10.0)
        observer.demandFrom { false }

        observer.onFrameAvailable()
        scheduler.runCurrent()

        assertEquals(1L, observer.gateInterval, "counters were ${observer.counters}")
        assertEquals(0L, observer.gateUnwanted, "the engine was never asked")
    }

    /** `possibleLabels` wirft auf eine kaputte FEN; der Snapshot danach sah wie "kein Prior gewollt" aus. */
    @Test
    fun aPriorThatCouldNotBeBuiltIsCountedAndLogged() {
        fen = "definitely not a fen"
        val observer = observer(priorLambda = 4.0)

        observer.onFrameAvailable()
        scheduler.runCurrent()
        observer.close()

        assertEquals(1, snapshots.size, "die Inferenz laeuft weiter — nur eben ohne Prior")
        assertTrue(observer.counters.contains("priorFailed=1"), "\"${observer.counters}\"")
        assertTrue(
            log.warnings.any { it.contains("prior", ignoreCase = true) },
            "kein Wort ueber den verschluckten Fehler: ${log.warnings}",
        )
    }
}
