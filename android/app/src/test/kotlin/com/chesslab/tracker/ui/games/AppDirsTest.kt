package com.chesslab.tracker.ui.games

import android.app.Application
import com.chesslab.tracker.runtime.AppPaths
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.File

/** `AppPaths`' names under `filesDir`: the PC's `slice` reads them. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class AppDirsTest {
    @Test
    fun theContextHelpersAreAppPathsUnderFilesDir() {
        val context = RuntimeEnvironment.getApplication()
        val paths = AppPaths(context.filesDir)

        assertEquals(File(context.filesDir, "games"), gamesDir(context))
        assertEquals(File(context.filesDir, "sessions"), sessionsDir(context))
        assertEquals(paths.games, gamesDir(context))
        assertEquals(paths.sessions, sessionsDir(context))
    }
}
