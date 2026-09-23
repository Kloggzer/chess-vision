package com.chesslab.tracker.ui.tracking

import android.app.Application
import android.content.ComponentName
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.ComposeContentTestRule
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.ChesslabTheme
import com.chesslab.tracker.ui.theme.Touch
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** Twice a `Column` measured the prose before the buttons and left them 1-2 mm tall; only a measured height
 *  tells "capping the prose" from "preferring the buttons". */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [ROBOLECTRIC_SDK], qualifiers = PHONE_PORTRAIT, application = Application::class)
class AlarmCardLayoutTest {
    @get:Rule(order = 0)
    val activity = ComponentActivityRule()

    @get:Rule(order = 1)
    val compose = createComposeRule()

    @Test
    fun everyActionKeepsTheTouchTargetInASqueezedCard() {
        compose.showSqueezed(SQUEEZE)
        compose.assertActionsAreTouchable()
    }

    /** A cap tuned to one height is a coincidence; the prose has to give way at every squeeze. */
    @Test
    fun everyActionKeepsTheTouchTargetAllTheWayDownTheLadder() {
        val cap = compose.showSqueezed(LADDER.first())
        LADDER.forEach { height ->
            compose.runOnIdle { cap.value = height }
            compose.assertActionsAreTouchable()
        }
    }

    @Test
    fun anIllegalMoveIsPhrasedRatherThanShouted() {
        compose.show(ALARM_ILLEGAL)
        compose.assertPhrased(ALARM_ILLEGAL.kind, "the board and the app disagree")
    }

    @Test
    fun aRefusedMoveIsPhrasedRatherThanShouted() {
        compose.show(ALARM_REFUSED)
        compose.assertPhrased(ALARM_REFUSED.kind, "the app was handed a move it cannot play")
    }
}

/** `createComposeRule()` needs `ComponentActivity`, which only the debug-only `ui-test-manifest` declares:
 *  registering it here keeps the gate running in all three variants. */
class ComponentActivityRule : ExternalResource() {
    override fun before() {
        val context = RuntimeEnvironment.getApplication()
        shadowOf(context.packageManager)
            .addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
    }
}

private val ALARM_ILLEGAL =
    AlarmUi(
        kind = "illegal_move",
        conflicts = listOf("a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8", "a2", "b3"),
        guessSan = "Nf3",
    )

private val ALARM_REFUSED = ALARM_ILLEGAL.copy(kind = "illegal_move_refused")

/** A four-ply recovery: the longest label the take-back button ever carries. */
private val BRIDGE = listOf("Bxb5", "Kb8", "Bd4", "Nf3")

private val ACTIONS = listOf("Accept CNN position", "Take back ${BRIDGE.size} moves", "New baseline")

/** Roughly what is left under the board on a phone in portrait. */
private val SQUEEZE = 220.dp

private val LADDER = listOf(220.dp, 200.dp, 180.dp, 160.dp)

private const val ROBOLECTRIC_SDK = 35

private const val PHONE_PORTRAIT = "w411dp-h891dp-xhdpi"

private fun ComposeContentTestRule.assertActionsAreTouchable() {
    ACTIONS.forEach { onNodeWithText(it).assertHeightIsAtLeast(Touch.min) }
}

private fun ComposeContentTestRule.show(alarm: AlarmUi) {
    setContent { ChesslabTheme(dark = false) { AlarmCard(alarm, {}, {}, {}) } }
}

private fun ComposeContentTestRule.showSqueezed(initial: Dp): MutableState<Dp> {
    val cap = mutableStateOf(initial)
    setContent {
        ChesslabTheme(dark = false) {
            Column(Modifier.fillMaxWidth().heightIn(max = cap.value)) {
                AlarmCard(ALARM_ILLEGAL, {}, {}, {}, lastCommit = BRIDGE)
            }
        }
    }
    return cap
}

/** The raw latch name reads as an accusation; every kind needs a sentence. */
private fun ComposeContentTestRule.assertPhrased(
    kind: String,
    tail: String,
) {
    onNodeWithText(tail, substring = true).assertIsDisplayed()
    onNodeWithText(kind.replace('_', ' ').uppercase()).assertDoesNotExist()
}
