package com.chesslab.tracker.ui

import android.app.Application
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.theme.Touch
import com.chesslab.tracker.ui.tracking.ComponentActivityRule
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** In einem 220-dp-Fach haelt JEDES Aktions-Primitiv seine 48 dp; `TextAction` mass hier 40 (Material-Vorgabe). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [ROBOLECTRIC_SDK], qualifiers = PHONE_PORTRAIT, application = Application::class)
class ActionTouchTargetTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun everyActionPrimitiveKeepsTheTouchTargetInASqueezedColumn() {
        compose.setContent {
            ChesslabTheme(dark = false) {
                Column(Modifier.fillMaxWidth().heightIn(max = SQUEEZE)) {
                    FilledAction(FILLED, {})
                    OutlineAction(OUTLINE, {})
                    TextAction(TEXT, {})
                    DangerAction(DANGER, {})
                }
            }
        }
        listOf(FILLED, OUTLINE, TEXT, DANGER).forEach {
            compose.onNodeWithText(it).assertIsDisplayed()
            compose.onNodeWithText(it).assertHeightIsAtLeast(Touch.min)
        }
    }
}

private const val FILLED = "Filled"
private const val OUTLINE = "Outline"
private const val TEXT = "Text"
private const val DANGER = "Danger"

private val SQUEEZE = 220.dp

private const val ROBOLECTRIC_SDK = 35

private const val PHONE_PORTRAIT = "w411dp-h891dp-xhdpi"
