package com.chesslab.tracker.ui

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

/**
 * The cold start from the notification: `MainActivity.onCreate` requests BEFORE `setContent`, so
 * nothing is subscribed when the request is made.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class OpenTrackerTest {
    @Test
    fun aRequestMadeBeforeTheNavHostCollectsSurvivesUntilItDoes() =
        runTest {
            OpenTracker.request()

            val arrived = withTimeoutOrNull(WAIT_MS) { OpenTracker.flow.first() }

            assertNotNull(
                arrived,
                "the notification's request was dropped: nothing was subscribed when it was made, " +
                    "so a cold start out of the notification lands on Home instead of the tracker",
            )
        }

    private companion object {
        const val WAIT_MS = 1_000L
    }
}
