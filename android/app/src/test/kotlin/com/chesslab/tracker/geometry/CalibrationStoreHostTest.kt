package com.chesslab.tracker.geometry

import android.app.Application
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class CalibrationStoreHostTest {
    @Test
    fun everyCallerGetsTheSameStore() {
        val app = RuntimeEnvironment.getApplication()
        assertSame(CalibrationStoreHost.of(app), CalibrationStoreHost.of(app.applicationContext))
    }
}
