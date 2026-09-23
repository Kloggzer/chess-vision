package com.chesslab.tracker.ui.tracking

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AcceptCnnDialogModelTest {
    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterEach
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun previewListsEveryChangedSquareWithFromToAndConfidence() {
        val reads = mapOf("e2" to CnnRead("empty", 0.97), "e4" to CnnRead("wP", 0.91))
        val preview = acceptCnnPreview(STARTPOS, listOf("e2", "e4"), reads)
        assertEquals(listOf("e2", "e4"), preview.rows.map { it.square })
        assertEquals("white pawn", preview.rows[0].from)
        assertEquals("empty", preview.rows[0].to)
        assertEquals(0.97, preview.rows[0].confidence)
        assertEquals("empty", preview.rows[1].from)
        assertEquals("white pawn", preview.rows[1].to)
        assertTrue(preview.complete)
        assertEquals("e4:  empty → white pawn (91%)", formatChange(preview.rows[1]))
    }

    @Test
    fun previewIsIncompleteWithoutCnnReadsAndStillNamesTheBelievedPiece() {
        // The engine has no preview variant and `TrackerStatus` no CNN label map: only the believed side is knowable.
        val preview = acceptCnnPreview(STARTPOS, listOf("d8"))
        assertEquals("black queen", preview.rows.single().from)
        assertNull(preview.rows.single().to)
        assertFalse(preview.complete)
        assertEquals("d8:  black queen → ?", formatChange(preview.rows.single()))
    }

    @Test
    fun cancelDispatchesNoAction() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            advanceUntilIdle()
            session.status.value =
                idleTrackerStatus().copy(alarm = TrackerEvent.Alarm("illegal_move", listOf("e2"), null, null))
            advanceUntilIdle()
            vm.onAcceptCnnRequested()
            assertNotNull(vm.acceptCnn.value)
            assertEquals(
                listOf("e2"),
                vm.acceptCnn.value
                    ?.rows
                    ?.map { it.square },
            )
            vm.onAcceptCnnCancelled()
            assertNull(vm.acceptCnn.value)
            // Opening and cancelling the dialog mutates NOTHING (specs/16/04-alarm-ux.md).
            assertTrue(session.calls.isEmpty())
        }

    @Test
    fun confirmDispatchesAcceptExactlyOnce() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            advanceUntilIdle()
            vm.onAcceptCnnRequested()
            vm.onAcceptCnnConfirmed()
            assertNull(vm.acceptCnn.value)
            assertEquals(listOf("acceptCnnPosition"), session.calls)
        }
}
