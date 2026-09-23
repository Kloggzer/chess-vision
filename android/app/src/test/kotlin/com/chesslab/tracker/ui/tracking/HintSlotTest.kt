package com.chesslab.tracker.ui.tracking

import android.app.Application
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.ComposeContentTestRule
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import com.chesslab.tracker.hints.HintController
import com.chesslab.tracker.hints.HintPlan
import com.chesslab.tracker.hints.HintSide
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.theme.Touch
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Der Knopf gehoert genau einer Seite — sonst waere die Hilfe kein Handicap, sondern beidseitig. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [HINT_SDK], qualifiers = HINT_PORTRAIT, application = Application::class)
class HintSlotTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun theSupportedSideGetsAButtonOnItsOwnMove() {
        compose.slot(HintPlan(HintSide.BLACK), BLACK_TO_MOVE)
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertIsDisplayed()
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertHeightIsAtLeast(Touch.min)
    }

    @Test
    fun theUnsupportedSideGetsNoButtonAtAll() {
        compose.slot(HintPlan(HintSide.BLACK), WHITE_TO_MOVE)
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertDoesNotExist()
    }

    @Test
    fun aGameWithoutHelpNeverShowsTheButton() {
        compose.slot(HintPlan(side = null), BLACK_TO_MOVE)
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertDoesNotExist()
    }

    @Test
    fun aLatchedAlarmTakesTheButtonAway() {
        compose.slot(HintPlan(HintSide.BLACK), BLACK_TO_MOVE, alarmed = true)
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertDoesNotExist()
    }

    @Test
    fun anExhaustedQuotaTakesTheButtonAway() {
        compose.slot(HintPlan(HintSide.BLACK, quota = 0), BLACK_TO_MOVE)
        compose.onNodeWithContentDescription(HINT_BUTTON_DESCRIPTION).assertDoesNotExist()
    }
}

private const val HINT_SDK = 35

private const val HINT_PORTRAIT = "w411dp-h891dp-xhdpi"

private const val BLACK_TO_MOVE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"

private const val WHITE_TO_MOVE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private fun ComposeContentTestRule.slot(
    plan: HintPlan,
    fen: String,
    alarmed: Boolean = false,
) {
    val controller = HintController().apply { startGame(plan) }
    setContent { ChesslabTheme(dark = false) { HintSlot(controller, fen, alarmed, running = true, onHint = {}) } }
}
