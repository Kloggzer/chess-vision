package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.tracker.camera.OpticsSettling
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationResult
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.FakeProfileBacking
import com.chesslab.tracker.geometry.QuadRefinement
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** An 800 px board edge in source pixels, so px/square comes out at a round 100. */
private val OK_CORNERS = floatArrayOf(0f, 0f, 800f, 0f, 800f, 800f, 0f, 800f)

private fun found() = CalibrationResult(OK_CORNERS, listOf(0, 1, 2, 3), 1920, 1080, ok = true, reason = null)

private fun notFound(why: String) = CalibrationResult(FloatArray(0), listOf(0, 1), 1920, 1080, ok = false, reason = why)

/** Records into a shared log, so the ORDER of optics and geometry is what the test reads. */
private class RecordingDetector(
    private val calls: MutableList<String>,
    private val result: CalibrationResult?,
) : BoardDetector {
    override suspend fun detect(): CalibrationResult? {
        calls += "detect"
        return result
    }

    /** Recorded like the others: the re-measure sequence must not trigger a grid refinement. */
    override suspend fun refine(corners: FloatArray): QuadRefinement? {
        calls += "refine"
        return null
    }

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? = null
}

private fun viewModel(
    scope: CoroutineScope,
    backing: FakeProfileBacking,
    calls: MutableList<String>,
    detected: CalibrationResult?,
    optics: (suspend () -> OpticsSettling)?,
) = CalibrationViewModel(
    detector = RecordingDetector(calls, detected),
    store = CalibrationStore(backing),
    scope = scope,
    nowMs = { SAVED_AT_MS },
    remeasureOptics = optics,
)

private const val SAVED_AT_MS = 7L

/**
 * The "Re-measure camera" sequence: optics first, geometry second, and all three outcomes visible.
 *
 * The order is the invariant this button exists to protect. Focus breathing moves the image, so a
 * marker quad measured while the lens was still hunting describes a picture that is already gone —
 * and a wrong quad silently transposes every label.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class RemeasureTest {
    @Test
    fun theGeometryIsMeasuredStrictlyAfterTheOpticsReportConverged() =
        runTest {
            val calls = mutableListOf<String>()
            val backing = FakeProfileBacking()
            val vm =
                viewModel(this, backing, calls, found()) {
                    calls += "optics released"
                    // A real convergence takes a visible moment; nothing may detect during it.
                    delay(1_500)
                    calls += "converged"
                    OpticsSettling.Converged(3.5f)
                }
            var applied: CalibrationProfile? = null
            vm.remeasure { applied = it }

            assertEquals(listOf("optics released", "converged", "detect"), calls)
            assertEquals(1, backing.writes)
            assertEquals(SAVED_AT_MS, applied?.savedAtMs)
            val outcome = vm.state.value.remeasure as Remeasure.Recalibrated
            assertEquals(3.5f, outcome.focusDistance)
            assertEquals(100, outcome.pxPerSquare, "800 px of board edge over eight squares")
            assertFalse(vm.state.value.remeasuring)
        }

    @Test
    fun aTimeoutLeavesTheOldLockInForceAndChangesNothing() =
        runTest {
            val calls = mutableListOf<String>()
            val backing = FakeProfileBacking()
            var applied = 0
            val vm =
                viewModel(this, backing, calls, found()) {
                    calls += "optics released"
                    OpticsSettling.TimedOut
                }
            vm.remeasure { applied++ }

            // No detection at all: a quad measured under optics that never settled is worse than
            // the one already stored, and `OpticsLock` has put the previous lock back.
            assertEquals(listOf("optics released"), calls)
            assertEquals(0, backing.writes)
            assertNull(backing.current)
            assertEquals(0, applied)
            assertEquals(Remeasure.TimedOut, vm.state.value.remeasure)
        }

    @Test
    fun markersNotFoundReMeasuresTheOpticsAndLeavesTheProfileAlone() =
        runTest {
            val why = "only 2 of 4 markers visible"
            val calls = mutableListOf<String>()
            val backing = FakeProfileBacking()
            var applied = 0
            val vm =
                viewModel(this, backing, calls, notFound(why)) {
                    calls += "optics released"
                    OpticsSettling.Converged(2.0f)
                }
            vm.remeasure { applied++ }

            assertEquals(listOf("optics released", "detect"), calls)
            assertEquals(0, backing.writes)
            assertEquals(0, applied)
            val outcome = vm.state.value.remeasure as Remeasure.NoMarkers
            assertEquals(why, outcome.reason)
            assertEquals(2.0f, outcome.focusDistance, "the optics WERE re-measured; only the board is missing")
            // The three outcomes must be distinguishable to the user, not only to the type system.
            assertNotEquals(remeasureMessage(outcome), remeasureMessage(Remeasure.TimedOut))
            assertNotEquals(
                remeasureMessage(outcome),
                remeasureMessage(Remeasure.Recalibrated(2.0f, 800, 100)),
            )
        }

    @Test
    fun withNoServiceAttachedTheButtonIsAbsentRatherThanInert() =
        runTest {
            val calls = mutableListOf<String>()
            val backing = FakeProfileBacking()
            val vm = viewModel(this, backing, calls, found(), optics = null)
            assertFalse(vm.canRemeasure)
            vm.remeasure()
            assertEquals(emptyList<String>(), calls)
            assertNull(vm.state.value.remeasure)
        }
}
