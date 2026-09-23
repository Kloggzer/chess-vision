package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationResult
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.FakeProfileBacking
import com.chesslab.tracker.geometry.MeasuredGeometry
import com.chesslab.tracker.geometry.ProfileBacking
import com.chesslab.tracker.geometry.carryOver
import com.chesslab.tracker.geometry.encodeProfile
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
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

    /** Stamped even when nothing was found: the source size must come from the detected Mat (a7dab73). */
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

    /** The detector is not reentrant. */
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

    @Test
    fun aThrowingDetectionDoesNotWedgeTheScreen() =
        runTest {
            val detector = ThrowingOnceDetector()
            val vm = CalibrationViewModel(detector, store(), this) { 7L }
            runCatching { vm.detectOnce() }

            vm.detectOnce()

            assertEquals(2, detector.calls, "the detect latch stayed closed after a throw: every later poll returns at the guard")
            assertTrue(vm.state.value.found, "the screen never recovered and shows no board")
        }

    @Test
    fun aThrowingStoreDoesNotWedgeTheAdoption() =
        runTest {
            val backing = ThrowingOnceBacking()
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this) { 7L }
            launch { vm.autoDetect() }
            runCurrent()
            advanceTimeBy(2_000)
            runCurrent()
            advanceTimeBy(2_000)
            runCurrent()

            assertEquals(2, backing.writes, "the write latch stayed closed after a throw: this screen never writes a calibration again")
            coroutineContext.cancelChildren()
        }

    @Test
    fun aFullReadIsAdoptedOnItsOwn() =
        runTest {
            val backing = FakeProfileBacking()
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this) { 7L }
            var adopted: CalibrationProfile? = null
            vm.onAdopted = { adopted = it }
            launch { vm.autoDetect() }
            runCurrent()
            assertFalse(vm.state.value.saved, "one frame is not a stable calibration")
            advanceTimeBy(500)
            runCurrent()
            assertFalse(vm.state.value.saved, "two frames are not a stable calibration")
            advanceTimeBy(500)
            runCurrent()
            assertTrue(vm.state.value.saved)
            assertEquals(1, backing.writes)
            assertEquals(1920, adopted?.sourceWidth)
            coroutineContext.cancelChildren()
        }

    /** Below four codes the quad is RECONSTRUCTED, at two a similarity fit: a board size from that is the silent
     *  geometry invalidation this screen was rebuilt to stop. */
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

    @Test
    fun threeStableMarkersAreAdopted() =
        runTest {
            val backing = FakeProfileBacking()
            val vm =
                CalibrationViewModel(
                    FakeDetector(ok(markers = listOf(0, 1, 2))),
                    CalibrationStore(backing),
                    this,
                ) { 7L }
            launch { vm.autoDetect() }
            runCurrent()
            advanceTimeBy(1_500)
            runCurrent()
            assertFalse(vm.state.value.saved)
            advanceTimeBy(500)
            runCurrent()
            assertTrue(vm.state.value.saved)
            assertEquals(1, backing.writes)
            coroutineContext.cancelChildren()
        }

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

    /** The stored dictionary from the first detection, or a board with other codes stays invisible. */
    @Test
    fun theFirstDetectionUsesTheSavedMarkerDictionary() =
        runTest {
            val saved = carryOver(null, MeasuredGeometry(OK_CORNERS, 1920, 1080)).copy(markerDict = "DICT_5X5_100")
            val store = CalibrationStore(FakeProfileBacking(encodeProfile(saved)))
            val seen = mutableListOf<String>()
            val vm = CalibrationViewModel(GeometryReadingDetector(store::geometry, seen), store, this) { 7L }
            launch { vm.autoDetect() }
            runCurrent()

            assertEquals(listOf("DICT_5X5_100"), seen, "detection ran with the default geometry instead of the saved profile")
            coroutineContext.cancelChildren()
        }

    @Test
    fun anUnchangedBoardIsNotRewrittenWhenAScreenOpens() =
        runTest {
            val saved = carryOver(null, MeasuredGeometry(OK_CORNERS, 1920, 1080))
            val backing = FakeProfileBacking(encodeProfile(saved))
            val vm = CalibrationViewModel(FakeDetector(ok()), CalibrationStore(backing), this) { 7L }
            var adopted: CalibrationProfile? = null
            vm.onAdopted = { adopted = it }
            launch { vm.autoDetect(stopAfterSaved = true) }
            runCurrent()
            advanceTimeBy(2_000)
            runCurrent()

            assertEquals(0, backing.writes, "a new screen rewrote a profile that already matched the board")
            assertTrue(vm.state.value.saved, "the tracking screen must still stop polling")
            assertArrayEquals(OK_CORNERS, adopted?.corners, "the running tracker still gets the fresh seed")
            coroutineContext.cancelChildren()
        }
}

/** Fewer than four codes is NOT a failure, but the user is told: inferred and measured quads differ. */
class BoardNoteTest {
    @Test
    fun everyBranchSaysWhatToDo() {
        assertEquals("Board calibrated.", boardNote(ok = true, markers = 4))
        assertTrue(boardNote(ok = true, markers = 4, stableReads = 1).contains("hold", ignoreCase = true))
        assertTrue(boardNote(ok = true, markers = 3, stableReads = 5).contains("calibrated", ignoreCase = true))
        assertTrue(boardNote(ok = false, markers = 2).contains("move the camera"))
        assertTrue(boardNote(ok = false, markers = 0).contains("point the camera", ignoreCase = true))
    }
}

private class ThrowingOnceDetector : BoardDetector {
    var calls: Int = 0
        private set

    override suspend fun detect(): CalibrationResult {
        calls++
        if (calls == 1) error("detector blew up")
        return ok()
    }

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? = null
}

private class GeometryReadingDetector(
    private val geometry: () -> BoardGeometry,
    private val seen: MutableList<String>,
) : BoardDetector {
    override suspend fun detect(): CalibrationResult? {
        seen += geometry().markerDict
        return null
    }

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? = null
}

private class ThrowingOnceBacking : ProfileBacking {
    private val flow = MutableStateFlow<String?>(null)
    var writes: Int = 0
        private set

    override val text: Flow<String?> = flow

    override suspend fun write(text: String) {
        writes++
        if (writes == 1) error("store blew up")
        flow.value = text
    }
}
