package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationResult
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.FakeProfileBacking
import com.chesslab.tracker.geometry.QuadRefinement
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
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
) : BoardDetector {
    var calls: Int = 0
        private set

    override suspend fun detect(): CalibrationResult? {
        calls++
        gate?.await()
        return result
    }

    override suspend fun refine(corners: FloatArray): QuadRefinement? = null

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? = null
}

private fun ok(
    width: Int = 1920,
    height: Int = 1080,
    markers: List<Int> = listOf(0, 1, 2, 3),
) = CalibrationResult(OK_CORNERS, markers, width, height, ok = true, reason = null)

private fun failed(
    width: Int = 1920,
    height: Int = 1080,
    markers: List<Int> = listOf(0),
) = CalibrationResult(FloatArray(0), markers, width, height, ok = false, reason = "only 1 of 4 markers visible")

private fun store() = CalibrationStore(FakeProfileBacking())

@OptIn(ExperimentalCoroutinesApi::class)
class CalibrationViewModelTest {
    @Test
    fun aFoundBoardCanBeUsed() =
        runTest {
            val vm = CalibrationViewModel(FakeDetector(ok()), store(), this) { 7L }
            vm.detectOnce()
            assertTrue(vm.state.value.found)
            assertArrayEquals(OK_CORNERS, vm.state.value.corners)
            assertEquals(1920, vm.state.value.frameWidth)
        }

    /**
     * The frame size is stamped even when nothing was found.
     *
     * It is the source size everything downstream maps into and it must come from the detected Mat
     * (a7dab73) — a screen that has seen a frame but no board still knows how big the frame is.
     */
    @Test
    fun aFailedDetectionStillStampsTheFrameSize() =
        runTest {
            val vm = CalibrationViewModel(FakeDetector(failed()), store(), this) { 7L }
            vm.detectOnce()
            assertFalse(vm.state.value.found)
            assertNull(vm.state.value.corners)
            assertEquals(1920, vm.state.value.frameWidth)
            assertEquals(1080, vm.state.value.frameHeight)
        }

    /** No frame at all is a different state from a frame with no board, and says so. */
    @Test
    fun noFrameSaysSo() =
        runTest {
            val vm = CalibrationViewModel(FakeDetector(null), store(), this) { 7L }
            vm.detectOnce()
            assertTrue(
                vm.state.value.note
                    .contains("camera", ignoreCase = true),
            )
            assertEquals(0, vm.state.value.frameWidth)
        }

    /** A detection in flight must not be joined by a second one — the detector is not reentrant. */
    @Test
    fun detectionsDoNotOverlap() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val detector = FakeDetector(ok(), gate)
            val vm = CalibrationViewModel(detector, store(), this) { 7L }
            launch { vm.detectOnce() }
            launch { vm.detectOnce() }
            runCurrent()
            assertEquals(1, detector.calls, "the second call must be dropped while the first is open")
            gate.complete(Unit)
            advanceUntilIdle()
        }

    /** A full four-code read is adopted with nobody pressing anything. */
    @Test
    fun aFullReadIsAdoptedOnItsOwn() =
        runTest {
            val backing = FakeProfileBacking()
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this) { 7L }
            var adopted: CalibrationProfile? = null
            vm.onAdopted = { adopted = it }
            launch { vm.autoDetect() }
            runCurrent()
            advanceTimeBy(1)
            runCurrent()
            assertTrue(vm.state.value.saved)
            assertEquals(1, backing.writes)
            assertEquals(1920, adopted?.sourceWidth)
            coroutineContext.cancelChildren()
        }

    /**
     * Below four codes the quad is RECONSTRUCTED, and at two it is a similarity fit — a square-board
     * assumption with no perspective. Writing a board size derived from that is the silent geometry
     * invalidation this screen was rebuilt to stop. The outline still shows; the record does not move.
     */
    @Test
    fun aPartialReadIsDrawnButNeverWritten() =
        runTest {
            val backing = FakeProfileBacking()
            val vm =
                CalibrationViewModel(FakeDetector(ok(markers = listOf(0, 1))), CalibrationStore(backing), this) { 7L }
            launch { vm.autoDetect() }
            runCurrent()
            advanceTimeBy(1)
            runCurrent()
            assertTrue(vm.state.value.found, "the outline is still drawn")
            assertFalse(vm.state.value.saved)
            assertEquals(0, backing.writes)
            coroutineContext.cancelChildren()
        }

    /** A steady camera must not rewrite the profile twice a second. */
    @Test
    fun aSteadyBoardIsWrittenOnce() =
        runTest {
            val backing = FakeProfileBacking()
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this) { 7L }
            launch { vm.autoDetect() }
            runCurrent()
            advanceTimeBy(2_000)
            runCurrent()
            assertEquals(1, backing.writes)
            coroutineContext.cancelChildren()
        }
}

/**
 * The sentence is the whole of this screen's copy, so it is the whole of what there is to test.
 *
 * Four branches, and the distinction that matters is the middle one: fewer than four codes is NOT a
 * failure — the missing corners are reconstructed — but the user is told, because an inferred quad
 * and a measured one are not the same thing.
 */
class BoardNoteTest {
    @Test
    fun everyBranchSaysWhatToDo() {
        assertEquals("Board found.", boardNote(ok = true, markers = 4))
        assertTrue(boardNote(ok = true, markers = 3).contains("estimated"))
        assertTrue(boardNote(ok = false, markers = 2).contains("move the camera"))
        assertTrue(boardNote(ok = false, markers = 0).contains("point the camera", ignoreCase = true))
    }
}
