package com.chesslab.tracker.ui.analysis

import android.app.Application
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.tracking.ComponentActivityRule
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Ohne Bewertung bleibt die Flaeche LEER: 50 % waeren die haeufigste Luege, die sie erzaehlen kann. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h914dp-port", application = Application::class)
class EvalFillEmptyTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun anUnscoredPositionDrawsNoWhiteAtAll() {
        val win = mutableStateOf<Double?>(null)
        compose.setContent { ChesslabTheme { EvalFill(win.value, paused = false) } }
        compose.waitForIdle()

        compose.onNodeWithTag(EVAL_WHITE_TAG).assertDoesNotExist()

        compose.runOnIdle { win.value = 62.0 }
        compose.waitForIdle()
        compose.onNodeWithTag(EVAL_WHITE_TAG).assertIsDisplayed()
    }
}
