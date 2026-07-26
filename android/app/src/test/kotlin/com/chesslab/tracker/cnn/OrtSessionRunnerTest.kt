package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

private const val CROPS = 64
private const val PLANES = 3
private const val SIDE = 128

private val INPUT_SHAPE = longArrayOf(CROPS.toLong(), PLANES.toLong(), SIDE.toLong(), SIDE.toLong())

/** The real graph's input tensor, zeroed — the runner never looks at the values. */
private fun zeroInput(): FloatBuffer =
    ByteBuffer
        .allocateDirect(CROPS * PLANES * SIDE * SIDE * Float.SIZE_BYTES)
        .order(ByteOrder.nativeOrder())
        .asFloatBuffer()

private fun stageAssets(tmp: File): StagedModel =
    CnnModelAssets({ name -> File(assetDir(), name).takeIf { it.isFile }?.inputStream() }, tmp).stage()

private fun leftoverProfiles(dir: File): List<String> = dir.list().orEmpty().filter { it.startsWith("ep-verify") }

/**
 * The session's own configuration, which nothing verified before.
 *
 * The desktop JVM has working ORT natives (the CPU provider builds and runs the bundled graph), so
 * these are real sessions — but `OrtSession.SessionOptions` is write-only: no getter reads a thread
 * count or an optimisation level back out. The pinned values are therefore asserted on
 * [SessionTuning], the object they are applied FROM; the profiling flag, which does have an
 * observable consequence, is asserted end to end.
 */
class OrtSessionRunnerTest {
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()

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

    @Test
    fun profilingIsOffForAnObservationSession(
        @TempDir tmp: File,
    ) {
        val staged = stageAssets(tmp)
        OrtSessionRunner(env, staged.fp32, Ep.CPU, staged.dir).use { runner ->
            runner.run(zeroInput(), INPUT_SHAPE)
            // No trace to end, so no provider — and, crucially, no per-kernel instrumentation over
            // 473 nodes on a session that only ever has to classify.
            assertNull(runner.profiledProvider(), "an unprofiled session must have no trace to read")
        }
        assertTrue(leftoverProfiles(staged.dir).isEmpty(), "no profile may be written: ${leftoverProfiles(staged.dir)}")
    }

    @Test
    fun aVerificationSessionStillNamesTheProviderThatRan(
        @TempDir tmp: File,
    ) {
        val staged = stageAssets(tmp)
        OrtSessionRunner(env, staged.fp32, Ep.CPU, staged.dir, profile = true).use { runner ->
            runner.run(zeroInput(), INPUT_SHAPE)
            val provider = runner.profiledProvider()
            assertNotNull(provider, "EpVerdict has no other source — profiling must still work when asked for")
            assertEquals(Ep.CPU, epForProvider(provider!!))
        }
        assertTrue(leftoverProfiles(staged.dir).isEmpty(), "the trace must be deleted once read")
    }
}
