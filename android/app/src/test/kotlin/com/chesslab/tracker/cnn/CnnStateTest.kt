package com.chesslab.tracker.cnn

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

internal class RecordingLog : CnnLog {
    val infos = mutableListOf<String>()
    val warnings = mutableListOf<String>()
    val errors = mutableListOf<Pair<String, Throwable?>>()

    override fun info(message: String) {
        infos += message
    }

    override fun warn(
        message: String,
        error: Throwable?,
    ) {
        warnings += message
    }

    override fun error(
        message: String,
        error: Throwable?,
    ) {
        errors += message to error
    }
}

/**
 * MEMORY `android-live-bringup-2607`: the attach failed silently and the tracker ran diff-only
 * for a whole session. A failure must be a state AND an ERROR log, and it must stay put.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnStateTest {
    private val scheduler = TestCoroutineScheduler()
    private val log = RecordingLog()

    private fun observer() =
        CnnObserver(
            source = { null },
            fen = { null },
            onSnapshot = { },
            log = log,
            nowMs = { 0L },
            dispatcher = StandardTestDispatcher(scheduler),
        )

    @Test
    fun attachFailureProducesFailedWithANonEmptyReasonAndAnErrorLog() {
        val observer = observer()
        observer.attach { error("config.json is corrupt") }
        scheduler.runCurrent()

        val state = observer.state.value
        assertTrue(state is CnnState.Failed, "state is $state")
        assertEquals("config.json is corrupt", (state as CnnState.Failed).reason)
        assertEquals(1, log.errors.size)
        assertTrue(
            log.errors
                .single()
                .first
                .contains("config.json is corrupt"),
        )
        assertTrue(log.errors.single().second != null, "the throwable must reach the log")
    }

    @Test
    fun failedStateIsStickyUntilRetryAttach() {
        val observer = observer()
        observer.attach { error("boom") }
        scheduler.runCurrent()

        observer.attach { Attached(FakeClassifier(), "CPU", MODEL_FP32_FILE) }
        scheduler.runCurrent()
        assertTrue(observer.state.value is CnnState.Failed, "a plain re-attach must not silently retry")

        observer.retryAttach { Attached(FakeClassifier(), "QNN-HTP(NPU)", MODEL_QNN_FILE) }
        scheduler.runCurrent()
        assertEquals(CnnState.Ready("QNN-HTP(NPU)", MODEL_QNN_FILE), observer.state.value)
        assertTrue(log.infos.any { it.startsWith("CNN inference backend: QNN-HTP(NPU) (model=model.qnn.onnx, classes=14)") })
    }

    @Test
    fun failureWithoutAMessageStillNamesAReason() {
        val observer = observer()
        observer.attach { throw IllegalStateException() }
        scheduler.runCurrent()
        assertEquals(CnnState.Failed("IllegalStateException"), observer.state.value)
    }
}
