package com.chesslab.tracker.service

import com.chesslab.cnn.CnnRecovery
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.CnnObserver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/** Ein gescheiterter Attach nahm den Evaluator nie zurueck: Kandidaten liefen in `verifyTimeoutS`. */
@OptIn(ExperimentalCoroutinesApi::class)
class CnnAttachFailureDetachesBugTest {
    private val scheduler = TestCoroutineScheduler()
    private val dispatcher = StandardTestDispatcher(scheduler)
    private val config = TrackerConfig()
    private val host =
        engineHost(
            config,
            CnnRecovery(cnnConfig(config)),
            STARTPOS,
            EngineHooks(onDecision = {}, onConfigApplied = {}),
        )

    /** `settleFrames` ist CNN-bedingt und die einzige Spur von `cnnRun` im oeffentlichen Status. */
    private fun requiredStableFrames(): Int {
        host.tick(null)
        return requireNotNull(host.status().debug) { "debug payload armed above" }.requiredStableFrames
    }

    @Test
    fun aFailedAttachTakesTheEvaluatorBackOffTheEngine() {
        val observer =
            CnnObserver(
                source = { null },
                fen = { null },
                onSnapshot = {},
                dispatcher = dispatcher,
            )
        wireCnnAvailability(observer, host, CoroutineScope(dispatcher))
        host.submit(EngineAction.SetDebugEnabled(true))
        scheduler.runCurrent()
        val withCnn = config.settleFrames(cnnOn = true)
        val withoutCnn = config.settleFrames(cnnOn = false)
        assertNotEquals(withCnn, withoutCnn, "the observable only works while the two windows differ")
        assertEquals(withCnn, requiredStableFrames(), "armed at construction on purpose: the attach is asynchronous")

        observer.attach { error("no ONNX runtime on this machine") }
        scheduler.advanceUntilIdle()

        assertEquals(
            withoutCnn,
            requiredStableFrames(),
            "the attach failed, so the engine must run as the diff-only engine it now is instead " +
                "of queueing candidates for a verifier that will never answer",
        )
    }
}
