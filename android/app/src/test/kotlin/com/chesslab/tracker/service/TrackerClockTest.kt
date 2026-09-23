package com.chesslab.tracker.service

import android.app.Application
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowSystemClock
import java.time.Duration

/** Not `System.currentTimeMillis`: a time sync moves it, and every age in the engine with it. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class TrackerClockTest {
    @Test
    fun theEnginesClockIsNotTheWallClock() {
        assertTrue(
            "the engine's clock reads like epoch milliseconds — a clock change would move every deadline",
            System.currentTimeMillis() - phoneEngineClock() > NOT_EPOCH_MS,
        )
    }

    @Test
    fun theEnginesClockOnlyEverMovesForward() {
        val before = phoneEngineClock()
        ShadowSystemClock.advanceBy(Duration.ofMillis(STEP_MS))
        assertTrue("the engine's clock stood still across an advance", phoneEngineClock() - before >= STEP_MS)
    }

    private companion object {
        const val NOT_EPOCH_MS = 365L * 24 * 60 * 60 * 1000
        const val STEP_MS = 250L
    }
}
