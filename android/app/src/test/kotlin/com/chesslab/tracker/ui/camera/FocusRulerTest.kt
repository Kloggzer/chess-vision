package com.chesslab.tracker.ui.camera

import android.app.Application
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.tracking.ComponentActivityRule
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h914dp-port", application = Application::class)
class FocusRulerTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun externalFocusUpdatesNeverWriteRoundedValuesBack() {
        val value = mutableStateOf(0.76f)
        val writes = mutableListOf<Float>()
        compose.setContent {
            ChesslabTheme {
                FocusRuler("Focus", "focus", value.value, 0f..1f, 0.001f) { writes += it }
            }
        }
        compose.waitForIdle()
        listOf(1f, 1f - 1f / 12f, 1f - 2f / 12f, 0.76f).forEach { next ->
            compose.runOnIdle { value.value = next }
            compose.waitForIdle()
        }
        compose.runOnIdle { assertTrue("programmatic scrolling wrote $writes", writes.isEmpty()) }
        compose.onNode(hasScrollAction()).performTouchInput { swipeLeft() }
        compose.waitForIdle()
        compose.runOnIdle { assertTrue("a real gesture must still change focus", writes.isNotEmpty()) }
    }
}
