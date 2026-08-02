package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
 * The board on the camera screen: an outline, a sentence, and one button.
 *
 * There is no calibration MODE any more and no wizard behind it. The screen marks the board it can
 * see so the phone can be aimed, says in one line what is stopping it if anything is, and offers to
 * adopt what it found. The rectified preview, the orientation switch, the four outset steppers, the
 * eight corner sliders and the four-tap fallback are all gone.
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
 * The sentence and the button.
 *
 * The button carries no verdict and no gate. There is nothing transient to protect — the quad it
 * writes is a seed the live path replaces within a few frames — so refusing it on a measurement
 * could only block a user whose board is fine, which is what the proposed alignment gate would have
 * done on roughly half of the rig's own frames (`specs/36/STATUS.md`).
 */
@Composable
fun BoardDeck(
    state: CalibrationState,
    onUse: () -> Unit,
) {
    // The same scrim the look tiles wear. Everything here floats over a live viewfinder, and over
    // wood grain in room light an outline or bare text is the first thing to disappear.
    Column(
        Modifier.fillMaxWidth().background(BottomFade).padding(horizontal = 8.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(DECK_GAP.dp),
    ) {
        CameraNote(state.note)
        if (state.found) {
            Button(
                onClick = onUse,
                modifier = Modifier.fillMaxWidth().heightIn(min = DECK_BUTTON.dp),
                shape = RoundedCornerShape(DECK_CORNER.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ChromeScrim, contentColor = Chrome.accent),
            ) {
                Text(
                    if (state.saved) "Board in use" else "Use this board",
                    style = MaterialTheme.typography.labelLarge,
                    maxLines = 1,
                )
            }
        }
    }
}

private const val DECK_GAP = 8
private const val DECK_BUTTON = 46
private const val DECK_CORNER = 12
