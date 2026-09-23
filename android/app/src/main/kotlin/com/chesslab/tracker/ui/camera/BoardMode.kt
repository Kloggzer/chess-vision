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
import com.chesslab.tracker.geometry.CalibrationStoreHost
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.CalibrationState
import com.chesslab.tracker.ui.calibration.CalibrationViewModel
import com.chesslab.tracker.ui.calibration.QuadOutline
import com.chesslab.tracker.ui.theme.Space
import kotlinx.coroutines.CoroutineScope

/** An outline and a sentence, nothing to press: the saved quad is only a seed `LiveAlign` replaces, so
 *  judging alignment was never the user's job (`CalibrationViewModel`). */
@Composable
fun rememberBoardModel(
    host: CalibrationHost,
    scope: CoroutineScope,
    stopAfterSaved: Boolean = false,
): CalibrationViewModel {
    val context = LocalContext.current
    val model =
        remember(host) {
            val store = CalibrationStoreHost.of(context)
            CalibrationViewModel(
                detector = ArucoCalibrator(host.latestCalibrationFrame, store::geometry),
                store = store,
                scope = scope,
            )
        }
    LaunchedEffect(model, stopAfterSaved) { model.autoDetect(stopAfterSaved) }
    return model
}

/** You cannot nudge a quad re-derived twice a second, but you CAN see it is not on the board and move the phone. */
@Composable
fun BoardOutline(state: CalibrationState) {
    QuadOutline(state.corners, IntSize(state.frameWidth, state.frameHeight), Modifier.fillMaxSize())
}

@Composable
fun BoardDeck(state: CalibrationState) {
    // Over wood grain in room light, bare text on a live viewfinder disappears first.
    Column(
        Modifier.fillMaxWidth().background(BottomFade).padding(horizontal = Space.sm, vertical = Space.md),
        verticalArrangement = Arrangement.spacedBy(DECK_GAP.dp),
    ) {
        CameraNote(state.note)
    }
}

private const val DECK_GAP = 8
