package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationResult
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.FakeProfileBacking
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.geometry.QuadRefinement
import com.chesslab.tracker.geometry.decodeProfile
import com.chesslab.tracker.geometry.encodeProfile
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private val OK_CORNERS = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)

private class FakeDetector(
    private val result: CalibrationResult?,
    private val gate: CompletableDeferred<Unit>? = null,
    /** What [refine] hands back. Null means "nothing measurable", the no-frame / blank-board case. */
    private val refinement: QuadRefinement? = null,
) : BoardDetector {
    var calls: Int = 0
        private set

    var refineCalls: Int = 0
        private set

    override suspend fun detect(): CalibrationResult? {
        calls++
        gate?.await()
        return result
    }

    override suspend fun refine(corners: FloatArray): QuadRefinement? {
        refineCalls++
        return refinement
    }

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? = null
}

private val FIXED_CORNERS = floatArrayOf(1f, 1f, 101f, 1f, 101f, 101f, 1f, 101f)

private fun refined(
    corners: FloatArray = FIXED_CORNERS,
    beforePx: Double = 8.0,
    afterPx: Double = 1.0,
    applied: Boolean = true,
) = QuadRefinement(corners, beforePx, afterPx, cellPx = 200.0, applied = applied)

private fun ok(
    width: Int = 1920,
    height: Int = 1080,
) = CalibrationResult(OK_CORNERS, listOf(0, 1, 2, 3), width, height, ok = true, reason = null)

@OptIn(ExperimentalCoroutinesApi::class)
class CalibrationViewModelTest {
    @Test
    fun saveIsBlockedUntilOrientationIsConfirmed() =
        runTest {
            val backing = FakeProfileBacking()
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this)
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(CalibrationStep.DETECTED, vm.state.value.step)
            assertFalse(vm.state.value.canSave)
            vm.save()
            advanceUntilIdle()
            assertEquals(0, backing.writes)

            vm.toConfirm()
            advanceUntilIdle()
            assertTrue(vm.state.value.orientationSeen)
            assertTrue(vm.state.value.canSave)
            vm.save()
            advanceUntilIdle()
            assertEquals(1, backing.writes)
        }

    /**
     * The refined quad is what gets CONFIRMED and what gets SAVED — not the detected one.
     *
     * ArUco resolves the quad from four markers glued on by hand; the board's own grooves are the
     * only thing that knows where the squares are. The whole Python corpus was cut 3-6 px off-grid
     * until 2026-07-31 with every count looking healthy, and re-cutting it moved the model's
     * empty-crop margin 5.5x. If the refinement did not reach `save`, this would be decoration.
     */
    @Test
    fun theConfirmedQuadIsTheRefinedOne() =
        runTest {
            val backing = FakeProfileBacking()
            val detector = FakeDetector(ok(), refinement = refined())
            val vm = CalibrationViewModel(detector, CalibrationStore(backing), this)
            vm.detectOnce()
            advanceUntilIdle()
            assertArrayEquals(OK_CORNERS, vm.state.value.corners)

            vm.toConfirm()
            advanceUntilIdle()
            assertEquals(1, detector.refineCalls, "the quad must be refined exactly once, on accept")
            assertArrayEquals(FIXED_CORNERS, vm.state.value.corners, "the raw ArUco quad survived")

            var saved: CalibrationProfile? = null
            vm.save { saved = it }
            advanceUntilIdle()
            assertEquals(1, backing.writes)
            assertArrayEquals(FIXED_CORNERS, saved!!.corners, "the profile kept the unrefined quad")
        }

    /** The aim poll runs twice a second; a ~80 ms refinement there would be felt on every frame. */
    @Test
    fun aimingNeverRefines() =
        runTest {
            val detector = FakeDetector(ok(), refinement = refined())
            val vm = CalibrationViewModel(detector, CalibrationStore(FakeProfileBacking()), this)
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(0, detector.refineCalls)
        }

    @Test
    fun anUnmeasurableBoardLeavesTheQuadExactlyAsDetected() =
        runTest {
            val detector = FakeDetector(ok(), refinement = null)
            val vm = CalibrationViewModel(detector, CalibrationStore(FakeProfileBacking()), this)
            vm.detectOnce()
            advanceUntilIdle()
            vm.toConfirm()
            advanceUntilIdle()
            assertArrayEquals(OK_CORNERS, vm.state.value.corners)
            assertTrue(vm.state.value.canSave, "a board with no readable grid must still be savable")
        }

    @Test
    fun theNoteReportsTheOffsetAsAFractionOfASquare() =
        runTest {
            // 8 px and 1 px of a 200 px square: the percentage is the only scale-free statement.
            val detector = FakeDetector(ok(), refinement = refined(beforePx = 8.0, afterPx = 1.0))
            val vm = CalibrationViewModel(detector, CalibrationStore(FakeProfileBacking()), this)
            vm.detectOnce()
            advanceUntilIdle()
            vm.toConfirm()
            advanceUntilIdle()
            assertEquals("grid corrected: 4% → 1% of a square", vm.state.value.note)
        }

    @Test
    fun detectionFailureSurfacesAReasonAndKeepsThePreviousProfileUntouched() =
        runTest {
            val why = "only 3 of 4 markers visible"
            val failure = CalibrationResult(FloatArray(0), listOf(0, 1, 2), 800, 600, ok = false, reason = why)
            val backing = FakeProfileBacking()
            val vm = CalibrationViewModel(FakeDetector(failure), CalibrationStore(backing), this)
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(why, vm.state.value.note)
            assertEquals(CalibrationStep.AIM, vm.state.value.step)
            // No silent fallback to stale corners, and nothing persisted.
            assertNull(vm.state.value.corners)
            assertEquals(0, backing.writes)
            assertNull(backing.current)
        }

    @Test
    fun onlyOneDetectionRunsAtATime() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val detector = FakeDetector(ok(), gate)
            val vm = CalibrationViewModel(detector, CalibrationStore(FakeProfileBacking()), this)
            vm.detectOnce()
            vm.detectOnce()
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(1, detector.calls)
            gate.complete(Unit)
            advanceUntilIdle()
            assertFalse(vm.state.value.detecting)
            // Only after the first finished does a second attempt get through.
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(2, detector.calls)
        }

    @Test
    fun frameSizeIsTakenFromTheDetectedFrame() =
        runTest {
            val backing = FakeProfileBacking()
            val detector = FakeDetector(ok(width = 3840, height = 2160))
            val vm = CalibrationViewModel(detector, CalibrationStore(backing), this, nowMs = { 5L })
            vm.detectOnce()
            advanceUntilIdle()
            assertEquals(3840, vm.state.value.frameWidth)
            assertEquals(2160, vm.state.value.frameHeight)
            vm.toConfirm()
            advanceUntilIdle()
            vm.save()
            advanceUntilIdle()
            val saved = (decodeProfile(backing.current) as ProfileLoad.Ok).profile
            assertEquals(3840, saved.sourceWidth)
            assertEquals(2160, saved.sourceHeight)
            assertEquals(5L, saved.savedAtMs)
        }

    @Test
    fun recalibrationDoesNotResetAHandSetWhitePov() =
        runTest {
            val stored =
                CalibrationProfile(
                    name = "default",
                    whitePov = false,
                    sourceWidth = 640,
                    sourceHeight = 480,
                    corners = OK_CORNERS,
                )
            val backing = FakeProfileBacking(encodeProfile(stored))
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this)
            advanceUntilIdle()
            assertFalse(vm.state.value.whitePov, "the stored orientation must load into the screen")
            vm.detectOnce()
            advanceUntilIdle()
            vm.toConfirm()
            advanceUntilIdle()
            vm.save()
            advanceUntilIdle()
            val saved = (decodeProfile(backing.current) as ProfileLoad.Ok).profile
            assertFalse(saved.whitePov)
        }
}
