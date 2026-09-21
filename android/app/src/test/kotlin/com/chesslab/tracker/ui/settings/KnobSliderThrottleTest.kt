package com.chesslab.tracker.ui.settings

import android.app.Application
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeRight
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.tracking.ComponentActivityRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Ein Regler ohne Drossel schreibt je Compose-Bild, und jeder Wert ist ein DataStore-Schreiben
 *  UND ein `UpdateConfig` in der Aktions-Queue der Engine. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [ROBOLECTRIC_SDK], qualifiers = PHONE_PORTRAIT, application = Application::class)
class KnobSliderThrottleTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun oneDragCommitsOnceAndCommitsWhereItEnded() {
        val values = mutableListOf<Double>()
        val knob = KNOB_CATALOG.first { it.key == "censusThr" }
        compose.setContent {
            ChesslabTheme(dark = false) {
                KnobRow(knob, TrackerConfig(), restartPending = false, onValue = { values += it }, onReset = {})
            }
        }

        compose.onNodeWithTag(KNOB_SLIDER_TAG).performTouchInput { swipeRight() }
        compose.waitForIdle()

        assertEquals("eine Geste ist eine Entscheidung, nicht dreissig", 1, values.size)
        assertTrue("und sie steht dort, wo der Finger losliess", values.single() > TrackerConfig().censusThr)
    }
}

private const val ROBOLECTRIC_SDK = 35

private const val PHONE_PORTRAIT = "w411dp-h891dp-xhdpi"
