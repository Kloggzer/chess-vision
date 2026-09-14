package com.chesslab.tracker.spectate

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.ui.tracking.FakeTrackerSession
import com.chesslab.tracker.ui.tracking.TrackerSession
import com.chesslab.tracker.ui.tracking.idleTrackerStatus
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private const val DEAD_FEN = "8/8/8/8/8/8/8/K6k w - - 0 1"

/**
 * The spectator's collector runs in a process-lifetime scope, so anything it holds is held for
 * good. The service's teardown publishes `null` — that emission is what has to end it.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class FollowTrackerSessionsTest {
    @Test
    fun theTeardownStopsTheCollectorOnTheDeadSession() =
        runTest {
            val dead = FakeTrackerSession()
            val sessions = MutableStateFlow<TrackerSession?>(dead)
            val seen = mutableListOf<String>()
            backgroundScope.launch { followTrackerSessions(sessions) { status -> status?.let { seen += it.fen } } }
            runCurrent()

            sessions.value = null
            runCurrent()
            dead.status.value = idleTrackerStatus(DEAD_FEN)
            runCurrent()

            assertEquals(
                listOf(STARTPOS),
                seen,
                "the dead session was still being collected after the service published its " +
                    "teardown, so its binder stays reachable for the life of the process",
            )
        }
}
