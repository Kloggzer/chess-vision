package com.chesslab.tracker.service

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameSessionController
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.tracking.idleTrackerStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"

private class NoFrames : CaptureSource {
    override fun grab(): CaptureFrame? = CaptureFrame(1920, 1080, FloatArray(8), FrameWriter { 0L })

    override fun geometryNote(): String? = null
}

/**
 * D08a-4: the game session is driven by the SERVICE, not by a composable.
 *
 * The service is a foreground service so tracking survives the screen going off; a recorder driven
 * from composition would then stop exactly when the user put the phone down, leaving holes in a
 * session that claims to be a whole game. These tests pin the two lifetimes that follow from that:
 * the driver ignores UI teardown and a tracker restart, and ends with the service.
 */
class GameSessionDriverTest {
    @TempDir
    lateinit var dir: File

    private val events = MutableSharedFlow<TrackerEvent>(extraBufferCapacity = 8)
    private val status = MutableStateFlow<TrackerStatus?>(null)

    private fun controller(): GameSessionController {
        val capture =
            SessionCaptureController(
                source = NoFrames(),
                open = { null },
                gates = RecordingGates(),
                // The shipped default: recording OFF. Driving the session must not start writing.
                prefs = { RecordingPrefs() },
                existingBytes = { 0L },
            )
        return GameSessionController(GameStore(File(dir, "games")), capture, { 1_700_000_000_000L }, { "game-$it" })
    }

    private fun move(
        uci: String,
        san: String,
        fen: String,
    ) = TrackerEvent.MoveCommitted(uci, san, fen, "diff", false)

    @Test
    fun theServiceDrivesTheSessionWhileNoUiExists() =
        runTest {
            val service = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())
            val session = controller()
            attachGameSession(service, session, events, status) { "board-a" }
            GameSessionHost.publish(session)

            // A composition that observed the controller, and is then destroyed with the UI.
            val ui = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())
            var seen: GameSessionController? = null
            GameSessionHost.controller.onEach { seen = it }.launchIn(ui)
            status.value = idleTrackerStatus(STARTPOS)
            events.emit(move("e2e4", "e4", AFTER_E4))
            ui.cancel()

            events.emit(move("e7e5", "e5", AFTER_E5))

            assertEquals(session, seen, "the UI observes the service's controller instead of building one")
            assertEquals(2, session.state.value.moveCount, "a destroyed UI must not stop the running game")
            assertNull(session.state.value.recordingSessionId, "recording stays off by default")
            GameSessionHost.publish(null)
            service.cancel()
        }

    /**
     * A restart rebuilds the pipeline, the engine and their scope ([TrackerStack.scope]); the game
     * is not a config knob, so it is attached to the SERVICE scope and outlives the swap.
     */
    @Test
    fun aTrackerRestartDoesNotInterruptTheSession() =
        runTest {
            val service = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())
            val session = controller()
            attachGameSession(service, session, events, status) { "board-a" }
            status.value = idleTrackerStatus(STARTPOS)
            // Exactly what `TrackerStack` owns and `StackSwitch.restart` cancels.
            val stack = CoroutineScope(service.coroutineContext + SupervisorJob())
            var stackSaw = 0
            events.onEach { stackSaw += 1 }.launchIn(stack)

            events.emit(move("e2e4", "e4", AFTER_E4))
            stack.cancel()
            events.emit(move("e7e5", "e5", AFTER_E5))

            assertEquals(1, stackSaw, "the stack's own collector really is gone after the restart")
            assertEquals(2, session.state.value.moveCount, "the game survives the stack it was played on")
            service.cancel()
        }

    @Test
    fun theSessionEndsWithTheService() =
        runTest {
            val service = CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())
            val session = controller()
            attachGameSession(service, session, events, status) { "board-a" }
            status.value = idleTrackerStatus(STARTPOS)
            events.emit(move("e2e4", "e4", AFTER_E4))

            service.cancel()
            events.emit(move("e7e5", "e5", AFTER_E5))

            assertEquals(1, session.state.value.moveCount, "nothing may reach the controller after the service is gone")
            assertEquals(1, session.endAndSave()?.moveCount, "the service saves the game it was playing on destroy")
        }
}
