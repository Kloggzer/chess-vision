package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.geometry.ArucoCalibrator
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.CalibrationState
import com.chesslab.tracker.ui.calibration.CalibrationViewModel
import com.chesslab.tracker.ui.calibration.QuadOutline
import kotlinx.coroutines.CoroutineScope

/**
 * The board on the camera screen: an outline and a sentence. Nothing to press.
 *
 * There is no calibration MODE any more, no wizard behind it, and no confirmation. The screen marks
 * the board it can see so the phone can be aimed and says in one line what is stopping it if
 * anything is; the board is adopted on its own once all four codes are read. The rectified preview,
 * the orientation switch, the four outset steppers, the eight corner sliders, the four-tap fallback
 * and finally the save button are all gone.
 *
 * The reason they could all go is that **the saved quad is only a seed**: `LiveAlign` re-detects the
 * markers every third frame for the whole session, so nothing tuned here survives contact with a
 * game. Judging alignment was never the user's job — the app measures it continuously and better.
 * See `CalibrationViewModel` and `specs/36-alignment-that-just-works`.
 */
@Composable
fun rememberBoardModel(
    host: CalibrationHost,
    scope: CoroutineScope,
): CalibrationViewModel {
    val context = LocalContext.current
    val model =
        remember(host) {
            val store = calibrationStore(context)
            CalibrationViewModel(
                detector = ArucoCalibrator(host.latestCalibrationFrame, store::geometry),
                store = store,
                scope = scope,
            )
        }
    LaunchedEffect(model) { model.autoDetect() }
    return model
}

/**
 * Where the app believes the board is, drawn on the live picture.
 *
 * The only alignment feedback that survives, and the only kind that was ever actionable: you cannot
 * nudge a quad the tracker re-derives twice a second, but you CAN see that the outline is not on
 * the board, and move the phone.
 */
@Composable
fun BoardOutline(state: CalibrationState) {
    QuadOutline(state.corners, IntSize(state.frameWidth, state.frameHeight), Modifier.fillMaxSize())
}

/**
 * The one line that says what the camera can see.
 *
 * No button. The board is adopted automatically on a full four-code read (`CalibrationViewModel`),
 * because there was never a decision here for a person to make: the quad is a seed the live path
 * replaces, and the config it carries is measured, not chosen. What is left is the sentence, and
 * every branch of it ends in something the user can change by moving the phone.
 */
@Composable
fun BoardDeck(state: CalibrationState) {
    // The same scrim the look tiles wear. Over wood grain in room light, bare text on a live
    // viewfinder is the first thing to disappear.
    Column(
        Modifier.fillMaxWidth().background(BottomFade).padding(horizontal = 8.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(DECK_GAP.dp),
    ) {
        CameraNote(state.note)
    }
}

private const val DECK_GAP = 8
