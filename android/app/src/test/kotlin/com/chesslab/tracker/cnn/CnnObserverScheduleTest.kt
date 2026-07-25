package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
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
 * `_observer_due` / `_cnn_worker` on a virtual clock and a queued dispatcher: an observation is
 * only ever started synchronously in [CnnObserver.onFrameAvailable], so the scheduler decides
 * exactly when it runs.
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

    private fun observer(classifier: SquareClassifier = FakeClassifier()): CnnObserver {
        val observer =
            CnnObserver(
                source = {
                    takes++
                    cnnFrame(seq)
                },
                fen = { fen },
                onSnapshot = { snapshots += it },
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
}
