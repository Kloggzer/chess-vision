package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtSession
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The session's own configuration, which nothing verified before.
 *
 * The desktop JVM has working ORT natives (the CPU provider builds and runs the bundled graph), so
 * a real `SessionOptions` can be built here — but it is write-only: no getter reads a thread count
 * or an optimisation level back out. The pinned values are therefore asserted on [SessionTuning],
 * the object they are applied FROM, and the application itself is asserted by not throwing.
 */
class OrtSessionRunnerTest {
    @Test
    fun sessionOptionsPinThreadsAndOptimisation() {
        // 4 = the big cores of the SM8650. A change here is a deployment decision, not a tidy-up.
        assertEquals(4, SessionTuning.THREADS)
        assertEquals(OrtSession.SessionOptions.OptLevel.ALL_OPT, SessionTuning.OPT_LEVEL)
        // One batched graph: inter-op parallelism has nothing to overlap.
        assertEquals(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL, SessionTuning.EXECUTION_MODE)
        // And they are accepted by the real thing rather than only by this test.
        OrtSession.SessionOptions().use { SessionTuning.applyTo(it) }
    }
}
