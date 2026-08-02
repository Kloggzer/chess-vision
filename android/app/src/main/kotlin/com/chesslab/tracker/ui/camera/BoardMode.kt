package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.geometry.ArucoCalibrator
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.calibrationStore
import com.chesslab.tracker.ui.calibration.CORNER_PROMPTS
import com.chesslab.tracker.ui.calibration.CalibrationHost
import com.chesslab.tracker.ui.calibration.CalibrationOverlay
import com.chesslab.tracker.ui.calibration.CalibrationState
import com.chesslab.tracker.ui.calibration.CalibrationStep
import com.chesslab.tracker.ui.calibration.CalibrationViewModel
import com.chesslab.tracker.ui.calibration.QuadOutline
import com.chesslab.tracker.ui.calibration.mapTapToSource
import kotlinx.coroutines.CoroutineScope

/**
 * The board's geometry, as a MODE of the camera screen rather than a screen of its own.
 *
 * It is the same instrument either way — you are looking at the picture and judging whether the
 * green quad sits on the board — so it is the same viewfinder, and only the overlay and the
 * controls change. See [CameraMode] for why the two are modes and not destinations.
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
 * What is drawn ON the picture in board mode.
 *
 * In [CalibrationStep.MANUAL] this is also where the taps are TAKEN, and that is the fix to a real
 * dead end: the tap surface used to be a sibling box below the preview whose only child was a
 * `Canvas` with nothing but `fillMaxWidth`, so it laid out zero pixels tall and could not be hit at
 * all. Even at the right height it was the wrong place — you cannot point at a corner you are not
 * looking at. Here the surface IS the picture, and because it sits inside the turned box the source
 * mapping stays a plain per-axis scale with no knowledge of the rotation.
 */
@Composable
fun BoardOverlay(
    state: CalibrationState,
    source: IntSize,
    onTap: (Float, Float, IntSize) -> Unit,
) {
    var rendered by remember { mutableStateOf(IntSize.Zero) }
    Box(
        Modifier
            .fillMaxSize()
            .onSizeChanged { rendered = it }
            .pointerInput(state.step, source) {
                if (state.step != CalibrationStep.MANUAL) return@pointerInput
                detectTapGestures { o -> onTap(o.x, o.y, rendered) }
            },
    ) {
        if (state.step == CalibrationStep.DETECTED) {
            CalibrationOverlay(state.corners, state.markerIds, state.whitePov, source, Modifier.fillMaxSize())
        } else {
            QuadOutline(state.corners, source, Modifier.fillMaxSize())
        }
    }
}

/** Maps a tap on the picture back to source pixels and hands it to the model. */
fun CalibrationViewModel.tapAt(
    x: Float,
    y: Float,
    rendered: IntSize,
    state: CalibrationState,
) {
    mapTapToSource(x, y, rendered.width, rendered.height, state.frameWidth, state.frameHeight)
        ?.let { setTaps(state.taps + it) }
}

/**
 * Board mode's controls, in the deck where the look tiles otherwise sit.
 *
 * One line of prose and at most three buttons: the deck is a strip, and everything that used to be
 * a full-width stack of explanations now lives on the picture or not at all.
 */
@Composable
fun BoardDeck(
    state: CalibrationState,
    model: CalibrationViewModel,
) {
    // The same scrim the look deck wears. Board mode had none, which put three outline-only buttons
    // and a line of grey text straight onto a moving picture — over a wooden board in room light an
    // outline is the one thing guaranteed to disappear.
    Column(
        Modifier.fillMaxWidth().background(BottomFade).padding(horizontal = 8.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(DECK_GAP.dp),
    ) {
        CameraNote(boardPrompt(state))
        when (state.step) {
            CalibrationStep.MANUAL ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DECK_GAP.dp)) {
                    DeckButton("Undo tap", Modifier.weight(1f), enabled = state.taps.isNotEmpty()) {
                        model.setTaps(state.taps.dropLast(1))
                    }
                    DeckButton("Start over", Modifier.weight(1f), enabled = state.taps.isNotEmpty()) {
                        model.setTaps(emptyList())
                    }
                    DeckButton("Check", Modifier.weight(1f), enabled = state.corners != null, onClick = model::toConfirm)
                }
            else ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DECK_GAP.dp)) {
                    DeckButton("Detect again", Modifier.weight(1f), enabled = !state.detecting, onClick = model::detectOnce)
                    DeckButton("Set corners", Modifier.weight(1f), onClick = model::beginManual)
                    DeckButton("Check", Modifier.weight(1f), enabled = state.corners != null, onClick = model::toConfirm)
                }
        }
    }
}

/** The one line that says what to do next — the step's own prompt, never a generic title. */
private fun boardPrompt(state: CalibrationState): String =
    when {
        state.step == CalibrationStep.MANUAL ->
            CORNER_PROMPTS.getOrElse(state.taps.size) { "4 corners set — check the orientation" }
        state.step == CalibrationStep.DETECTED -> "Board found. Check the a8 corner before saving."
        else -> state.note ?: "Point the camera at the whole board."
    }

/**
 * A deck button — FILLED, never outlined.
 *
 * Everything on this screen floats over a live viewfinder, and an outline is a one-pixel line
 * competing with wood grain and a chessboard. The tiles beside it already answer this with
 * [ChromeScrim]; the buttons had `OutlinedButton` and vanished against the picture.
 */
@Composable
private fun DeckButton(
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = DECK_BUTTON.dp),
        shape = RoundedCornerShape(DECK_CORNER.dp),
        colors =
            ButtonDefaults.buttonColors(
                containerColor = ChromeScrim,
                contentColor = Chrome.accent,
                disabledContainerColor = ChromeScrim,
                disabledContentColor = Chrome.onSurfaceMuted,
            ),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, maxLines = 1)
    }
}

/** Saving is the model's, but the profile has to reach the service too — one call site for both. */
fun CalibrationViewModel.saveAnd(
    host: CalibrationHost,
    then: () -> Unit,
) {
    save { profile: CalibrationProfile ->
        host.onCalibrated(profile.geometry(), profile.corners, profile.name)
        then()
    }
}

private const val DECK_GAP = 8
private const val DECK_BUTTON = 46
private const val DECK_CORNER = 12
