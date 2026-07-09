package com.chesslab.tracker.camera

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.time.Duration.Companion.seconds

/** Records the resolutions pushed by the controller. */
private class FakeCamera : ResolutionTarget {
    val calls = mutableListOf<Resolution>()

    override fun setResolution(res: Resolution) {
        calls += res
    }
}

/** Drives the uncertainty signal from the test. */
private class FakeEngine : UncertaintySource {
    val signal = MutableStateFlow(false)
    override val uncertainty: Flow<Boolean> = signal
}

@OptIn(ExperimentalCoroutinesApi::class)
class DynamicResolutionControllerTest {
    private fun config(dynamic: Boolean = true) =
        CameraConfig(
            resolution = Resolution.R720P,
            dynamicResolution = dynamic,
        )

    @Test
    fun `escalates one rung after sustained uncertainty`() =
        runTest {
            val camera = FakeCamera()
            val engine = FakeEngine()
            val controller = DynamicResolutionController(camera, engine, backgroundScope, config())
            controller.start()

            engine.signal.value = true
            advanceTimeBy(2.seconds)
            runCurrent()
            // Not yet: escalate window (3 s) has not elapsed.
            assertEquals(Resolution.R720P, controller.activeResolution.value)
            assertTrue(camera.calls.isEmpty())

            advanceTimeBy(2.seconds)
            runCurrent()
            assertEquals(Resolution.R1080P, controller.activeResolution.value)
            assertEquals(listOf(Resolution.R1080P), camera.calls)
        }

    @Test
    fun `de-escalates after hold once uncertainty clears`() =
        runTest {
            val camera = FakeCamera()
            val engine = FakeEngine()
            val controller = DynamicResolutionController(camera, engine, backgroundScope, config())
            controller.start()

            engine.signal.value = true
            advanceTimeBy(4.seconds)
            runCurrent()
            assertEquals(Resolution.R1080P, controller.activeResolution.value)

            engine.signal.value = false
            advanceTimeBy(9.seconds)
            runCurrent()
            // Still held (hold window is 10 s).
            assertEquals(Resolution.R1080P, controller.activeResolution.value)

            advanceTimeBy(2.seconds)
            runCurrent()
            assertEquals(Resolution.R720P, controller.activeResolution.value)
            assertEquals(listOf(Resolution.R1080P, Resolution.R720P), camera.calls)
        }

    @Test
    fun `does not flap on a one-second blip`() =
        runTest {
            val camera = FakeCamera()
            val engine = FakeEngine()
            val controller = DynamicResolutionController(camera, engine, backgroundScope, config())
            controller.start()

            engine.signal.value = true
            advanceTimeBy(1.seconds)
            runCurrent()
            engine.signal.value = false
            advanceTimeBy(5.seconds)
            runCurrent()

            assertEquals(Resolution.R720P, controller.activeResolution.value)
            assertTrue(camera.calls.isEmpty())
        }

    @Test
    fun `stays escalated when uncertainty returns during hold`() =
        runTest {
            val camera = FakeCamera()
            val engine = FakeEngine()
            val controller = DynamicResolutionController(camera, engine, backgroundScope, config())
            controller.start()

            engine.signal.value = true
            advanceTimeBy(4.seconds)
            runCurrent()
            engine.signal.value = false
            advanceTimeBy(5.seconds)
            runCurrent()
            engine.signal.value = true
            advanceTimeBy(5.seconds)
            runCurrent()

            assertEquals(Resolution.R1080P, controller.activeResolution.value)
            // Only the initial escalation; no bounce back to base.
            assertEquals(listOf(Resolution.R1080P), camera.calls)
        }

    @Test
    fun `is a no-op when dynamic resolution is disabled`() =
        runTest {
            val camera = FakeCamera()
            val engine = FakeEngine()
            val controller =
                DynamicResolutionController(camera, engine, backgroundScope, config(dynamic = false))
            controller.start()

            engine.signal.value = true
            advanceTimeBy(5.seconds)
            runCurrent()

            assertEquals(Resolution.R720P, controller.activeResolution.value)
            assertTrue(camera.calls.isEmpty())
        }
}
