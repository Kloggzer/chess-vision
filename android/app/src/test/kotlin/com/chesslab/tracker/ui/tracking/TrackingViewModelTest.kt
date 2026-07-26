package com.chesslab.tracker.ui.tracking

import android.graphics.Bitmap
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/** Records what the UI dispatched. It cannot do anything else — the real one only sends requests too. */
class FakeTrackerSession : TrackerSession {
    override val status = MutableStateFlow<TrackerStatus?>(idleTrackerStatus())
    override val events = MutableSharedFlow<TrackerEvent>(extraBufferCapacity = 32)
    override val rawPreview = MutableStateFlow<Bitmap?>(null)
    override val cameraOn = MutableStateFlow(true)

    val calls = mutableListOf<String>()

    /** The real service answers by flipping its own flow, so the fake does too. */
    override fun setCameraOn(on: Boolean) {
        calls += "setCameraOn:$on"
        cameraOn.value = on
    }

    override fun undo() {
        calls += "undo"
    }

    override fun resetGame() {
        calls += "resetGame"
    }

    override fun captureBaseline() {
        calls += "captureBaseline"
    }

    override fun choosePromotion(piece: Char) {
        calls += "choosePromotion:$piece"
    }

    override fun acceptCnnPosition() {
        calls += "acceptCnnPosition"
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class TrackingViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterEach
    fun tearDown() = Dispatchers.resetMain()

    private fun fenStatus(fen: String): TrackerStatus = idleTrackerStatus(fen)

    @Test
    fun boardRendersOnlyFromStatusFen() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            advanceUntilIdle()
            val statusFen = "8/8/8/8/8/8/8/K6k w - - 0 1"
            session.status.value = fenStatus(statusFen)
            // A commit whose fenAfter DISAGREES with the status must not become the board.
            session.events.emit(
                TrackerEvent.MoveCommitted("e2e4", "e4", "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w - - 0 1", "diff", false),
            )
            advanceUntilIdle()
            assertEquals(statusFen, vm.ui.value.fen)
            assertEquals("e2e4", vm.lastMoveUci)
        }

    @Test
    fun promotionDialogOpensOnPromotionPendingAndIsNotDismissible() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            advanceUntilIdle()
            session.events.emit(TrackerEvent.PromotionPending("e7", "e8"))
            advanceUntilIdle()
            assertEquals(PromotionPrompt("e7", "e8"), vm.promotion.value)
            // The engine is blocked on the answer: nothing but the matching commit closes it, and
            // the view model exposes no dismiss action at all.
            listOf(
                TrackerEvent.Note("anything"),
                TrackerEvent.Stuck("no_legal_move"),
                TrackerEvent.ReAnchored,
                TrackerEvent.MoveCommitted("d2d4", "d4", "fen", "diff", false),
            ).forEach { session.events.emit(it) }
            advanceUntilIdle()
            assertNotNull(vm.promotion.value)
            vm.onPromotionChosen('q')
            assertEquals(listOf("choosePromotion:q"), session.calls)
            assertNotNull(vm.promotion.value)
        }

    @Test
    fun promotionDialogClosesWhenTheMatchingMoveCommits() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            advanceUntilIdle()
            session.events.emit(TrackerEvent.PromotionPending("e7", "e8"))
            session.events.emit(TrackerEvent.MoveCommitted("e7e8q", "e8=Q", "fen", "diff", false))
            advanceUntilIdle()
            assertNull(vm.promotion.value)
        }

    @Test
    fun undoResetAndRecalibrateAreThreeDistinctActions() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            vm.onUndo()
            vm.onResetGame()
            vm.onRecalibrate()
            advanceUntilIdle()
            // Recalibrate is navigation, not a tracker action: it must reach the session NOT AT ALL.
            assertEquals(listOf("undo", "resetGame"), session.calls)
        }

    @Test
    fun stoppingTheCameraOverridesTheFrozenStatusHeader() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            session.status.value = idleTrackerStatus().copy(state = "waiting", fps = 14.8)
            advanceUntilIdle()
            assertEquals("WAITING", vm.ui.value.stateText)

            vm.onToggleCamera()
            advanceUntilIdle()
            assertEquals(listOf("setCameraOn:false"), session.calls)
            // The last status stands forever once frames stop; the header must not keep reporting it.
            assertEquals("STOPPED", vm.ui.value.stateText)
            assertEquals("camera off", vm.ui.value.fpsText)

            vm.onToggleCamera()
            advanceUntilIdle()
            assertEquals("WAITING", vm.ui.value.stateText)
        }

    @Test
    fun doesNotCollectStatusMoreThanOnce() =
        runTest(dispatcher) {
            val session = FakeTrackerSession()
            val vm = TrackingViewModel()
            vm.attach(session)
            vm.attach(session)
            vm.attach(session)
            advanceUntilIdle()
            assertEquals(1, session.status.subscriptionCount.value)
        }
}
